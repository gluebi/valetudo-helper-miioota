import { Command } from "commander";

import aioInstallCommand from "./commands/aioinstall.js";
import Tools from "./utils/Tools.js";

const version = `${Tools.GET_VERSION()} (${Tools.GET_COMMIT_ID()})`;

const program = new Command();

program
    .name("valetudo-helper-miioota")
    .description("CLI tool to install firmwares via miio local OTA")
    .version(version);

program.command("install-firmware")
    .description("Install a rooted firmware on an unprovisioned robot")
    .argument("<filename>", "path to the rooted firmware image .pkg")
    .action((filePath: string) => {
        aioInstallCommand(filePath).catch((err: unknown) => {
            console.error("Error during execution of install command", err);
            process.exit(-1);
        });
    });

program.parse();
