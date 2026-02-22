import { loadConfig, loadCredentials, saveCredentials } from "./config.js";
import type { StoredCredentials, SupabaseTokenResponse } from "../types.js";
import { EXIT_AUTH_REQUIRED } from "../types.js";

export class AuthRequiredError extends Error {
  public readonly exitCode = EXIT_AUTH_REQUIRED;

  constructor(message = "Authentication required. Run `meerkat login` first.") {
    super(message);
    this.name = "AuthRequiredError";
  }
}

const REFRESH_THRESHOLD_SECONDS = 5 * 60;

export async function getValidToken(): Promise<string> {
  const credentials = await loadCredentials();
  if (!credentials) {
    throw new AuthRequiredError();
  }

  const nowSeconds = Math.floor(Date.now() / 1000);
  const timeUntilExpiry = credentials.expires_at - nowSeconds;

  if (timeUntilExpiry > REFRESH_THRESHOLD_SECONDS) {
    return credentials.access_token;
  }

  return refreshToken(credentials);
}

export async function refreshToken(
  credentials: StoredCredentials,
): Promise<string> {
  const config = await loadConfig();
  if (!config) {
    throw new AuthRequiredError(
      "Configuration missing. Run `meerkat login` first.",
    );
  }

  const url = `${config.supabase_url}/auth/v1/token?grant_type=refresh_token`;

  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      apikey: config.supabase_anon_key,
    },
    body: JSON.stringify({ refresh_token: credentials.refresh_token }),
  });

  if (!response.ok) {
    throw new AuthRequiredError(
      "Token refresh failed. Run `meerkat login` to re-authenticate.",
    );
  }

  const data = (await response.json()) as SupabaseTokenResponse;
  const nowSeconds = Math.floor(Date.now() / 1000);

  const updated: StoredCredentials = {
    email: credentials.email,
    access_token: data.access_token,
    refresh_token: data.refresh_token,
    expires_at: nowSeconds + data.expires_in,
  };

  await saveCredentials(updated);
  return updated.access_token;
}
