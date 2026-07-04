import { describe, expect, it } from "vitest";

import Codec from "../../miio/Codec.js";

const TEST_TOKEN = Buffer.from("0123456789abcdef0123456789abcdef", "hex");

describe("Codec", () => {
    it("round-trips encode and decode", () => {
        const codec = new Codec({ token: TEST_TOKEN });
        const payload = { id: 1, method: "get_status", params: [] };
        const packet = codec.encodeOutgoingMiioPacket(payload, 123456);

        const decoded = codec.decodeIncomingMiioPacket(packet);

        expect(decoded.deviceId).toBe(123456);
        expect(decoded.msg).toEqual(payload);
    });

    it("decodes empty handshake packet and extracts token", () => {
        const codec = new Codec({ token: Buffer.from("ffffffffffffffffffffffffffffffff", "hex") });
        const header = Buffer.alloc(32, 0xff);
        header[0] = 0x21;
        header[1] = 0x31;
        header.writeUInt16BE(32, 2);
        TEST_TOKEN.copy(header, 16);

        const decoded = codec.decodeIncomingMiioPacket(header);

        expect(decoded.msg).toBeNull();
        expect(decoded.token?.equals(TEST_TOKEN)).toBe(true);
    });

    it("decode empty encrypted packet returns null msg", () => {
        const codec = new Codec({ token: TEST_TOKEN });
        const packet = codec.encodeOutgoingMiioPacket(null, 1);
        const decoded = codec.decodeIncomingMiioPacket(packet);

        expect(decoded.msg).toBeNull();
    });
});
