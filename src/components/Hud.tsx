import { MONTHS } from "@/lib/const";
import { type createEngine, speedAt } from "@/lib/engine";
import type { GameProps } from "@/lib/schema";
import { FIRE_RAMP } from "@/themes";
import { Text } from "ink";

export function Hud({
	w,
	level,
	username,
	accent,
}: {
	w: ReturnType<typeof createEngine>;
	level: GameProps["level"];
	username: string;
	accent: string;
}) {
	if (w.status === "won") {
		return (
			<Text color={accent}>
				{`🏁 You made it to today, ${username}! 🔥 ${w.flames}/${level.flameTotal} flames · 💀 ${w.deaths} ${w.deaths === 1 ? "death" : "deaths"} · [q] quit`}
			</Text>
		);
	}
	if (w.status === "dead") {
		const date = level.columns[w.deathColumn ?? 0]?.date ?? "";
		const cause = w.deathCause === "pit" ? "a zero-day swallowed you" : "you hit a wall";
		return <Text color={FIRE_RAMP[0]}>{`💀 ${date}: ${cause} · [r] respawn · [q] quit`}</Text>;
	}
	const month = MONTHS[Number(level.columns[Math.floor(w.x)]?.date.slice(5, 7)) - 1] ?? "";
	return (
		<Text>
			{`🔥 ${w.flames}/${level.flameTotal} · ${month} · ⚡ ${speedAt(w.elapsed).toFixed(1)} · 💀 ${w.deaths} · [space] jump ×2 · [q] quit`}
		</Text>
	);
}
