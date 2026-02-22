import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  mockAuthConfigResponse,
  mockSupabaseTokenResponse,
  mockFetchResponse,
} from "../helpers.js";

vi.mock("../../src/lib/config.js", () => ({
  saveConfig: vi.fn(),
  saveCredentials: vi.fn(),
}));

vi.mock("@inquirer/prompts", () => ({
  input: vi.fn(),
  password: vi.fn(),
}));

import { saveConfig, saveCredentials } from "../../src/lib/config.js";
import { input, password } from "@inquirer/prompts";
import { Command } from "commander";
import { registerLoginCommand } from "../../src/commands/login.js";

const mockedSaveConfig = vi.mocked(saveConfig);
const mockedSaveCredentials = vi.mocked(saveCredentials);
const mockedInput = vi.mocked(input);
const mockedPassword = vi.mocked(password);

describe("login command", () => {
  let program: Command;

  beforeEach(() => {
    vi.restoreAllMocks();
    program = new Command();
    program
      .option("--json")
      .option("--server <url>")
      .option("-v, --verbose");
    registerLoginCommand(program);
    mockedSaveConfig.mockResolvedValue(undefined);
    mockedSaveCredentials.mockResolvedValue(undefined);

    // Prevent process.exit from actually exiting
    vi.spyOn(process, "exit").mockImplementation(() => {
      throw new Error("process.exit called");
    });
  });

  it("saves config and credentials on successful login", async () => {
    const authConfig = mockAuthConfigResponse();
    const tokenResp = mockSupabaseTokenResponse();

    // Mock prompts - server input, email, password
    mockedInput
      .mockResolvedValueOnce("https://test.example.com")
      .mockResolvedValueOnce("user@test.com");
    mockedPassword.mockResolvedValueOnce("password123");

    vi.spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(mockFetchResponse(authConfig))
      .mockResolvedValueOnce(mockFetchResponse(tokenResp));

    // Suppress console output
    vi.spyOn(console, "log").mockImplementation(() => {});
    vi.spyOn(console, "error").mockImplementation(() => {});

    await program.parseAsync(["node", "test", "login"]);

    expect(mockedSaveConfig).toHaveBeenCalledWith(
      expect.objectContaining({
        server_url: "https://test.example.com",
        supabase_url: authConfig.supabase_url,
      }),
    );
    expect(mockedSaveCredentials).toHaveBeenCalledWith(
      expect.objectContaining({
        email: "user@test.com",
        access_token: tokenResp.access_token,
      }),
    );
  });

  it("exits with error on bad credentials", async () => {
    mockedInput
      .mockResolvedValueOnce("https://test.example.com")
      .mockResolvedValueOnce("user@test.com");
    mockedPassword.mockResolvedValueOnce("wrong");

    const authConfig = mockAuthConfigResponse();
    vi.spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(mockFetchResponse(authConfig))
      .mockResolvedValueOnce(mockFetchResponse({ error: "invalid" }, 400));

    vi.spyOn(console, "log").mockImplementation(() => {});
    vi.spyOn(console, "error").mockImplementation(() => {});

    await expect(
      program.parseAsync(["node", "test", "login"]),
    ).rejects.toThrow("process.exit called");
  });

  it("uses --server option instead of prompting", async () => {
    const authConfig = mockAuthConfigResponse();
    const tokenResp = mockSupabaseTokenResponse();

    mockedInput.mockResolvedValueOnce("user@test.com");
    mockedPassword.mockResolvedValueOnce("password123");

    vi.spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(mockFetchResponse(authConfig))
      .mockResolvedValueOnce(mockFetchResponse(tokenResp));

    vi.spyOn(console, "log").mockImplementation(() => {});
    vi.spyOn(console, "error").mockImplementation(() => {});

    await program.parseAsync([
      "node",
      "test",
      "--server",
      "https://custom.example.com",
      "login",
    ]);

    expect(mockedSaveConfig).toHaveBeenCalledWith(
      expect.objectContaining({
        server_url: "https://custom.example.com",
      }),
    );
  });
});
