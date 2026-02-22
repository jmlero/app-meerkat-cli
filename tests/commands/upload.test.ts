import { describe, it, expect, vi, beforeEach } from "vitest";
import { writeFile, mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { mockUploadResponse, mockInboxItem } from "../helpers.js";

vi.mock("../../src/lib/api-client.js", () => ({
  apiRequest: vi.fn(),
}));

import { apiRequest } from "../../src/lib/api-client.js";
import { Command } from "commander";
import { registerUploadCommand } from "../../src/commands/upload.js";

const mockedApiRequest = vi.mocked(apiRequest);

describe("upload command", () => {
  let program: Command;
  let tempDir: string;

  beforeEach(async () => {
    vi.restoreAllMocks();
    tempDir = await mkdtemp(join(tmpdir(), "meerkat-upload-test-"));

    program = new Command();
    program
      .option("--json")
      .option("--server <url>")
      .option("-v, --verbose");
    registerUploadCommand(program);

    vi.spyOn(process, "exit").mockImplementation(() => {
      throw new Error("process.exit called");
    });
    vi.spyOn(console, "log").mockImplementation(() => {});
    vi.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(async () => {
    await rm(tempDir, { recursive: true, force: true });
  });

  it("uploads a valid file and shows table", async () => {
    const filePath = join(tempDir, "receipt.jpg");
    await writeFile(filePath, Buffer.from("fake-jpg-data"));

    mockedApiRequest.mockResolvedValueOnce(mockUploadResponse());

    await program.parseAsync(["node", "test", "upload", filePath]);

    expect(mockedApiRequest).toHaveBeenCalledWith(
      "/api/v1/inbox/upload",
      expect.objectContaining({ method: "POST" }),
    );
  });

  it("outputs JSON when --json flag is set", async () => {
    const filePath = join(tempDir, "receipt.png");
    await writeFile(filePath, Buffer.from("fake-png-data"));

    mockedApiRequest.mockResolvedValueOnce(mockUploadResponse());
    const logSpy = vi.mocked(console.log);

    await program.parseAsync(["node", "test", "--json", "upload", filePath]);

    // Check that JSON.stringify was used
    const jsonOutput = logSpy.mock.calls.find((call) => {
      try {
        JSON.parse(call[0] as string);
        return true;
      } catch {
        return false;
      }
    });
    expect(jsonOutput).toBeDefined();
  });

  it("rejects unsupported file types", async () => {
    const filePath = join(tempDir, "data.txt");
    await writeFile(filePath, "not a receipt");

    await expect(
      program.parseAsync(["node", "test", "upload", filePath]),
    ).rejects.toThrow("process.exit called");
  });

  it("rejects files that don't exist", async () => {
    await expect(
      program.parseAsync([
        "node",
        "test",
        "upload",
        join(tempDir, "nonexistent.jpg"),
      ]),
    ).rejects.toThrow("process.exit called");
  });

  it("polls for completion with --wait", async () => {
    const filePath = join(tempDir, "receipt.pdf");
    await writeFile(filePath, Buffer.from("fake-pdf-data"));

    const uploadResp = mockUploadResponse();
    const completedItem = mockInboxItem({ status: "done" });

    mockedApiRequest
      .mockResolvedValueOnce(uploadResp) // upload
      .mockResolvedValueOnce(completedItem); // poll

    await program.parseAsync([
      "node",
      "test",
      "upload",
      "--wait",
      filePath,
    ]);

    expect(mockedApiRequest).toHaveBeenCalledWith(
      "/api/v1/inbox/upload",
      expect.objectContaining({ method: "POST" }),
    );
    expect(mockedApiRequest).toHaveBeenCalledWith(
      `/api/v1/inbox/${uploadResp.items[0]!.id}`,
      expect.objectContaining({}),
    );
  });

  it("rejects too many files", async () => {
    const files = [];
    for (let i = 0; i < 21; i++) {
      const filePath = join(tempDir, `receipt-${i}.jpg`);
      await writeFile(filePath, Buffer.from("data"));
      files.push(filePath);
    }

    await expect(
      program.parseAsync(["node", "test", "upload", ...files]),
    ).rejects.toThrow("process.exit called");
  });
});
