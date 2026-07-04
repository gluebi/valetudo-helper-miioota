import type { RemoteInfo } from "node:dgram";

import Logger from "../Logger.js";
import Codec from "./Codec.js";
import MiioErrorResponseError from "./MiioErrorResponseError.js";
import createMiioHeader from "./MiioHeader.js";
import MiioTimeoutError from "./MiioTimeoutError.js";
import type {
    DecodedMiioPacket,
    MiioMessage,
    MiioSocketOptions,
    PendingRequests,
    SendMessageOptions
} from "./types.js";

const FEB_1970_UNIXTIME_MS = new Date("1970-02-01T00:00:00.000Z").getTime();
const MAX_INT32 = 0x7fffffff;

export default class MiioSocket {
    static PORT = 54321;

    codec: Codec;
    deviceId: number | undefined;
    socket: MiioSocketOptions["socket"];
    rinfo: RemoteInfo | undefined;
    timeout: number;
    name: string;
    nextId: number;
    pendingRequests: PendingRequests;
    onIncomingRequestMessage: MiioSocketOptions["onIncomingRequestMessage"];
    onConnected: MiioSocketOptions["onConnected"];
    connected: boolean;
    isCloudSocket: boolean | undefined;
    onEmptyPacket: ((packet: DecodedMiioPacket) => void) | null;

    constructor(options: MiioSocketOptions) {
        this.codec = new Codec({ token: options.token });
        this.deviceId = options.deviceId;
        this.socket = options.socket;
        this.rinfo = options.rinfo;
        this.timeout = options.timeout ?? 500;
        this.name = options.name;
        this.nextId = 1;
        this.pendingRequests = {};
        this.onIncomingRequestMessage = options.onIncomingRequestMessage;
        this.onConnected = options.onConnected;
        this.connected = false;
        this.isCloudSocket = options.isCloudSocket;
        this.onEmptyPacket = null;

        this.socket.on("message", (incomingMsg, rinfo) => {
            this.rinfo = rinfo;
            const decodedIncomingPacket = this.codec.decodeIncomingMiioPacket(incomingMsg);

            this.deviceId = decodedIncomingPacket.deviceId;
            const msg = decodedIncomingPacket.msg;

            Logger.debug(`<<< ${this.name}${msg ? ":" : "*"}`, msg ?? { stamp: decodedIncomingPacket.stamp });

            if (msg === null) {
                if (this.isCloudSocket) {
                    if (decodedIncomingPacket.stamp === 0) {
                        const response = createMiioHeader({ timestamp: new Date().getTime() / 1000 });
                        Logger.debug(">>> Responding to time sync request");

                        if (this.rinfo) {
                            this.socket.send(response, 0, response.length, this.rinfo.port, this.rinfo.address);
                        }
                    } else if (
                        this.codec.stamp.val === undefined ||
                        (this.codec.stamp.val ?? 0) < decodedIncomingPacket.stamp
                    ) {
                        this.codec.updateStamp(decodedIncomingPacket.stamp);
                        Logger.debug(">>> " + this.name + "*", { stamp: decodedIncomingPacket.stamp });

                        if (this.rinfo) {
                            this.socket.send(incomingMsg, 0, incomingMsg.length, this.rinfo.port, this.rinfo.address);
                        }
                    }
                } else {
                    this.codec.updateStamp(decodedIncomingPacket.stamp);

                    if (typeof this.onEmptyPacket === "function") {
                        this.onEmptyPacket(decodedIncomingPacket);
                    }
                }
            } else {
                this.codec.updateStamp(decodedIncomingPacket.stamp);

                if (msg.id !== undefined && (msg.result !== undefined || msg.error !== undefined)) {
                    const pendingRequestWithMatchingMsgId = this.pendingRequests[msg.id];

                    if (pendingRequestWithMatchingMsgId) {
                        clearTimeout(pendingRequestWithMatchingMsgId.timeout_id);

                        if (msg.error !== undefined) {
                            if (msg.error.message !== "user ack timeout") {
                                Logger.info("Miio error response", msg);
                            } else {
                                Logger.trace("Miio error response", msg);
                            }

                            pendingRequestWithMatchingMsgId.reject(
                                new MiioErrorResponseError(msg.error.message, msg.error)
                            );
                        } else {
                            pendingRequestWithMatchingMsgId.resolve(msg.result);
                        }

                        delete this.pendingRequests[msg.id];
                    } else {
                        Logger.debug("<< " + this.name + ": ignoring response for non-pending request", msg);
                    }
                } else if (msg.error) {
                    Logger.warn("unhandled error response", msg);
                } else if (typeof this.onIncomingRequestMessage === "function") {
                    this.onIncomingRequestMessage(msg);
                }
            }

            if (!this.connected && typeof this.onConnected === "function") {
                this.connected = true;
                this.onConnected();
            }
        });
    }

    sendMessage(msg: MiioMessage | null, options: SendMessageOptions = {}): Promise<unknown> {
        return new Promise((resolve, reject) => {
            if (msg !== null && msg !== undefined && !msg.id) {
                if (this.isCloudSocket) {
                    if (this.nextId > MAX_INT32) {
                        this.nextId = 1;
                    }

                    msg.id = this.nextId++;
                } else {
                    msg.id = MiioSocket.calculateMsgId(new Date());
                }
            }

            if (msg !== null && msg !== undefined && !msg.result && !msg.error && msg.id !== undefined) {
                const msgId = msg.id;

                this.pendingRequests[msgId] = {
                    resolve,
                    reject,
                    method: msg.method ?? "",
                    onTimeoutCallback: () => {
                        Logger.debug(`${this.name} request ${msgId} ${msg.method} timed out`);
                        delete this.pendingRequests[msgId];

                        if (this.isCloudSocket && this.connected === true) {
                            Logger.info("Cloud message timed out. Assuming that we're not connected anymore");
                            this.connected = false;
                        }

                        reject(new MiioTimeoutError(msg));
                    }
                };

                this.pendingRequests[msgId].timeout_id = setTimeout(
                    () => {
                        this.pendingRequests[msgId].onTimeoutCallback();
                    },
                    options.timeout ?? this.timeout
                );
            }

            const packet = this.codec.encodeOutgoingMiioPacket(msg, this.deviceId);

            Logger.debug(">>> " + this.name + ":", msg);

            if (this.rinfo) {
                this.socket.send(packet, 0, packet.length, this.rinfo.port, this.rinfo.address);
            }
        });
    }

    sendPing(): void {
        void this.sendMessage(null);
    }

    shutdown(): Promise<void> {
        return new Promise((resolve) => {
            Logger.debug(this.name, "socket shutdown in progress...");

            try {
                this.socket.disconnect();
            } catch {
                // no connection is open
            }

            this.socket.close(() => {
                Logger.debug(this.name, "socket shutdown done");
                resolve();
            });
        });
    }

    static calculateMsgId(date: Date): number {
        const now = date.getTime();

        if (now > FEB_1970_UNIXTIME_MS) {
            const id = Math.round(now / 10);
            const offset = 24 * 60 * 60;

            return offset + (id % (MAX_INT32 - offset));
        }

        return Math.round(now / 1000);
    }
}
