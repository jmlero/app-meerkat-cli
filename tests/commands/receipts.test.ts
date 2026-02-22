import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  mockReceiptsResponse,
  mockReceipt,
  mockReceiptProduct,
  mockSupermarketsResponse,
} from "../helpers.js";

vi.mock("../../src/lib/api-client.js", () => ({
  apiRequest: vi.fn(),
}));

import { apiRequest } from "../../src/lib/api-client.js";
import { Command } from "commander";
import { registerReceiptsCommand } from "../../src/commands/receipts.js";

const mockedApiRequest = vi.mocked(apiRequest);

describe("receipts command", () => {
  let program: Command;

  beforeEach(() => {
    vi.restoreAllMocks();
    program = new Command();
    program
      .option("--json")
      .option("--server <url>")
      .option("-v, --verbose");
    registerReceiptsCommand(program);

    vi.spyOn(process, "exit").mockImplementation(() => {
      throw new Error("process.exit called");
    });
    vi.spyOn(console, "log").mockImplementation(() => {});
    vi.spyOn(console, "error").mockImplementation(() => {});
  });

  function setupListMocks(overrides?: {
    receiptsResponse?: ReturnType<typeof mockReceiptsResponse>;
    supermarketsResponse?: ReturnType<typeof mockSupermarketsResponse>;
  }) {
    const receipts = overrides?.receiptsResponse ?? mockReceiptsResponse();
    const supermarkets = overrides?.supermarketsResponse ?? mockSupermarketsResponse();

    mockedApiRequest.mockResolvedValueOnce(receipts);
    mockedApiRequest.mockResolvedValueOnce(supermarkets);
  }

  function setupShowMocks(overrides?: {
    receipt?: ReturnType<typeof mockReceipt>;
    supermarketsResponse?: ReturnType<typeof mockSupermarketsResponse>;
  }) {
    const receipt = overrides?.receipt ?? mockReceipt();
    const supermarkets = overrides?.supermarketsResponse ?? mockSupermarketsResponse();

    mockedApiRequest.mockResolvedValueOnce(receipt);
    mockedApiRequest.mockResolvedValueOnce(supermarkets);
  }

  describe("list", () => {
    it("lists receipts in table format with store names and currency", async () => {
      setupListMocks();

      const logSpy = vi.mocked(console.log);

      await program.parseAsync(["node", "test", "receipts"]);

      expect(mockedApiRequest).toHaveBeenCalledWith(
        "/api/v1/receipts/recent?limit=50&offset=0",
        expect.objectContaining({}),
      );

      const allOutput = logSpy.mock.calls.map((c) => c[0]).join("\n");
      expect(allOutput).toContain("101");
      expect(allOutput).toContain("Mercadona");
      expect(allOutput).toContain("€42.50");
    });

    it("outputs JSON with --json flag", async () => {
      setupListMocks();

      const logSpy = vi.mocked(console.log);

      await program.parseAsync(["node", "test", "--json", "receipts"]);

      const jsonCall = logSpy.mock.calls.find((call) => {
        try {
          const parsed = JSON.parse(call[0] as string);
          return parsed.items !== undefined;
        } catch {
          return false;
        }
      });
      expect(jsonCall).toBeDefined();
    });

    it("handles empty receipts list", async () => {
      setupListMocks({
        receiptsResponse: mockReceiptsResponse({ items: [], total: 0 }),
      });

      const logSpy = vi.mocked(console.log);

      await program.parseAsync(["node", "test", "receipts"]);

      const allOutput = logSpy.mock.calls.map((c) => c[0]).join("\n");
      expect(allOutput).toContain("No receipts found");
    });

    it("passes custom limit and offset", async () => {
      setupListMocks();

      await program.parseAsync([
        "node", "test", "receipts", "list", "--limit", "10", "--offset", "20",
      ]);

      expect(mockedApiRequest).toHaveBeenCalledWith(
        "/api/v1/receipts/recent?limit=10&offset=20",
        expect.objectContaining({}),
      );
    });

    it("handles API errors", async () => {
      mockedApiRequest.mockRejectedValueOnce(new Error("Network error"));

      await expect(
        program.parseAsync(["node", "test", "receipts"]),
      ).rejects.toThrow("process.exit called");
    });

    it("falls back to supermarket ID when supermarkets API fails", async () => {
      const receipts = mockReceiptsResponse();
      mockedApiRequest.mockResolvedValueOnce(receipts);
      mockedApiRequest.mockRejectedValueOnce(new Error("Supermarkets API error"));

      const logSpy = vi.mocked(console.log);

      await program.parseAsync(["node", "test", "receipts"]);

      const allOutput = logSpy.mock.calls.map((c) => c[0]).join("\n");
      expect(allOutput).toContain("5");
    });
  });

  describe("show", () => {
    it("shows receipt detail with store name and formatted prices", async () => {
      setupShowMocks({
        receipt: mockReceipt({
          products: [
            mockReceiptProduct({ name: "Milk", price: 3.49, quantity: 2, unit_price: 1.745 }),
            mockReceiptProduct({ id: 2, name: "Bread", price: 2.0, quantity: 1, unit_price: 2.0 }),
          ],
        }),
      });

      const logSpy = vi.mocked(console.log);

      await program.parseAsync(["node", "test", "receipts", "show", "101"]);

      expect(mockedApiRequest).toHaveBeenCalledWith(
        "/api/v1/receipts/101",
        expect.objectContaining({}),
      );

      const allOutput = logSpy.mock.calls.map((c) => c[0]).join("\n");
      expect(allOutput).toContain("Milk");
      expect(allOutput).toContain("Bread");
      expect(allOutput).toContain("Mercadona");
      expect(allOutput).toContain("€42.50");
    });

    it("outputs JSON with --json flag", async () => {
      setupShowMocks();

      const logSpy = vi.mocked(console.log);

      await program.parseAsync(["node", "test", "--json", "receipts", "show", "101"]);

      const jsonCall = logSpy.mock.calls.find((call) => {
        try {
          const parsed = JSON.parse(call[0] as string);
          return parsed.id !== undefined;
        } catch {
          return false;
        }
      });
      expect(jsonCall).toBeDefined();
    });

    it("handles API errors", async () => {
      mockedApiRequest.mockRejectedValueOnce(new Error("Not found"));

      await expect(
        program.parseAsync(["node", "test", "receipts", "show", "999"]),
      ).rejects.toThrow("process.exit called");
    });
  });
});
