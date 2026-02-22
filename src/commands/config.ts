import type { Command } from "commander";
import {
  printSuccess,
  printError,
  printJson,
} from "../lib/output.js";
import {
  loadConfig,
  loadCredentials,
  saveConfig,
  configPath,
  credentialsPath,
} from "../lib/config.js";
import type { GlobalOptions } from "../types.js";
import { EXIT_ERROR } from "../types.js";

const SETTABLE_KEYS = ["server_url", "currency"] as const;

export function registerConfigCommand(program: Command): void {
  const config = program
    .command("config")
    .description("View or edit CLI configuration");

  config
    .command("show", { isDefault: true })
    .description("Show current configuration")
    .action(async () => {
      const opts = program.opts<GlobalOptions>();
      await showAction(opts);
    });

  config
    .command("set <key> <value>")
    .description("Set a configuration value")
    .action(async (key: string, value: string) => {
      const opts = program.opts<GlobalOptions>();
      await setAction(key, value, opts);
    });
}

async function showAction(opts: GlobalOptions): Promise<void> {
  const config = await loadConfig();
  const credentials = await loadCredentials();

  if (opts.json) {
    printJson({
      server_url: config?.server_url ?? null,
      currency: config?.currency ?? "EUR",
      email: credentials?.email ?? null,
      config_path: configPath(),
      credentials_path: credentialsPath(),
    });
  } else {
    printSuccess("Current configuration");
    console.log(`  Server: ${config?.server_url ?? "not set"}`);
    console.log(`  Currency: ${config?.currency ?? "EUR"}`);
    console.log(`  Email: ${credentials?.email ?? "not logged in"}`);
    console.log(`  Config file: ${configPath()}`);
    console.log(`  Credentials file: ${credentialsPath()}`);
  }
}

async function setAction(
  key: string,
  value: string,
  opts: GlobalOptions,
): Promise<void> {
  if (!SETTABLE_KEYS.includes(key as (typeof SETTABLE_KEYS)[number])) {
    if (opts.json) {
      printJson({ error: `Unknown config key: ${key}. Valid keys: ${SETTABLE_KEYS.join(", ")}` });
    } else {
      printError(`Unknown config key: ${key}. Valid keys: ${SETTABLE_KEYS.join(", ")}`);
    }
    process.exit(EXIT_ERROR);
  }

  const config = await loadConfig();
  if (!config) {
    if (opts.json) {
      printJson({ error: "No configuration found. Run `meerkat login` first." });
    } else {
      printError("No configuration found. Run `meerkat login` first.");
    }
    process.exit(EXIT_ERROR);
  }

  const updated = { ...config, [key]: value };
  await saveConfig(updated);

  if (opts.json) {
    printJson({ key, value });
  } else {
    printSuccess(`Set ${key} = ${value}`);
  }
}
