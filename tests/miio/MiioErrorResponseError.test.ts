import { describe, expect, it } from "vitest";

import MiioErrorResponseError from "../../miio/MiioErrorResponseError.js";

describe("MiioErrorResponseError", () => {
    it("sets name and response", () => {
        const response = { code: -1, message: "failed" };
        const err = new MiioErrorResponseError("failed", response);

        expect(err.name).toBe("MiioErrorResponseError");
        expect(err.message).toBe("failed");
        expect(err.response).toBe(response);
    });
});
