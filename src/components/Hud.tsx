import { MONTHS } from "@/lib/const";
import { type createEngine, speedAt } from "@/lib/engine";
import { HEART_COLOR, HUD_INPUT } from "@/lib/game-consts";
import { GAME_EMOS, GAME_ICONS } from "@/lib/icons";
import type { GameProps } from "@/lib/schema";
import { deathLine } from "@/lib/shame";
import { shareCard } from "@/lib/share";
import { FIRE_RAMP } from "@/themes";
import { Box, Text } from "ink";

export function Hud({
	w,
	level,
	username,
	accent,
	shame,
}: {
	w: ReturnType<typeof createEngine>;
	level: GameProps["level"];
	username: string;
	accent: string;
	shame: boolean;
}) {
	const hearts =
		GAME_ICONS.heart.repeat(w.hearts) + GAME_ICONS.heartEmpty.repeat(Math.max(0, w.heartsMax - w.hearts));

	if (w.status === "won") {
		return (
			<Box flexDirection="column">
				<Text color={accent}>
					{`${GAME_EMOS.finish} You made it to today, ${username}! Copy your run · [${HUD_INPUT.quit}] quit`}
				</Text>
				<Text>{shareCard(w, level, username)}</Text>
			</Box>
		);
	}

	if (w.status === "dead" || w.status === "over") {
		const date = level.columns[w.deathColumn ?? 0]?.date ?? "";
		const line = deathLine(date, w.deathCause ?? "pit", shame);
		if (w.status === "over") {
			// A lost run still shares — Wordle's X/6 posts travel just as far.
			return (
				<Box flexDirection="column">
					<Text color={FIRE_RAMP[0]}>
						{`${GAME_ICONS.bug} ${line} Out of hearts · [${HUD_INPUT.restart}] restart from January · [${HUD_INPUT.quit}] quit`}
					</Text>
					<Text>{shareCard(w, level, username)}</Text>
				</Box>
			);
		}
		return (
			<Text
				color={FIRE_RAMP[0]}
			>{`${GAME_EMOS.skull} ${line} · ${hearts} · [${HUD_INPUT.restart}] respawn · [${HUD_INPUT.quit}] quit`}</Text>
		);
	}

	// "Jul '25" — the level spans two calendar years, so the month alone is ambiguous.
	const date = level.columns[Math.floor(w.x)]?.date ?? "";
	const month = date ? `${MONTHS[Number(date.slice(5, 7)) - 1] ?? ""} '${date.slice(2, 4)}` : "";
	return (
		<Text>
			<Text color={HEART_COLOR}>{hearts}</Text>
			{` · ${GAME_EMOS.flame} ${w.flames}/${level.flameTotal} · ${month} · ${GAME_ICONS.bolt} ${speedAt(w.elapsed).toFixed(1)} · [space] jump ×2 · [${HUD_INPUT.quit}] quit`}
		</Text>
	);
}
