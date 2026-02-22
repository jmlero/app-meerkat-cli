import { describe, it, expect, vi, beforeEach } from "vitest";
import { mockConfig, mockFetchResponse } from "../helpers.js";

vi.mock("../../src/lib/config.js", () => ({
  loadConfig: vi.fn(),
}));

vi.mock("../../src/lib/auth.js", () => ({
  getValidToken: vi.fn(),
  AuthRequiredError: class AuthRequiredError extends Error {
    exitCode = 2;
    constructor(msg = "Auth required") {
      super(msg);
      this.name = "AuthRequiredError";
    }
  },
}));

import { loadConfig } from "../../src/lib/config.js";
import { getValidToken } from "../../src/lib/auth.js";
import { apiRequest } from "../../src/lib/api-client.js";

const mockedLoadConfig = vi.mocked(loadConfig);
const mockedGetValidToken = vi.mocked(getValidToken);

describe("apiRequest", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    mockedLoadConfig.mockResolvedValue(mockConfig());
    mockedGetValidToken.mockResolvedValue("test-token");
  });

  it("makes GET request with auth header", async () => {
    const fetchSpy = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValue(mockFetchResponse({ data: "test" }));

    const result = await apiRequest<{ data: string }>("/api/v1/test");

    expect(result).toEqual({ data: "test" });
    expect(fetchSpy).toHaveBeenCalledWith(
      "https://test.example.com/api/v1/test",
      expect.objectContaining({
        method: "GET",
        headers: expect.objectContaining({
          Authorization: "Bearer test-token",
        }),
      }),
    );
  });

  it("sends JSON body for plain objects", async () => {
    const fetchSpy = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValue(mockFetchResponse({ ok: true }));

    await apiRequest("/api/v1/test", {
      method: "POST",
      body: { key: "value" },
    });

    expect(fetchSpy).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({
        body: JSON.stringify({ key: "value" }),
        headers: expect.objectContaining({
          "Content-Type": "application/json",
        }),
      }),
    );
  });

  it("passes FormData body through without Content-Type", async () => {
    const fetchSpy = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValue(mockFetchResponse({ ok: true }));

    const formData = new FormData();
    formData.append("file", "data");

    await apiRequest("/api/v1/test", {
      method: "POST",
      body: formData,
    });

    const callHeaders = fetchSpy.mock.calls[0]![1]!.headers as Record<
      string,
      string
    >;
    expect(callHeaders["Content-Type"]).toBeUndefined();
  });

  it("extracts error detail from response", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      mockFetchResponse({ detail: "Not found" }, 404),
    );

    await expect(apiRequest("/api/v1/missing")).rejects.toThrow("Not found");
  });

  it("logs to stderr in verbose mode", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      mockFetchResponse({ ok: true }),
    );
    const stderrSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    await apiRequest("/api/v1/test", { verbose: true });

    expect(stderrSpy).toHaveBeenCalledWith(
      expect.stringContaining("[verbose] GET"),
    );
  });
});
