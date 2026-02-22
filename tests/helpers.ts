import type {
  StoredConfig,
  StoredCredentials,
  AuthConfigResponse,
  SupabaseTokenResponse,
  UploadResponse,
  InboxItem,
} from "../src/types.js";

export function mockConfig(
  overrides: Partial<StoredConfig> = {},
): StoredConfig {
  return {
    server_url: "https://test.example.com",
    supabase_url: "https://supabase.example.com",
    supabase_anon_key: "test-anon-key",
    ...overrides,
  };
}

export function mockCredentials(
  overrides: Partial<StoredCredentials> = {},
): StoredCredentials {
  return {
    email: "test@example.com",
    access_token: "test-access-token",
    refresh_token: "test-refresh-token",
    expires_at: Math.floor(Date.now() / 1000) + 3600,
    ...overrides,
  };
}

export function mockAuthConfigResponse(
  overrides: Partial<AuthConfigResponse> = {},
): AuthConfigResponse {
  return {
    supabase_url: "https://supabase.example.com",
    supabase_anon_key: "test-anon-key",
    ...overrides,
  };
}

export function mockSupabaseTokenResponse(
  overrides: Partial<SupabaseTokenResponse> = {},
): SupabaseTokenResponse {
  return {
    access_token: "new-access-token",
    refresh_token: "new-refresh-token",
    expires_in: 3600,
    token_type: "bearer",
    user: { email: "test@example.com" },
    ...overrides,
  };
}

export function mockUploadResponse(
  overrides: Partial<UploadResponse> = {},
): UploadResponse {
  return {
    items: [
      {
        id: "item-1",
        file_name: "receipt.jpg",
        status: "pending",
      },
    ],
    ...overrides,
  };
}

export function mockInboxItem(
  overrides: Partial<InboxItem> = {},
): InboxItem {
  return {
    id: "item-1",
    file_name: "receipt.jpg",
    status: "done",
    created_at: "2025-01-01T00:00:00Z",
    merchant_name: "Test Store",
    total_amount: 42.5,
    currency: "EUR",
    ...overrides,
  };
}

export function mockFetchResponse(
  body: unknown,
  status = 200,
): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    statusText: status === 200 ? "OK" : "Error",
    json: async () => body,
    text: async () => JSON.stringify(body),
    headers: new Headers(),
  } as Response;
}
