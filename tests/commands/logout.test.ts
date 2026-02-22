import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("../../src/lib/config.js", () => ({
  deleteCredentials: vi.fn(),
}));

import { deleteCredentials } from "../../src/lib/config.js";
import { Command } from "commander";
import { registerLogoutCommand } from "../../src/commands/logout.js";

const mockedDeleteCredentials = vi.mocked(deleteCredentials);

describe("logout command", () => {
  let program: Command;

  beforeEach(() => {
    vi.restoreAllMocks();
    program = new Command();
    program
      .option("--json")
      .option("--server <url>")
      .option("-v, --verbose");
    registerLogoutCommand(program);

    vi.spyOn(process, "exit").mockImplementation(() => {
      throw new Error("process.exit called");
    });
    vi.spyOn(console, "log").mockImplementation(() => {});
    vi.spyOn(console, "error").mockImplementation(() => {});
  });

  it("calls deleteCredentials and prints success", async () => {
    mockedDeleteCredentials.mockResolvedValueOnce(undefined);

    const logSpy = vi.mocked(console.log);

    await program.parseAsync(["node", "test", "logout"]);

    expect(mockedDeleteCredentials).toHaveBeenCalled();
    const allOutput = logSpy.mock.calls.map((c) => c[0]).join("\n");
    expect(allOutput).toContain("Logged out");
  });

  it("outputs JSON with --json flag", async () => {
    mockedDeleteCredentials.mockResolvedValueOnce(undefined);

    const logSpy = vi.mocked(console.log);

    await program.parseAsync(["node", "test", "--json", "logout"]);

    const jsonCall = logSpy.mock.calls.find((call) => {
      try {
        const parsed = JSON.parse(call[0] as string);
        return parsed.message !== undefined;
      } catch {
        return false;
      }
    });
    expect(jsonCall).toBeDefined();
    const parsed = JSON.parse(jsonCall![0] as string);
    expect(parsed.message).toBe("Logged out");
  });

  it("is idempotent when no credentials exist", async () => {
    mockedDeleteCredentials.mockResolvedValueOnce(undefined);

    await program.parseAsync(["node", "test", "logout"]);

    expect(mockedDeleteCredentials).toHaveBeenCalled();
  });
});
