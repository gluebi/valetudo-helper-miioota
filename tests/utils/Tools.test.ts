import os from "node:os";

import { describe, expect, it, vi } from "vitest";

import Tools from "../../utils/Tools.js";

describe("Tools", () => {
    it("CONVERT_BYTES_TO_HUMANS formats sizes", () => {
        expect(Tools.CONVERT_BYTES_TO_HUMANS(512)).toBe("512 bytes");
        expect(Tools.CONVERT_BYTES_TO_HUMANS(2048)).toBe("2.00 KiB");
        expect(Tools.CONVERT_BYTES_TO_HUMANS(2 * 1024 * 1024)).toBe("2.00 MiB");
        expect(Tools.CONVERT_BYTES_TO_HUMANS(2 * 1024 * 1024 * 1024)).toBe("2.00 GiB");
    });

    it("GET_VERSION reads package.json version", () => {
        expect(Tools.GET_VERSION()).toMatch(/\d+\.\d+\.\d+/);
    });

    it("GET_COMMIT_ID returns a string", () => {
        const commitId = Tools.GET_COMMIT_ID();
        expect(typeof commitId).toBe("string");
        expect(commitId.length).toBeGreaterThan(0);
    });

    it("GET_CURRENT_HOST_IPV4_ADDRESSES filters IPv4", () => {
        vi.spyOn(os, "networkInterfaces").mockReturnValue({
            lo0: [
                { address: "127.0.0.1", netmask: "255.0.0.0", family: "IPv4", mac: "00:11:22:33:44:55", internal: true, cidr: "127.0.0.0/8" },
                { address: "::1", netmask: "ffff:ffff:ffff:ffff:ffff:ffff:ffff:ffff", family: "IPv6", mac: "00:11:22:33:44:55", internal: true, cidr: "::1/128" }
            ]
        });

        expect(Tools.GET_CURRENT_HOST_IPV4_ADDRESSES()).toEqual(["127.0.0.1"]);
    });

    it("ARE_SAME_FILES returns true for identical paths", () => {
        expect(Tools.ARE_SAME_FILES("/tmp/a", "/tmp/a")).toBe(true);
    });
});
