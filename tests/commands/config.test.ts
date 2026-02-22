import { describe, it, expect, vi, beforeEach } from "vitest";
import { mockConfig, mockCredentials } from "../helpers.js";

vi.mock("../../src/lib/config.js", () => ({
  loadConfig: vi.fn(),
  loadCredentials: vi.fn(),
  configPath: vi.fn(() => "/mock/.config/meerkat/config.json"),
  credentialsPath: vi.fn(() => "/mock/.config/meerkat/credentials.json"),
}));

import {
  loadConfig,
  loadCredentials,
  configPath,
  credentialsPath,
} from "../../src/lib/config.js";
import { Command } from "commander";
import { registerConfigCommand } from "../../src/commands/config.js";

const mockedLoadConfig = vi.mocked(loadConfig);
const mockedLoadCredentials = vi.mocked(loadCredentials);

describe("config command", () => {
  let program: Command;

  beforeEach(() => {
    vi.restoreAllMocks();
    vi.mocked(configPath).mockReturnValue("/mock/.config/meerkat/config.json");
    vi.mocked(credentialsPath).mockReturnValue("/mock/.config/meerkat/credentials.json");

    program = new Command();
    program
      .option("--json")
      .option("--server <url>")
      .option("-v, --verbose");
    registerConfigCommand(program);

    vi.spyOn(process, "exit").mockImplementation(() => {
      throw new Error("process.exit called");
    });
    vi.spyOn(console, "log").mockImplementation(() => {});
    vi.spyOn(console, "error").mockImplementation(() => {});
  });

  it("displays current configuration", async () => {
    const config = mockConfig({ server_url: "https://api.example.com" });
    const creds = mockCredentials({ email: "user@test.com" });
    mockedLoadConfig.mockResolvedValueOnce(config);
    mockedLoadCredentials.mockResolvedValueOnce(creds);

    const logSpy = vi.mocked(console.log);

    await program.parseAsync(["node", "test", "config"]);

    const allOutput = logSpy.mock.calls.map((c) => c[0]).join("\n");
    expect(allOutput).toContain("https://api.example.com");
    expect(allOutput).toContain("EUR");
    expect(allOutput).toContain("user@test.com");
  });

  it("shows defaults when no config exists", async () => {
    mockedLoadConfig.mockResolvedValueOnce(null);
    mockedLoadCredentials.mockResolvedValueOnce(null);

    const logSpy = vi.mocked(console.log);

    await program.parseAsync(["node", "test", "config"]);

    const allOutput = logSpy.mock.calls.map((c) => c[0]).join("\n");
    expect(allOutput).toContain("not set");
    expect(allOutput).toContain("EUR");
    expect(allOutput).toContain("not logged in");
  });

  it("outputs JSON with --json flag", async () => {
    const config = mockConfig({ server_url: "https://api.example.com" });
    const creds = mockCredentials({ email: "user@test.com" });
    mockedLoadConfig.mockResolvedValueOnce(config);
    mockedLoadCredentials.mockResolvedValueOnce(creds);

    const logSpy = vi.mocked(console.log);

    await program.parseAsync(["node", "test", "--json", "config"]);

    const jsonCall = logSpy.mock.calls.find((call) => {
      try {
        const parsed = JSON.parse(call[0] as string);
        return parsed.server_url !== undefined;
      } catch {
        return false;
      }
    });
    expect(jsonCall).toBeDefined();
    const parsed = JSON.parse(jsonCall![0] as string);
    expect(parsed.server_url).toBe("https://api.example.com");
    expect(parsed.currency).toBe("EUR");
    expect(parsed.email).toBe("user@test.com");
  });
});
