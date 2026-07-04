import fs from "node:fs";

import { describe, expect, it, vi } from "vitest";

import { Logger } from "../Logger.js";

describe("Logger", () => {
    it("getLogLevel returns current level name", () => {
        const logger = new Logger();
        logger.setLogLevel("warn");
        expect(logger.getLogLevel()).toBe("warn");
    });

    it("setLogLevel throws for invalid level", () => {
        const logger = new Logger();
        expect(() => {
            return logger.setLogLevel("invalid");
        }).toThrow(/Invalid log level/);
    });

    it("setLogFilePath updates path", () => {
        const logger = new Logger();
        const tmpPath = "/tmp/valetudo-helper-test.log";
        vi.spyOn(fs, "createWriteStream").mockReturnValue({
            write: vi.fn(),
            close: vi.fn()
        } as never);

        logger.setLogFilePath(tmpPath);
        expect(logger.getLogFilePath()).toBe(tmpPath);
    });
});
