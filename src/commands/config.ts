import type { Command } from "commander";
import {
  printSuccess,
  printJson,
} from "../lib/output.js";
import {
  loadConfig,
  loadCredentials,
  configPath,
  credentialsPath,
} from "../lib/config.js";
import type { GlobalOptions } from "../types.js";

export function registerConfigCommand(program: Command): void {
  program
    .command("config")
    .description("Show current CLI configuration")
    .action(async () => {
      const opts = program.opts<GlobalOptions>();
      await showAction(opts);
    });
}

async function showAction(opts: GlobalOptions): Promise<void> {
  const config = await loadConfig();
  const credentials = await loadCredentials();

  if (opts.json) {
    printJson({
      server_url: config?.server_url ?? null,
      currency: "EUR",
      email: credentials?.email ?? null,
      config_path: configPath(),
      credentials_path: credentialsPath(),
    });
  } else {
    printSuccess("Current configuration");
    console.log(`  Server: ${config?.server_url ?? "not set"}`);
    console.log(`  Currency: EUR`);
    console.log(`  Email: ${credentials?.email ?? "not logged in"}`);
    console.log(`  Config file: ${configPath()}`);
    console.log(`  Credentials file: ${credentialsPath()}`);
  }
}
