#!/usr/bin/env node
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, "..");
const buildDir = path.join(rootDir, "build");

const binaries = [
    {
        name: "valetudo-helper-miioota-mac-arm64",
        platform: "darwin",
        arch: "arm64",
        exec: process.platform === "darwin" && process.arch === "arm64"
    },
    {
        name: "valetudo-helper-miioota-amd64",
        platform: "linux",
        arch: "x64",
        exec: process.platform === "linux" && process.arch === "x64"
    },
    {
        name: "valetudo-helper-miioota-armv7",
        platform: "linux",
        arch: "arm",
        exec: process.platform === "linux" && (process.arch === "arm" || process.arch === "arm64")
    },
    {
        name: "valetudo-helper-miioota.exe",
        platform: "win32",
        arch: "x64",
        exec: false
    }
];

let failed = false;

for (const binary of binaries) {
    const filePath = path.join(buildDir, binary.name);

    if (!fs.existsSync(filePath)) {
        console.error(`FAIL: missing ${binary.name}`);
        failed = true;
        continue;
    }

    const stat = fs.statSync(filePath);
    if (stat.size === 0) {
        console.error(`FAIL: ${binary.name} is empty`);
        failed = true;
        continue;
    }

    if (binary.exec && (binary.platform !== process.platform || !isArchCompatible(binary.arch, process.arch))) {
        console.log(`SKIP exec: ${binary.name} (built for ${binary.platform}/${binary.arch})`);
        continue;
    }

    if (binary.exec) {
        try {
            fs.chmodSync(filePath, 0o755);
            const helpOutput = execFileSync(filePath, ["--help"], { encoding: "utf-8" });
            if (!helpOutput.includes("install-firmware")) {
                console.error(`FAIL: ${binary.name} --help missing install-firmware`);
                failed = true;
                continue;
            }

            const versionOutput = execFileSync(filePath, ["--version"], { encoding: "utf-8" });
            if (!versionOutput.match(/\d+\.\d+\.\d+/)) {
                console.error(`FAIL: ${binary.name} --version invalid output`);
                failed = true;
                continue;
            }

            console.log(`OK exec: ${binary.name}`);
        } catch (e) {
            console.error(`FAIL exec: ${binary.name}`, e);
            failed = true;
        }
    } else {
        try {
            execFileSync("file", [filePath], { encoding: "utf-8" });
            console.log(`OK exists: ${binary.name} (${stat.size} bytes)`);
        } catch {
            console.log(`OK exists: ${binary.name} (${stat.size} bytes)`);
        }
    }
}

if (failed) {
    process.exit(1);
}

function isArchCompatible(expected, actual) {
    if (expected === actual) {
        return true;
    }

    if (expected === "arm" && actual === "arm64") {
        return true;
    }

    return false;
}

console.log(`Binary smoke tests completed on ${os.platform()}/${os.arch()}`);
