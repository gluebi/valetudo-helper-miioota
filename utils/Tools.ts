import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const moduleDir = path.dirname(fileURLToPath(import.meta.url));

interface PkgProcess extends NodeJS.Process {
    pkg?: {
        defaultEntrypoint?: string;
    };
}

function getProjectRoot(): string {
    const pkgEntrypoint = (process as PkgProcess).pkg?.defaultEntrypoint;

    if (pkgEntrypoint) {
        return path.resolve(path.dirname(pkgEntrypoint), "..");
    }

    const candidates = [
        findProjectRoot(moduleDir),
        path.resolve(moduleDir, "../.."),
        path.resolve(moduleDir, "..")
    ];

    for (const candidate of candidates) {
        try {
            fs.readFileSync(path.join(candidate, "package.json"), { encoding: "utf-8" });
            return candidate;
        } catch {
            // try next candidate
        }
    }

    return path.resolve(moduleDir, "../..");
}

function findProjectRoot(startDir: string): string {
    let dir = startDir;

    while (dir !== path.dirname(dir)) {
        if (fs.existsSync(path.join(dir, "package.json"))) {
            return dir;
        }

        dir = path.dirname(dir);
    }

    return path.resolve(startDir, "../..");
}

const projectRoot = getProjectRoot();

export default class Tools {
    static MK_DIR_PATH(filepath: string): void {
        const dirname = path.dirname(filepath);
        if (!fs.existsSync(dirname)) {
            Tools.MK_DIR_PATH(dirname);
        }
        if (!fs.existsSync(filepath)) {
            fs.mkdirSync(filepath);
        }
    }

    static ARE_SAME_FILES(filepath1: string, filepath2: string): boolean {
        if (filepath1 === filepath2) {
            return true;
        }

        try {
            const stat1 = fs.statSync(filepath1, { bigint: true });
            const stat2 = fs.statSync(filepath2, { bigint: true });
            return stat1.dev === stat2.dev && stat1.ino === stat2.ino;
        } catch {
            return false;
        }
    }

    static GET_NETWORK_INTERFACES(): os.NetworkInterfaceInfo[] {
        return Object.values(os.networkInterfaces())
            .flat()
            .filter((i): i is os.NetworkInterfaceInfo => {
                return i !== undefined && !i.mac.startsWith("00:00");
            });
    }

    static GET_CURRENT_HOST_IP_ADDRESSES(): string[] {
        const IPs = Tools.GET_NETWORK_INTERFACES().map((i) => {
            return i.address;
        });
        return [...new Set(IPs)];
    }

    static isIPv4(family: string | number): boolean {
        return family === "IPv4" || family === 4;
    }

    static GET_CURRENT_HOST_IPV4_ADDRESSES(): string[] {
        const IPs = Tools.GET_NETWORK_INTERFACES()
            .filter((i) => {
                return Tools.isIPv4(i.family);
            })
            .map((i) => {
                return i.address;
            });

        return [...new Set(IPs)];
    }

    static CONVERT_BYTES_TO_HUMANS(bytes: number): string {
        if (bytes >= 1024 * 1024 * 1024) {
            return `${(((bytes / 1024) / 1024) / 1024).toFixed(2)} GiB`;
        } else if (bytes >= 1024 * 1024) {
            return `${((bytes / 1024) / 1024).toFixed(2)} MiB`;
        } else if (bytes >= 1024) {
            return `${(bytes / 1024).toFixed(2)} KiB`;
        }

        return `${bytes} bytes`;
    }

    static GET_VERSION(): string {
        let version = "unknown";

        try {
            const packageContent = fs.readFileSync(path.join(projectRoot, "package.json"), { encoding: "utf-8" });

            if (packageContent) {
                version = (JSON.parse(packageContent) as { version: string }).version;
            }
        } catch {
            // intentional
        }

        return version;
    }

    static GET_COMMIT_ID(): string {
        let commitId = "unknown";

        try {
            const headContent = fs.readFileSync(path.join(projectRoot, ".git/HEAD"), { encoding: "utf-8" }).trim();
            const branchRef = headContent.match(/^ref: refs\/heads\/(.+)$/);

            if (branchRef !== null) {
                commitId = fs.readFileSync(
                    path.join(projectRoot, `.git/refs/heads/${branchRef[1]}`),
                    { encoding: "utf-8" }
                ).trim();
            } else {
                commitId = headContent;
            }
        } catch {
            // intentional
        }

        return commitId;
    }
}
