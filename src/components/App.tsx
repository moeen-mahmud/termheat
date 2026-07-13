import { Box, Text, useApp, useInput, useStdin, useStdout } from "ink";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Heatmap } from "@/components/Heatmap";
import { StatsBar } from "@/components/StatsBar";
import { fetchContributions, GitHubError } from "@/github";
import { buildHeatmap } from "@/heatmap";
import { useAnimation } from "@/hooks/useAnimation";
import type { ContributionDay } from "@/lib/types";
import { currentStreakDates } from "@/streak";
import {
	APP_NAME,
	APP_VERSION,
	ASCII_SPINNER,
	COLUMN_WIDTH,
	DEFAULT_REFRESH_INTERVAL_SECONDS,
	SPINNER,
	STD_OUT_COLUMNS,
	VISIBLE_HEATMAP_COLUMNS_MIN,
	VISIBLE_HEATMAP_FIT,
} from "@/lib/const";
import type { AppProps } from "@/lib/schema";

export function App({ username, theme, watch, refreshMinutes, shame, animate, ascii }: AppProps) {
	const { exit } = useApp();
	const { isRawModeSupported } = useStdin();
	// Piped / CI stdout: render one static frame and leave.
	const interactive = Boolean(isRawModeSupported);

	const [days, setDays] = useState<ContributionDay[] | null>(null);
	const [error, setError] = useState<string | null>(null);
	const [fetching, setFetching] = useState(true);
	const [revealFrom, setRevealFrom] = useState(0);

	const anim = useAnimation(interactive && animate);
	// Async callbacks would close over a stale tick; a ref tracks the latest.
	const tickRef = useRef(0);
	tickRef.current = anim.tick;

	const load = useCallback(async () => {
		setFetching(true);
		try {
			setDays(await fetchContributions(username));
			setError(null);
			setRevealFrom(tickRef.current); // re-run the reveal wipe on fresh data
		} catch (err) {
			if (!(err instanceof GitHubError)) throw err;
			setError(err.message);
		} finally {
			setFetching(false);
		}
	}, [username]);

	useEffect(() => {
		void load();
	}, [load]);

	useEffect(() => {
		if (!watch) return;
		const id = setInterval(() => void load(), refreshMinutes * DEFAULT_REFRESH_INTERVAL_SECONDS);
		return () => clearInterval(id);
	}, [watch, refreshMinutes, load]);

	// Nothing to show and nothing to retry into: leave with a failing exit code.
	useEffect(() => {
		if (error !== null && days === null && !fetching) {
			exit(new Error(error));
		}
	}, [error, days, fetching, exit]);

	// Non-interactive runs are one-shot: render the fetched frame, then exit.
	useEffect(() => {
		if (!interactive && !fetching && days !== null) exit();
	}, [interactive, fetching, days, exit]);

	useInput(
		(input) => {
			if (input === "q") exit();
			if (input === "r" && !fetching) void load();
		},
		{ isActive: interactive },
	);

	// The grid and streak only change with the data, not with animation frames.
	const heatmap = useMemo(() => (days ? buildHeatmap(days) : null), [days]);
	const streakDates = useMemo(() => (days ? currentStreakDates(days) : []), [days]);

	// Responsive width: show as many *recent* weeks as the terminal fits
	// (6-char row label + 2 chars per week + 1 spill char for month labels).
	const { stdout } = useStdout();
	const [columns, setColumns] = useState(stdout?.columns ?? STD_OUT_COLUMNS);
	useEffect(() => {
		if (!stdout) return;
		const onResize = () => setColumns(stdout.columns ?? 80);
		stdout.on("resize", onResize);
		return () => void stdout.off("resize", onResize);
	}, [stdout]);
	const visibleHeatmap = useMemo(() => {
		if (!heatmap) return null;
		const fit = Math.max(VISIBLE_HEATMAP_FIT, Math.floor((columns - VISIBLE_HEATMAP_COLUMNS_MIN) / COLUMN_WIDTH));
		if (heatmap.weeks.length <= fit) return heatmap;
		return { ...heatmap, weeks: heatmap.weeks.slice(-fit) };
	}, [heatmap, columns]);

	return (
		<Box flexDirection="column" paddingY={1}>
			<Box marginLeft={2} marginBottom={1}>
				<Text bold color={theme.accent}>
					{ascii ? "" : "🔥 "}
					{APP_NAME} v{APP_VERSION}
				</Text>
				<Text> — {username}</Text>
			</Box>

			{days === null || visibleHeatmap === null ? (
				<Box marginLeft={2}>
					{error === null ? (
						<Text dimColor>
							{ascii
								? ASCII_SPINNER[anim.tick % ASCII_SPINNER.length]
								: SPINNER[anim.tick % SPINNER.length]}{" "}
							fetching {username}
							{ascii ? "'s year..." : "’s year…"}
						</Text>
					) : (
						<Text color="red">✖ {error}</Text>
					)}
				</Box>
			) : (
				<>
					<Heatmap
						heatmap={visibleHeatmap}
						theme={theme}
						streakDates={streakDates}
						anim={anim}
						revealFrom={interactive && animate ? revealFrom : null}
						ascii={ascii}
					/>
					<StatsBar
						days={days}
						streakLength={streakDates.length}
						theme={theme}
						shame={shame}
						watch={watch}
						refreshMinutes={refreshMinutes}
						refreshing={fetching}
						interactive={interactive}
						ascii={ascii}
					/>
					{error !== null && (
						<Box marginLeft={2} marginTop={1}>
							<Text color="red">✖ refresh failed: {error}</Text>
						</Box>
					)}
				</>
			)}
		</Box>
	);
}
