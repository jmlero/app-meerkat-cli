import type { Command } from "commander";
import { printSuccess, printError, printJson } from "../lib/output.js";
import { loadConfig, loadCredentials } from "../lib/config.js";
import type { GlobalOptions } from "../types.js";
import { EXIT_AUTH_REQUIRED } from "../types.js";

export function registerWhoamiCommand(program: Command): void {
  program
    .command("whoami")
    .description("Show current authentication status")
    .action(async () => {
      const opts = program.opts<GlobalOptions>();
      await whoamiAction(opts);
    });
}

async function whoamiAction(opts: GlobalOptions): Promise<void> {
  const credentials = await loadCredentials();
  if (!credentials) {
    if (opts.json) {
      printJson({ error: "Not logged in. Run `meerkat login` first." });
    } else {
      printError("Not logged in. Run `meerkat login` first.");
    }
    process.exit(EXIT_AUTH_REQUIRED);
  }

  const config = await loadConfig();
  const server = config?.server_url ?? "unknown";

  const expiresDate = new Date(credentials.expires_at * 1000);
  const expiresFormatted = expiresDate.toISOString().replace("T", " ").replace(/\.\d{3}Z$/, " UTC");

  if (opts.json) {
    printJson({
      email: credentials.email,
      server,
      expires_at: credentials.expires_at,
    });
  } else {
    printSuccess(`Logged in as ${credentials.email}`);
    console.log(`  Server: ${server}`);
    console.log(`  Token expires: ${expiresFormatted}`);
  }
}
