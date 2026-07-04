import { EventEmitter } from "node:events";
import fs from "node:fs";
import os from "node:os";
import util from "node:util";

import Tools from "./utils/Tools.js";

type LogLevelName = "trace" | "debug" | "info" | "warn" | "error";

interface LogLevelConfig {
    level: number;
    callback: (message?: unknown, ...optionalParams: unknown[]) => void;
}

class Logger {
    static EVENTS = {
        LogMessage: "LogMessage"
    } as const;

    static LogLevels: Record<LogLevelName, LogLevelConfig> = Object.freeze({
        trace: { level: -2, callback: console.debug },
        debug: { level: -1, callback: console.debug },
        info: { level: 0, callback: console.info },
        warn: { level: 1, callback: console.warn },
        error: { level: 2, callback: console.error }
    });

    static LogFileOptions = Object.freeze({
        flags: "as"
    });

    static DEFAULT_LOGFILE_PATHS = Object.freeze({
        POSIX: "/dev/null",
        WINNT: "\\\\.\\NUL"
    });

    private _logEventEmitter = new EventEmitter();
    private _logFileMaxSizeCheckLineCounter = 1;

    logFileMaxSize = 4 * 1024 * 1024;
    logLevel: LogLevelConfig;
    logFilePath: string;
    logFileWriteStream: fs.WriteStream | null;

    constructor() {
        this.logLevel = Logger.LogLevels.info;
        this.logFilePath = os.type() === "Windows_NT" ?
            Logger.DEFAULT_LOGFILE_PATHS.WINNT :
            Logger.DEFAULT_LOGFILE_PATHS.POSIX;
        this.logFileWriteStream = fs.createWriteStream(this.logFilePath, Logger.LogFileOptions);
    }

    getLogLevel(): string | undefined {
        return (Object.keys(Logger.LogLevels) as LogLevelName[]).find((key) => {
            return Logger.LogLevels[key] === this.logLevel;
        });
    }

    setLogLevel(value: string): void {
        if (Logger.LogLevels[value as LogLevelName] === undefined) {
            throw new Error(`Invalid log level '${value}', valid are '${Object.keys(Logger.LogLevels).join("','")}'`);
        }

        this.logLevel = Logger.LogLevels[value as LogLevelName];
    }

    getLogFilePath(): string {
        return this.logFilePath;
    }

    setLogFilePath(filePath: string): void {
        if (Tools.ARE_SAME_FILES(this.logFilePath, filePath)) {
            return;
        }

        if (this.logFileWriteStream) {
            this.logFileWriteStream.close();
            this.logFileWriteStream = null;
        }

        this.logFilePath = filePath;

        if (!Tools.ARE_SAME_FILES(filePath, "/proc/self/fd/1")) {
            this.logFileWriteStream = fs.createWriteStream(this.logFilePath, Logger.LogFileOptions);
        }

        this.log("info", "Set Logfile to " + filePath);
    }

    private buildLogLinePrefix(logLevel: string): string {
        return `[${new Date().toISOString()}] [${logLevel}]`;
    }

    private log(level: LogLevelName, ...args: unknown[]): void {
        if (this.logLevel.level <= Logger.LogLevels[level].level) {
            const logLinePrefix = this.buildLogLinePrefix(level.toUpperCase());
            const logLine = [logLinePrefix, ...args].map((arg) => {
                if (typeof arg === "string") {
                    return arg;
                }

                return util.inspect(arg, { depth: Infinity });
            }).join(" ");

            Logger.LogLevels[level].callback(logLine);
            this.logLineToFile(logLine);
            this._logEventEmitter.emit(Logger.EVENTS.LogMessage, logLine);
        }
    }

    private logLineToFile(line: string): void {
        if (this.logFileWriteStream) {
            this._logFileMaxSizeCheckLineCounter = (this._logFileMaxSizeCheckLineCounter + 1) % 100;

            if (this._logFileMaxSizeCheckLineCounter === 0) {
                if (
                    this.logFilePath !== Logger.DEFAULT_LOGFILE_PATHS.WINNT &&
                    this.logFilePath !== Logger.DEFAULT_LOGFILE_PATHS.POSIX
                ) {
                    let fileSize = 0;

                    try {
                        fileSize = fs.statSync(this.logFilePath).size;
                    } catch (e) {
                        this.error("Error while checking Logfile size:", e);
                    }

                    if (fileSize > this.logFileMaxSize) {
                        this.logFileWriteStream.close();
                        fs.writeFileSync(this.logFilePath, "");
                        this.logFileWriteStream = fs.createWriteStream(this.logFilePath, Logger.LogFileOptions);
                        this.warn(`Logfile ${this.logFilePath} was cleared after reaching a size of ${fileSize} bytes.`);
                    }
                }
            }

            this.logFileWriteStream.write(line);
            this.logFileWriteStream.write("\n");
        }
    }

    onLogMessage(listener: (logLine: string) => void): void {
        this._logEventEmitter.on(Logger.EVENTS.LogMessage, listener);
    }

    trace(...args: unknown[]): void {
        this.log("trace", ...args);
    }

    debug(...args: unknown[]): void {
        this.log("debug", ...args);
    }

    info(...args: unknown[]): void {
        this.log("info", ...args);
    }

    warn(...args: unknown[]): void {
        this.log("warn", ...args);
    }

    error(...args: unknown[]): void {
        this.log("error", ...args);
    }

    getProperties(): { EVENTS: typeof Logger.EVENTS; LogLevels: typeof Logger.LogLevels } {
        return {
            EVENTS: Logger.EVENTS,
            LogLevels: Logger.LogLevels
        };
    }
}

export { Logger };
export default new Logger();
