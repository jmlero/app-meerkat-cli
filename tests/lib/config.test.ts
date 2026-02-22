import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mkdtemp, rm, readFile, stat } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  loadConfig,
  saveConfig,
  loadCredentials,
  saveCredentials,
  deleteCredentials,
} from "../../src/lib/config.js";
import { mockConfig, mockCredentials } from "../helpers.js";

describe("config", () => {
  let tempDir: string;
  const originalEnv = process.env.MEERKAT_CONFIG_DIR;

  beforeEach(async () => {
    tempDir = await mkdtemp(join(tmpdir(), "meerkat-test-"));
    process.env.MEERKAT_CONFIG_DIR = tempDir;
  });

  afterEach(async () => {
    if (originalEnv === undefined) {
      delete process.env.MEERKAT_CONFIG_DIR;
    } else {
      process.env.MEERKAT_CONFIG_DIR = originalEnv;
    }
    await rm(tempDir, { recursive: true, force: true });
  });

  describe("config.json", () => {
    it("returns null when no config exists", async () => {
      const config = await loadConfig();
      expect(config).toBeNull();
    });

    it("round-trips config save/load", async () => {
      const config = mockConfig();
      await saveConfig(config);
      const loaded = await loadConfig();
      expect(loaded).toEqual(config);
    });
  });

  describe("credentials.json", () => {
    it("returns null when no credentials exist", async () => {
      const creds = await loadCredentials();
      expect(creds).toBeNull();
    });

    it("round-trips credentials save/load", async () => {
      const creds = mockCredentials();
      await saveCredentials(creds);
      const loaded = await loadCredentials();
      expect(loaded).toEqual(creds);
    });

    it("sets 0o600 permissions on credentials file", async () => {
      await saveCredentials(mockCredentials());
      const fileStat = await stat(join(tempDir, "credentials.json"));
      const mode = fileStat.mode & 0o777;
      expect(mode).toBe(0o600);
    });

    it("deletes credentials", async () => {
      await saveCredentials(mockCredentials());
      await deleteCredentials();
      const loaded = await loadCredentials();
      expect(loaded).toBeNull();
    });

    it("deleteCredentials is safe when file doesn't exist", async () => {
      await expect(deleteCredentials()).resolves.not.toThrow();
    });
  });
});
