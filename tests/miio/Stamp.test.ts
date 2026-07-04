import { afterEach, describe, expect, it, vi } from "vitest";

import Stamp from "../../miio/Stamp.js";

describe("Stamp", () => {
    afterEach(() => {
        vi.useRealTimers();
    });

    it("is invalid without val", () => {
        const stamp = new Stamp({});
        expect(stamp.isValid()).toBe(false);
    });

    it("is valid with recent val", () => {
        const stamp = new Stamp({ val: 1000 });
        expect(stamp.isValid()).toBe(true);
    });

    it("expires after 120 seconds", () => {
        vi.useFakeTimers();
        const stamp = new Stamp({ val: 1000 });
        vi.advanceTimersByTime(121000);
        expect(stamp.isValid()).toBe(false);
    });

    it("orNew returns self when valid", () => {
        const stamp = new Stamp({ val: 1000 });
        expect(stamp.orNew()).toBe(stamp);
    });

    it("orNew creates new stamp when invalid", () => {
        vi.useFakeTimers();
        const stamp = new Stamp({ val: 1000 });
        vi.advanceTimersByTime(121000);
        const fresh = stamp.orNew();
        expect(fresh).not.toBe(stamp);
        expect(fresh.isValid()).toBe(true);
    });

    it("Stamp.new creates valid stamp", () => {
        vi.useFakeTimers();
        vi.setSystemTime(new Date("2020-01-01T00:00:00Z"));
        const stamp = Stamp.new();
        expect(stamp.val).toBe(Math.floor(Date.now() / 1000));
        expect(stamp.isValid()).toBe(true);
    });
});
