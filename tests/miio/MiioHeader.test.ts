import { describe, expect, it } from "vitest";

import createMiioHeader from "../../miio/MiioHeader.js";

describe("createMiioHeader", () => {
    it("creates a 32-byte header with default values", () => {
        const header = createMiioHeader();

        expect(header.length).toBe(32);
        expect(header[0]).toBe(0x21);
        expect(header[1]).toBe(0x31);
        expect(header.readUInt16BE(2)).toBe(32);
        expect(header.readUInt32BE(4)).toBe(0xffffffff);
        expect(header.readUInt32BE(8)).toBe(0xffffffff);
        expect(header.readUInt32BE(12)).toBe(0xffffffff);
    });

    it("applies custom options", () => {
        const header = createMiioHeader({
            timestamp: 12345,
            deviceId: 67890,
            payloadLength: 10,
            unknown: 42
        });

        expect(header.readUInt16BE(2)).toBe(42);
        expect(header.readUInt32BE(4)).toBe(42);
        expect(header.readUInt32BE(8)).toBe(67890);
        expect(header.readUInt32BE(12)).toBe(12345);
    });
});
