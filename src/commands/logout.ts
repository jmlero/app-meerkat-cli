import type { Command } from "commander";
import { printSuccess, printJson } from "../lib/output.js";
import { deleteCredentials } from "../lib/config.js";
import type { GlobalOptions } from "../types.js";

export function registerLogoutCommand(program: Command): void {
  program
    .command("logout")
    .description("Clear stored credentials")
    .action(async () => {
      const opts = program.opts<GlobalOptions>();
      await logoutAction(opts);
    });
}

async function logoutAction(opts: GlobalOptions): Promise<void> {
  await deleteCredentials();

  if (opts.json) {
    printJson({ message: "Logged out" });
  } else {
    printSuccess("Logged out successfully.");
  }
}
