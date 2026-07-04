import type { MiioErrorPayload } from "./types.js";

export default class MiioErrorResponseError extends Error {
    response: MiioErrorPayload;

    constructor(msg: string, response: MiioErrorPayload) {
        super(msg);
        this.name = "MiioErrorResponseError";
        this.response = response;
    }
}
