import { describe, expect, test } from "bun:test";
import { mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { ConfigError, loadConfig, saveConfig } from "@/config";

async function tempConfigPath(): Promise<string> {
  return join(await mkdtemp(join(tmpdir(), "termheat-test-")), "config.json");
}

describe("loadConfig", () => {
  test("missing file is a fresh install, not an error", async () => {
    expect(await loadConfig(await tempConfigPath())).toEqual({});
  });

  test("corrupt JSON throws instead of silently dropping user settings", async () => {
    const path = await tempConfigPath();
    await writeFile(path, "{ not json", "utf8");
    expect(loadConfig(path)).rejects.toThrow(ConfigError);
  });

  test("unknown keys and wrong-typed values are dropped", async () => {
    const path = await tempConfigPath();
    await writeFile(
      path,
      JSON.stringify({
        username: "moeen-mahmud",
        theme: "neon-zebra",
        refreshMinutes: -5,
        shame: true,
        futureOption: 42,
      }),
      "utf8",
    );
    expect(await loadConfig(path)).toEqual({
      username: "moeen-mahmud",
      shame: true,
    });
  });
});

describe("saveConfig", () => {
  test("round-trips through disk", async () => {
    const path = await tempConfigPath();
    const config = {
      username: "moeen-mahmud",
      theme: "fire" as const,
      refreshMinutes: 5,
    };
    await saveConfig(config, path);
    expect(await loadConfig(path)).toEqual(config);
  });
});
