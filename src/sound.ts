import { spawn, spawnSync } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { renderSfx, type SfxName } from "@/lib/sfx";

/**
 * The impure half of play-mode sound: writes the synthesized WAVs (lib/sfx.ts)
 * to tmpdir once, then plays them by spawning the OS audio player per effect.
 * Node has no audio API, so a shell-out is the only zero-dependency route —
 * and the spike says it's a good one: afplay spawns in ~1–6 ms, far under the
 * ~100 ms where a jump blip stops feeling attached to [space].
 *
 * Failure policy is absolute silence: no player found, tmpdir read-only, or a
 * spawn error mid-game all just turn sound off. A beep must never break a run.
 */

export interface Sound {
	/** Fire-and-forget; never throws, never blocks a tick. */
	play(name: SfxName): void;
	/** [m] flips this; --mute starts it true. The files stay warm either way. */
	muted: boolean;
}

/**
 * Which player binary to shell out to, if any. Pure (probe injected) so the
 * per-platform choices stay testable. Windows sits out deliberately: the
 * PowerShell SoundPlayer route spawns in 200 ms+, which fails the latency bar
 * — silent beats sloppy.
 */
export function pickPlayer(platform: NodeJS.Platform, exists: (cmd: string) => boolean): string | null {
	if (platform === "darwin") return "afplay"; // ships with macOS
	if (platform === "linux") return ["paplay", "aplay", "play"].find(exists) ?? null;
	return null;
}

const commandExists = (cmd: string): boolean => spawnSync("which", [cmd], { stdio: "ignore" }).status === 0;

/** A Sound that ignores everything — non-TTY demo runs and failed setups. */
const silent = (): Sound => ({ play: () => {}, muted: true });

/**
 * Set up play-mode sound: synthesize the six WAVs into tmpdir and bind them
 * to the platform's player. `enabled: false` (piped/CI runs) skips even the
 * file writes. Total cost when enabled: ~40 kB of synth + six small writes.
 */
export function createSound(opts: { enabled: boolean; muted?: boolean }): Sound {
	if (!opts.enabled) return silent();
	try {
		const player = pickPlayer(process.platform, commandExists);
		if (player === null) return silent();
		const dir = join(tmpdir(), "termheat-sfx");
		mkdirSync(dir, { recursive: true });
		const files = {} as Record<SfxName, string>;
		for (const [name, bytes] of Object.entries(renderSfx())) {
			const file = join(dir, `${name}.wav`);
			writeFileSync(file, bytes);
			files[name as SfxName] = file;
		}
		let broken = false;
		const sound: Sound = {
			muted: opts.muted ?? false,
			play(name) {
				if (sound.muted || broken) return;
				try {
					const p = spawn(player, [files[name]], { stdio: "ignore" });
					// One bad spawn (player uninstalled mid-run?) disables for good —
					// no error spam, no retry storm at 20 ticks a second.
					p.on("error", () => {
						broken = true;
					});
					p.unref();
				} catch {
					broken = true;
				}
			},
		};
		return sound;
	} catch {
		return silent();
	}
}
