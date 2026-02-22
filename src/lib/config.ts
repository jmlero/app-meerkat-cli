import { mkdir, readFile, writeFile, unlink, chmod } from "node:fs/promises";
import { homedir } from "node:os";
import { join } from "node:path";
import type { StoredConfig, StoredCredentials } from "../types.js";

export function getConfigDir(): string {
  return (
    process.env.MEERKAT_CONFIG_DIR ?? join(homedir(), ".config", "meerkat")
  );
}

export function configPath(): string {
  return join(getConfigDir(), "config.json");
}

export function credentialsPath(): string {
  return join(getConfigDir(), "credentials.json");
}

async function ensureConfigDir(): Promise<void> {
  await mkdir(getConfigDir(), { recursive: true });
}

export async function loadConfig(): Promise<StoredConfig | null> {
  try {
    const data = await readFile(configPath(), "utf-8");
    return JSON.parse(data) as StoredConfig;
  } catch {
    return null;
  }
}

export async function saveConfig(config: StoredConfig): Promise<void> {
  await ensureConfigDir();
  await writeFile(configPath(), JSON.stringify(config, null, 2), "utf-8");
}

export async function loadCredentials(): Promise<StoredCredentials | null> {
  try {
    const data = await readFile(credentialsPath(), "utf-8");
    return JSON.parse(data) as StoredCredentials;
  } catch {
    return null;
  }
}

export async function saveCredentials(
  credentials: StoredCredentials,
): Promise<void> {
  await ensureConfigDir();
  const filePath = credentialsPath();
  await writeFile(filePath, JSON.stringify(credentials, null, 2), "utf-8");
  await chmod(filePath, 0o600);
}

export async function deleteCredentials(): Promise<void> {
  try {
    await unlink(credentialsPath());
  } catch {
    // ignore if file doesn't exist
  }
}
