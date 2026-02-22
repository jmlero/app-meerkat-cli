import { describe, it, expect, vi, beforeEach } from "vitest";
import { mockConfig, mockCredentials } from "../helpers.js";

vi.mock("../../src/lib/config.js", () => ({
  loadConfig: vi.fn(),
  loadCredentials: vi.fn(),
}));

import { loadConfig, loadCredentials } from "../../src/lib/config.js";
import { Command } from "commander";
import { registerWhoamiCommand } from "../../src/commands/whoami.js";

const mockedLoadConfig = vi.mocked(loadConfig);
const mockedLoadCredentials = vi.mocked(loadCredentials);

describe("whoami command", () => {
  let program: Command;

  beforeEach(() => {
    vi.restoreAllMocks();
    program = new Command();
    program
      .option("--json")
      .option("--server <url>")
      .option("-v, --verbose");
    registerWhoamiCommand(program);

    vi.spyOn(process, "exit").mockImplementation(() => {
      throw new Error("process.exit called");
    });
    vi.spyOn(console, "log").mockImplementation(() => {});
    vi.spyOn(console, "error").mockImplementation(() => {});
  });

  it("shows email, server, and token expiry when logged in", async () => {
    const creds = mockCredentials({ email: "user@example.com", expires_at: 1740050400 });
    const config = mockConfig({ server_url: "https://themeerkat.app" });
    mockedLoadCredentials.mockResolvedValueOnce(creds);
    mockedLoadConfig.mockResolvedValueOnce(config);

    const logSpy = vi.mocked(console.log);

    await program.parseAsync(["node", "test", "whoami"]);

    const allOutput = logSpy.mock.calls.map((c) => c[0]).join("\n");
    expect(allOutput).toContain("user@example.com");
    expect(allOutput).toContain("https://themeerkat.app");
    expect(allOutput).toContain("Token expires:");
  });

  it("outputs JSON with --json flag", async () => {
    const creds = mockCredentials({ email: "json@test.com", expires_at: 1740050400 });
    const config = mockConfig({ server_url: "https://example.com" });
    mockedLoadCredentials.mockResolvedValueOnce(creds);
    mockedLoadConfig.mockResolvedValueOnce(config);

    const logSpy = vi.mocked(console.log);

    await program.parseAsync(["node", "test", "--json", "whoami"]);

    const jsonCall = logSpy.mock.calls.find((call) => {
      try {
        const parsed = JSON.parse(call[0] as string);
        return parsed.email !== undefined;
      } catch {
        return false;
      }
    });
    expect(jsonCall).toBeDefined();
    const parsed = JSON.parse(jsonCall![0] as string);
    expect(parsed.email).toBe("json@test.com");
    expect(parsed.server).toBe("https://example.com");
    expect(parsed.expires_at).toBe(1740050400);
  });

  it("exits with AUTH_REQUIRED when no credentials", async () => {
    mockedLoadCredentials.mockResolvedValueOnce(null);

    await expect(
      program.parseAsync(["node", "test", "whoami"]),
    ).rejects.toThrow("process.exit called");

    expect(process.exit).toHaveBeenCalledWith(2);
  });

  it("outputs JSON error when no credentials with --json", async () => {
    mockedLoadCredentials.mockResolvedValueOnce(null);

    const logSpy = vi.mocked(console.log);

    await expect(
      program.parseAsync(["node", "test", "--json", "whoami"]),
    ).rejects.toThrow("process.exit called");

    const jsonCall = logSpy.mock.calls.find((call) => {
      try {
        const parsed = JSON.parse(call[0] as string);
        return parsed.error !== undefined;
      } catch {
        return false;
      }
    });
    expect(jsonCall).toBeDefined();
    const parsed = JSON.parse(jsonCall![0] as string);
    expect(parsed.error).toContain("Not logged in");
  });
});
