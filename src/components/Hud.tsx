import { MONTHS } from "@/lib/const";
import { type createEngine, speedAt } from "@/lib/engine";
import { HUD_INPUT } from "@/lib/game-consts";
import { GAME_EMOS, GAME_ICONS } from "@/lib/icons";
import type { GameProps } from "@/lib/schema";
import { deathLine } from "@/lib/shame";
import { FIRE_RAMP } from "@/themes";
import { Text } from "ink";

/** GitHub's danger red — hearts must not read as collectible flames. */
const HEART_COLOR = "#f85149";

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
			<Text color={accent}>
				{`${GAME_EMOS.finish} You made it to today, ${username}! ${GAME_EMOS.flame} ${w.flames}/${level.flameTotal} flames · ${GAME_EMOS.skull} ${w.deaths} ${w.deaths === 1 ? "death" : "deaths"} · [${HUD_INPUT.quit}] quit`}
			</Text>
		);
	}

	if (w.status === "dead" || w.status === "over") {
		const date = level.columns[w.deathColumn ?? 0]?.date ?? "";
		const line = deathLine(date, w.deathCause ?? "pit", shame);
		if (w.status === "over") {
			return (
				<Text color={FIRE_RAMP[0]}>
					{`${GAME_ICONS.bug} ${line} Out of hearts — ${GAME_EMOS.heart} ${w.flames}/${level.flameTotal}, ${GAME_EMOS.skull} ${w.deaths} · [r] restart from January · [${HUD_INPUT.quit}] quit`}
				</Text>
			);
		}
		return (
			<Text
				color={FIRE_RAMP[0]}
			>{`${GAME_EMOS.skull} ${line} · ${hearts} · [${HUD_INPUT.restart}] respawn · [${HUD_INPUT.quit}] quit`}</Text>
		);
	}

	const month = MONTHS[Number(level.columns[Math.floor(w.x)]?.date.slice(5, 7)) - 1] ?? "";
	return (
		<Text>
			<Text color={HEART_COLOR}>{hearts}</Text>
			{` · ${GAME_EMOS.flame} ${w.flames}/${level.flameTotal} · ${month} · ${GAME_ICONS.bolt} ${speedAt(w.elapsed).toFixed(1)} · [space] jump ×2 · [${HUD_INPUT.quit}] quit`}
		</Text>
	);
}
