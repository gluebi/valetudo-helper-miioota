import type { MiioMessage } from "./types.js";

export default class MiioTimeoutError extends Error {
    msg: MiioMessage;

    constructor(msg: MiioMessage) {
        super(`Timeout waiting for response to ${msg.method ?? "unknown"}`);
        this.name = "MiioTimeoutError";
        this.msg = msg;
    }
}
