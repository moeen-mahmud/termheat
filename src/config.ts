import { readFile, writeFile } from "node:fs/promises";
import { homedir } from "node:os";
import { join } from "node:path";
import { APP_NAME, THEMES } from "@/lib/const";
import type { TermheatConfig } from "@/lib/schema";
import type { ThemeName } from "@/lib/types";

export class ConfigError extends Error {}

export function configPath(): string {
  return join(homedir(), `.${APP_NAME}.json`);
}

/**
 * Missing file → {} (first run is not an error). Corrupt file → ConfigError
 * (never silently discard settings the user wrote by hand). Unknown keys and
 * wrong-typed values are dropped so a config from a future version still loads.
 */
export async function loadConfig(
  path: string = configPath(),
): Promise<TermheatConfig> {
  let raw: string;
  try {
    raw = await readFile(path, "utf8");
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === "ENOENT") return {};
    throw err;
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new ConfigError(`${path} is not valid JSON — fix or delete it`);
  }
  if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
    throw new ConfigError(`${path} must contain a JSON object`);
  }
  return sanitize(parsed as Record<string, unknown>);
}

export async function saveConfig(
  config: TermheatConfig,
  path: string = configPath(),
): Promise<void> {
  await writeFile(
    path,
    `${JSON.stringify(sanitize({ ...config }), null, 2)}\n`,
    "utf8",
  );
}

function sanitize(raw: Record<string, unknown>): TermheatConfig {
  const config: TermheatConfig = {};
  if (typeof raw.username === "string" && raw.username.length > 0)
    config.username = raw.username;
  if (THEMES.includes(raw.theme as ThemeName))
    config.theme = raw.theme as ThemeName;
  if (typeof raw.refreshMinutes === "number" && raw.refreshMinutes > 0) {
    config.refreshMinutes = raw.refreshMinutes;
  }
  if (typeof raw.shame === "boolean") config.shame = raw.shame;
  return config;
}
