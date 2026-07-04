import type { RemoteInfo, Socket } from "node:dgram";

export interface MiioHeaderOptions {
    timestamp?: number;
    deviceId?: number;
    payloadLength?: number;
    unknown?: number;
}

export interface MiioErrorPayload {
    code: number;
    message: string;
}

export interface MiioMessage {
    id?: number;
    method?: string;
    params?: Record<string, unknown>;
    result?: unknown;
    error?: MiioErrorPayload;
}

export interface DecodedMiioPacket {
    stamp: number;
    deviceId: number;
    msg: MiioMessage | null;
    token: Buffer | null;
}

export interface MiioSocketOptions {
    socket: Socket;
    token: Buffer;
    deviceId?: number;
    rinfo?: RemoteInfo;
    timeout?: number;
    onIncomingRequestMessage?: (msg: MiioMessage) => void;
    onConnected?: () => void;
    name: string;
    isCloudSocket?: boolean;
}

export interface DiscoveredRobot {
    deviceId: number;
    token: Buffer;
    address: string;
}

export interface SendMessageOptions {
    timeout?: number;
}

interface PendingRequest {
    timeout_id?: NodeJS.Timeout;
    onTimeoutCallback: () => void;
    resolve: (result: unknown) => void;
    reject: (err: unknown) => void;
    method: string;
}

export type PendingRequests = Record<number, PendingRequest>;
