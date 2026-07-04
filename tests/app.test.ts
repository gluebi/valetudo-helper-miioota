import { execFileSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

describe("app CLI", () => {
    it("prints help", () => {
        const output = execFileSync("node", [path.join(rootDir, "dist/app.js"), "--help"], {
            encoding: "utf-8"
        });

        expect(output).toContain("install-firmware");
        expect(output).toContain("valetudo-helper-miioota");
    });

    it("prints version", () => {
        const output = execFileSync("node", [path.join(rootDir, "dist/app.js"), "--version"], {
            encoding: "utf-8"
        });

        expect(output).toMatch(/\d+\.\d+\.\d+/);
    });
});
