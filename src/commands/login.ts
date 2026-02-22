import type { Command } from "commander";
import { input, password as passwordPrompt } from "@inquirer/prompts";
import {
  printSuccess,
  printError,
  printJson,
  createSpinner,
} from "../lib/output.js";
import { saveConfig, saveCredentials } from "../lib/config.js";
import type {
  AuthConfigResponse,
  SupabaseTokenResponse,
  GlobalOptions,
} from "../types.js";
import { EXIT_ERROR } from "../types.js";

export function registerLoginCommand(program: Command): void {
  program
    .command("login")
    .description("Authenticate with Meerkat")
    .action(async () => {
      const opts = program.opts<GlobalOptions>();
      await loginAction(opts);
    });
}

async function loginAction(opts: GlobalOptions): Promise<void> {
  const serverUrl =
    opts.server ??
    (await input({
      message: "Server URL:",
      default: "https://themeerkat.app",
    }));

  const email = await input({ message: "Email:" });
  const password = await passwordPrompt({ message: "Password:" });

  const spinner = createSpinner("Logging in…");
  spinner.start();

  try {
    // Discover Supabase config
    const configUrl = `${serverUrl}/api/v1/auth/config`;
    if (opts.verbose) {
      console.error(`[verbose] GET ${configUrl}`);
    }

    const configResp = await fetch(configUrl);
    if (!configResp.ok) {
      spinner.stop();
      const detail = `Failed to fetch auth config: HTTP ${configResp.status}`;
      if (opts.json) {
        printJson({ error: detail });
      } else {
        printError(detail);
      }
      process.exit(EXIT_ERROR);
    }

    const authConfig = (await configResp.json()) as AuthConfigResponse;

    // Authenticate with Supabase
    const tokenUrl = `${authConfig.supabase_url}/auth/v1/token?grant_type=password`;
    if (opts.verbose) {
      console.error(`[verbose] POST ${tokenUrl}`);
    }

    const tokenResp = await fetch(tokenUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        apikey: authConfig.supabase_anon_key,
      },
      body: JSON.stringify({ email, password }),
    });

    if (!tokenResp.ok) {
      spinner.stop();
      const detail =
        tokenResp.status === 400
          ? "Invalid email or password"
          : `Authentication failed: HTTP ${tokenResp.status}`;
      if (opts.json) {
        printJson({ error: detail });
      } else {
        printError(detail);
      }
      process.exit(EXIT_ERROR);
    }

    const tokenData = (await tokenResp.json()) as SupabaseTokenResponse;
    const nowSeconds = Math.floor(Date.now() / 1000);

    // Save config and credentials
    await saveConfig({
      server_url: serverUrl,
      supabase_url: authConfig.supabase_url,
      supabase_anon_key: authConfig.supabase_anon_key,
    });

    await saveCredentials({
      email,
      access_token: tokenData.access_token,
      refresh_token: tokenData.refresh_token,
      expires_at: nowSeconds + tokenData.expires_in,
    });

    spinner.stop();

    if (opts.json) {
      printJson({ email, server: serverUrl });
    } else {
      printSuccess(`Logged in as ${email}`);
    }
  } catch (error) {
    spinner.stop();
    const message = error instanceof Error ? error.message : String(error);
    if (opts.json) {
      printJson({ error: message });
    } else {
      printError(message);
    }
    process.exit(EXIT_ERROR);
  }
}
