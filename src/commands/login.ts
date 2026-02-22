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

const DEFAULT_SUPABASE_URL = "https://bmitcoorzyppmhmcntae.supabase.co";
const DEFAULT_SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJtaXRjb29yenlwcG1obWNudGFlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njk5NTY2MzYsImV4cCI6MjA4NTUzMjYzNn0.eE1amvJBkyOl9ubtpJfNiwgiw-_9i8--Rph2xVw8Au0";

export function registerLoginCommand(program: Command): void {
  program
    .command("login")
    .description("Authenticate with Meerkat")
    .option("-e, --email <email>", "Email address")
    .option("-p, --password <password>", "Password")
    .action(async (cmdOpts: { email?: string; password?: string }) => {
      const opts = program.opts<GlobalOptions>();
      await loginAction(cmdOpts.email, cmdOpts.password, opts);
    });
}

async function loginAction(
  emailFlag: string | undefined,
  passwordFlag: string | undefined,
  opts: GlobalOptions,
): Promise<void> {
  const serverUrl =
    opts.server ??
    (await input({
      message: "Server URL:",
      default: "https://themeerkat.app",
    }));

  const email = emailFlag ?? (await input({ message: "Email:" }));
  const password =
    passwordFlag ?? (await passwordPrompt({ message: "Password:" }));

  const spinner = createSpinner("Logging in…");
  spinner.start();

  try {
    // Discover Supabase config (fall back to defaults if endpoint not available)
    let authConfig: AuthConfigResponse;
    const configUrl = `${serverUrl}/api/v1/auth/config`;
    if (opts.verbose) {
      console.error(`[verbose] GET ${configUrl}`);
    }

    const configResp = await fetch(configUrl);
    if (configResp.ok) {
      authConfig = (await configResp.json()) as AuthConfigResponse;
    } else {
      if (opts.verbose) {
        console.error(
          `[verbose] Discovery endpoint returned ${configResp.status}, using defaults`,
        );
      }
      authConfig = {
        supabase_url: DEFAULT_SUPABASE_URL,
        supabase_anon_key: DEFAULT_SUPABASE_ANON_KEY,
      };
    }

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
