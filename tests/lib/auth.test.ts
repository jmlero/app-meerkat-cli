import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  mockConfig,
  mockCredentials,
  mockSupabaseTokenResponse,
  mockFetchResponse,
} from "../helpers.js";

// Mock config module
vi.mock("../../src/lib/config.js", () => ({
  loadConfig: vi.fn(),
  loadCredentials: vi.fn(),
  saveCredentials: vi.fn(),
}));

import { loadConfig, loadCredentials, saveCredentials } from "../../src/lib/config.js";
import { getValidToken, refreshToken, AuthRequiredError } from "../../src/lib/auth.js";

const mockedLoadConfig = vi.mocked(loadConfig);
const mockedLoadCredentials = vi.mocked(loadCredentials);
const mockedSaveCredentials = vi.mocked(saveCredentials);

describe("auth", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  describe("getValidToken", () => {
    it("returns token when not near expiry", async () => {
      const creds = mockCredentials({
        expires_at: Math.floor(Date.now() / 1000) + 3600,
      });
      mockedLoadCredentials.mockResolvedValue(creds);

      const token = await getValidToken();
      expect(token).toBe(creds.access_token);
    });

    it("throws AuthRequiredError when no credentials", async () => {
      mockedLoadCredentials.mockResolvedValue(null);
      await expect(getValidToken()).rejects.toThrow(AuthRequiredError);
    });

    it("refreshes token when near expiry", async () => {
      const creds = mockCredentials({
        expires_at: Math.floor(Date.now() / 1000) + 60, // 1 min left
      });
      mockedLoadCredentials.mockResolvedValue(creds);
      mockedLoadConfig.mockResolvedValue(mockConfig());
      mockedSaveCredentials.mockResolvedValue(undefined);

      const tokenResp = mockSupabaseTokenResponse();
      vi.spyOn(globalThis, "fetch").mockResolvedValue(
        mockFetchResponse(tokenResp),
      );

      const token = await getValidToken();
      expect(token).toBe(tokenResp.access_token);
    });
  });

  describe("refreshToken", () => {
    it("throws AuthRequiredError when config is missing", async () => {
      mockedLoadConfig.mockResolvedValue(null);
      await expect(
        refreshToken(mockCredentials()),
      ).rejects.toThrow(AuthRequiredError);
    });

    it("throws AuthRequiredError when refresh fails", async () => {
      mockedLoadConfig.mockResolvedValue(mockConfig());
      vi.spyOn(globalThis, "fetch").mockResolvedValue(
        mockFetchResponse({ error: "invalid" }, 401),
      );

      await expect(
        refreshToken(mockCredentials()),
      ).rejects.toThrow(AuthRequiredError);
    });

    it("saves new credentials after successful refresh", async () => {
      mockedLoadConfig.mockResolvedValue(mockConfig());
      const tokenResp = mockSupabaseTokenResponse();
      vi.spyOn(globalThis, "fetch").mockResolvedValue(
        mockFetchResponse(tokenResp),
      );
      mockedSaveCredentials.mockResolvedValue(undefined);

      const token = await refreshToken(mockCredentials());
      expect(token).toBe(tokenResp.access_token);
      expect(mockedSaveCredentials).toHaveBeenCalledWith(
        expect.objectContaining({
          access_token: tokenResp.access_token,
          refresh_token: tokenResp.refresh_token,
        }),
      );
    });
  });
});
