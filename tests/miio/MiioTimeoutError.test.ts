import { describe, expect, it } from "vitest";

import MiioTimeoutError from "../../miio/MiioTimeoutError.js";

describe("MiioTimeoutError", () => {
    it("sets name and msg", () => {
        const msg = { id: 1, method: "get_status" };
        const err = new MiioTimeoutError(msg);

        expect(err.name).toBe("MiioTimeoutError");
        expect(err.msg).toBe(msg);
        expect(err.message).toContain("get_status");
    });
});
