import { loadConfig } from "./config.js";
import { getValidToken } from "./auth.js";
import { AuthRequiredError } from "./auth.js";
import type { ApiErrorResponse } from "../types.js";

export interface ApiRequestOptions {
  method?: string;
  body?: unknown;
  headers?: Record<string, string>;
  noAuth?: boolean;
  verbose?: boolean;
}

export async function apiRequest<T>(
  path: string,
  options: ApiRequestOptions = {},
): Promise<T> {
  const config = await loadConfig();
  if (!config) {
    throw new AuthRequiredError(
      "Configuration missing. Run `meerkat login` first.",
    );
  }

  const { method = "GET", body, headers = {}, noAuth = false, verbose = false } = options;

  const url = `${config.server_url}${path}`;

  const reqHeaders: Record<string, string> = { ...headers };

  if (!noAuth) {
    const token = await getValidToken();
    reqHeaders["Authorization"] = `Bearer ${token}`;
  }

  let fetchBody: BodyInit | undefined;
  if (body instanceof FormData) {
    fetchBody = body;
  } else if (body !== undefined) {
    reqHeaders["Content-Type"] = "application/json";
    fetchBody = JSON.stringify(body);
  }

  if (verbose) {
    console.error(`[verbose] ${method} ${url}`);
  }

  const response = await fetch(url, {
    method,
    headers: reqHeaders,
    body: fetchBody,
  });

  if (verbose) {
    console.error(`[verbose] ${response.status} ${response.statusText}`);
  }

  if (!response.ok) {
    let detail = `HTTP ${response.status}: ${response.statusText}`;
    try {
      const errBody = (await response.json()) as ApiErrorResponse;
      if (errBody.detail) {
        detail = errBody.detail;
      }
    } catch {
      // use default detail
    }
    throw new Error(detail);
  }

  return (await response.json()) as T;
}
