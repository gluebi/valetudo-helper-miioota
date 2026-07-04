import fs from "node:fs";
import os from "node:os";

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const exitMock = vi.hoisted(() => {
    return vi.fn((code?: number) => {
        throw Object.assign(new Error(`process.exit:${code ?? 0}`), { exitCode: code });
    });
});

vi.mock("node:dgram", () => {
    class MockDgramSocket {
        listeners: Record<string, Array<(...args: unknown[]) => void>> = {};

        bind = vi.fn((_port?: number, _host?: string, cb?: () => void) => {
            cb?.();
            queueMicrotask(() => {
                this.emit("listening");
            });
        });

        setBroadcast = vi.fn();
        send = vi.fn();
        close = vi.fn();

        on(event: string, handler: (...args: unknown[]) => void): this {
            this.listeners[event] = this.listeners[event] ?? [];
            this.listeners[event].push(handler);
            return this;
        }

        emit(event: string, ...args: unknown[]): void {
            for (const handler of this.listeners[event] ?? []) {
                handler(...args);
            }
        }
    }

    return {
        default: {
            createSocket: vi.fn(() => {
                return new MockDgramSocket();
            })
        }
    };
});

vi.spyOn(process, "exit").mockImplementation(exitMock as never);

import aioInstall from "../../commands/aioinstall.js";
import Tools from "../../utils/Tools.js";

describe("aioinstall", () => {
    beforeEach(() => {
        exitMock.mockClear();
        vi.spyOn(console, "log").mockImplementation(() => {
            return undefined;
        });
        vi.spyOn(console, "error").mockImplementation(() => {
            return undefined;
        });
    });

    afterEach(() => {
        vi.useRealTimers();
    });

    it("exits when firmware file does not exist", async () => {
        await aioInstall("/nonexistent/firmware.pkg").catch(() => {
            return undefined;
        });
        expect(exitMock).toHaveBeenCalledWith(-1);
    });

    it("exits when no robot network interface is available", async () => {
        const tmpDir = fs.mkdtempSync(`${os.tmpdir()}/valetudo-test-`);
        const firmwarePath = `${tmpDir}/firmware.pkg`;
        fs.writeFileSync(firmwarePath, Buffer.from([0x00, 0x01, 0x02]));

        vi.spyOn(Tools, "GET_CURRENT_HOST_IPV4_ADDRESSES").mockReturnValue(["192.168.1.5"]);

        await aioInstall(firmwarePath).catch(() => {
            return undefined;
        });
        expect(exitMock).toHaveBeenCalledWith(-1);

        fs.rmSync(tmpDir, { recursive: true, force: true });
    });

    it("exits when no robot is discovered", async () => {
        const tmpDir = fs.mkdtempSync(`${os.tmpdir()}/valetudo-test-`);
        const firmwarePath = `${tmpDir}/firmware.pkg`;
        fs.writeFileSync(firmwarePath, Buffer.from([0x00, 0x01]));

        vi.spyOn(Tools, "GET_CURRENT_HOST_IPV4_ADDRESSES").mockReturnValue(["192.168.8.100"]);
        vi.useFakeTimers();

        void aioInstall(firmwarePath).catch(() => {
            return undefined;
        });
        await vi.advanceTimersByTimeAsync(10000);

        expect(exitMock).toHaveBeenCalledWith(-1);

        fs.rmSync(tmpDir, { recursive: true, force: true });
    });
});
