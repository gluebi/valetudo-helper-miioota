import crypto from "node:crypto";

import Logger from "../Logger.js";
import createMiioHeader from "./MiioHeader.js";
import Stamp from "./Stamp.js";
import type { DecodedMiioPacket, MiioMessage } from "./types.js";

interface CodecOptions {
    token: Buffer;
}

export default class Codec {
    token: Buffer;
    tokenKey: Buffer;
    tokenIV: Buffer;
    stamp: Stamp;

    constructor(options: CodecOptions) {
        this.token = options.token;
        this.tokenKey = Buffer.alloc(0);
        this.tokenIV = Buffer.alloc(0);
        this.stamp = new Stamp({});
        this.setToken(options.token);
    }

    setToken(token: Buffer): void {
        this.token = token;
        this.tokenKey = crypto.createHash("md5").update(this.token).digest();
        this.tokenIV = crypto.createHash("md5").update(this.tokenKey).update(this.token).digest();
    }

    updateStamp(val: number): void {
        this.stamp = new Stamp({ val }).orNew();
    }

    decodeIncomingMiioPacket(rawPacket: Buffer): DecodedMiioPacket {
        const header = Buffer.alloc(32);
        rawPacket.copy(header, 0, 0, 32);

        const encryptedPayload = rawPacket.slice(32);
        const stamp = header.readUInt32BE(12);

        const calculatedChecksum = crypto.createHash("md5")
            .update(header.slice(0, 16))
            .update(this.token)
            .update(encryptedPayload)
            .digest();

        const checksumFromHeader = header.slice(16);
        let token: Buffer | null = null;
        let msg: MiioMessage | null = null;

        if (checksumFromHeader.equals(calculatedChecksum)) {
            if (encryptedPayload.length > 0) {
                const decipher = crypto.createDecipheriv("aes-128-cbc", this.tokenKey, this.tokenIV);
                let decryptedPayload: Buffer | null = null;

                try {
                    decryptedPayload = Buffer.concat([decipher.update(encryptedPayload), decipher.final()]);

                    if (decryptedPayload[decryptedPayload.length - 1] === 0) {
                        decryptedPayload = decryptedPayload.slice(0, decryptedPayload.length - 1);
                    }

                    msg = JSON.parse(decryptedPayload.toString()) as MiioMessage;
                } catch (e) {
                    Logger.error("Error decrypting/parsing: ", e, msg, decryptedPayload);
                }
            }
        } else if (encryptedPayload.length > 0) {
            Logger.error("Invalid checksum:", {
                checksumFromHeader,
                calculatedChecksum,
                packet: rawPacket,
                token: this.token
            });
        } else {
            token = Buffer.from(header.slice(16));

            if (
                token.toString("hex") !== "ffffffffffffffffffffffffffffffff" &&
                token.toString("hex") !== "00000000000000000000000000000000" &&
                !this.token.equals(token)
            ) {
                Logger.trace("Got token from handshake:", token.toString("hex"));
                this.setToken(token);
            }
        }

        return {
            stamp,
            deviceId: header.readUInt32BE(8),
            msg,
            token
        };
    }

    encodeOutgoingMiioPacket(payload: MiioMessage | null, deviceId: number | undefined): Buffer {
        const stamp = this.stamp.orNew();
        let encryptedPayload: Buffer;

        if (payload !== null) {
            const cipher = crypto.createCipheriv("aes-128-cbc", this.tokenKey, this.tokenIV);
            const payloadBuf = Buffer.from(JSON.stringify(payload), "utf8");

            encryptedPayload = Buffer.concat([
                cipher.update(payloadBuf),
                cipher.final()
            ]);
        } else {
            encryptedPayload = Buffer.alloc(0);
        }

        const secondsPassed = Math.max(0, Math.floor((Date.now() - stamp.time) / 1000));

        const header = createMiioHeader({
            timestamp: (stamp.val ?? 0) + secondsPassed,
            deviceId,
            payloadLength: encryptedPayload.length,
            unknown: 0
        });

        const calculatedChecksum = crypto.createHash("md5")
            .update(header.slice(0, 16))
            .update(this.token)
            .update(encryptedPayload)
            .digest();

        calculatedChecksum.copy(header, 16);

        return Buffer.concat([header, encryptedPayload]);
    }
}
