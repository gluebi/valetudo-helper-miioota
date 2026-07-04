import { EventEmitter } from "node:events";

import { afterEach, describe, expect, it, vi } from "vitest";

import MiioErrorResponseError from "../../miio/MiioErrorResponseError.js";
import MiioSocket from "../../miio/MiioSocket.js";
import MiioTimeoutError from "../../miio/MiioTimeoutError.js";

const RINFO = { address: "192.168.1.1", port: 54321, family: "IPv4" as const, size: 0 };
const TOKEN = Buffer.from("0123456789abcdef0123456789abcdef", "hex");

function createMockSocket(): EventEmitter & {
    send: ReturnType<typeof vi.fn>;
    disconnect: ReturnType<typeof vi.fn>;
    close: ReturnType<typeof vi.fn>;
    } {
    return Object.assign(new EventEmitter(), {
        send: vi.fn(),
        disconnect: vi.fn(),
        close: vi.fn((cb?: () => void) => {
            cb?.();
        })
    });
}

describe("MiioSocket", () => {
    afterEach(() => {
        vi.useRealTimers();
    });

    it("calculateMsgId returns value under MAX_INT32", () => {
        const id = MiioSocket.calculateMsgId(new Date("2022-01-01T00:00:00Z"));
        expect(id).toBeGreaterThan(0);
        expect(id).toBeLessThan(0x7fffffff);
    });

    it("resolves sendMessage when matching response arrives", async () => {
        const socket = createMockSocket();
        const miio = new MiioSocket({
            socket: socket as never,
            token: TOKEN,
            deviceId: 99,
            rinfo: RINFO,
            name: "test",
            timeout: 5000
        });

        const promise = miio.sendMessage({ method: "get_status", params: [] });
        const sentPacket = socket.send.mock.calls[0][0] as Buffer;
        const outgoing = miio.codec.decodeIncomingMiioPacket(sentPacket);
        const responsePacket = miio.codec.encodeOutgoingMiioPacket({
            id: outgoing.msg?.id,
            result: ["ok"]
        }, 99);

        socket.emit("message", responsePacket, RINFO);

        await expect(promise).resolves.toEqual(["ok"]);
    });

    it("rejects with MiioErrorResponseError on error response", async () => {
        const socket = createMockSocket();
        const miio = new MiioSocket({
            socket: socket as never,
            token: TOKEN,
            deviceId: 99,
            rinfo: RINFO,
            name: "test",
            timeout: 5000
        });

        const promise = miio.sendMessage({ method: "get_status", params: [] });
        const sentPacket = socket.send.mock.calls[0][0] as Buffer;
        const outgoing = miio.codec.decodeIncomingMiioPacket(sentPacket);
        const errPacket = miio.codec.encodeOutgoingMiioPacket({
            id: outgoing.msg?.id,
            error: { code: -1, message: "fail" }
        }, 99);

        socket.emit("message", errPacket, RINFO);

        await expect(promise).rejects.toBeInstanceOf(MiioErrorResponseError);
    });

    it("rejects with MiioTimeoutError on timeout", async () => {
        vi.useFakeTimers();
        const socket = createMockSocket();
        const miio = new MiioSocket({
            socket: socket as never,
            token: TOKEN,
            deviceId: 99,
            rinfo: RINFO,
            name: "test",
            timeout: 100
        });

        const promise = miio.sendMessage({ method: "get_status", params: [] }, { timeout: 100 });
        vi.advanceTimersByTime(150);

        await expect(promise).rejects.toBeInstanceOf(MiioTimeoutError);
    });

    it("shutdown closes socket", async () => {
        const socket = createMockSocket();
        const miio = new MiioSocket({
            socket: socket as never,
            token: TOKEN,
            rinfo: RINFO,
            name: "test"
        });

        await miio.shutdown();
        expect(socket.close).toHaveBeenCalled();
    });
});
