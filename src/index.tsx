import { spawn } from "node:child_process";
import { ConfigError, configPath, loadConfig } from "@/config";
import { ExportError, exportCard } from "@/export";
import { fetchContributions, GitHubError } from "@/github";
import { HELP, parseArgs } from "@/lib/args";
import { APP_NAME, APP_VERSION, DEFAULT_THEME, STATUS_TTL_MINUTES } from "@/lib/const";
import { NO_COLOR } from "@/lib/env";
import type { TermheatConfig } from "@/lib/schema";
import { isStale, readCache, statusLine, writeCacheEntry } from "@/status";
import { themeFor } from "@/themes";

const args = parseArgs(process.argv.slice(2));

if (args.errors.length > 0) {
	for (const error of args.errors) console.error(`${APP_NAME}: ${error}`);
	console.error(HELP);
	process.exit(1);
}
if (args.help) {
	console.log(HELP);
	process.exit(0);
}
if (args.version) {
	console.log(APP_VERSION);
	process.exit(0);
}

let config: TermheatConfig;
try {
	config = await loadConfig();
} catch (err) {
	if (err instanceof ConfigError) {
		console.error(`${APP_NAME}: ${err.message}`);
		process.exit(1);
	}
	throw err;
}

if (args.config) {
	console.log(configPath());
	console.log(JSON.stringify(config, null, 2));
	process.exit(0);
}

// Precedence: flags > ~/.termheat.json > defaults.
const username = args.username ?? config.username;
if (!username) {
	console.error(`${APP_NAME}: no username — pass one or set it in the config`);
	console.error(HELP);
	process.exit(1);
}

const theme = themeFor(args.theme ?? config.theme ?? DEFAULT_THEME);
const animate = !args.noAnimation && !NO_COLOR;

// Internal mode spawned by --status: refetch, rewrite the cache, exit. Any
// failure is silent by design — the next status call just serves stale data.
if (args.refreshCache) {
	try {
		await writeCacheEntry(username, await fetchContributions(username));
	} catch {
		process.exit(1);
	}
	process.exit(0);
}

// --status: print from cache in one hop (tmux/starship call this every few
// seconds), refresh out-of-band. Only a cold cache waits on the network.
if (args.status) {
	const ascii = args.ascii || NO_COLOR;
	const cache = await readCache();
	const entry = cache[username];
	if (entry) {
		console.log(statusLine(entry.days, { ascii }));
		if (isStale(entry, STATUS_TTL_MINUTES)) {
			spawn(process.execPath, [process.argv[1]!, username, "--refresh-cache"], {
				detached: true,
				stdio: "ignore",
			}).unref();
		}
		process.exit(0);
	}
	try {
		const days = await fetchContributions(username);
		await writeCacheEntry(username, days);
		console.log(statusLine(days, { ascii }));
		process.exit(0);
	} catch (err) {
		if (err instanceof GitHubError) {
			console.error(`${APP_NAME}: ${err.message}`);
			process.exit(1);
		}
		throw err;
	}
}

// --export bypasses Ink entirely: fetch, write the card, exit.
if (args.export) {
	try {
		const days = await fetchContributions(username);
		const path = await exportCard({
			format: args.export,
			username,
			days,
			theme,
			animate,
			out: args.out,
		});
		console.log(path);
		process.exit(0);
	} catch (err) {
		if (err instanceof ExportError || err instanceof GitHubError) {
			console.error(`${APP_NAME}: ${err.message}`);
			process.exit(1);
		}
		throw err;
	}
}

// Ink + React load lazily so the fast paths above (--status especially, which
// tmux calls every minute) never pay their module-init cost. Paired with
// --splitting in build:node, they land in a chunk this line alone pulls in.
const [{ render }, { App }] = await Promise.all([import("ink"), import("@/components/App")]);

const { waitUntilExit } = render(
	<App
		username={username}
		theme={theme}
		watch={args.watch}
		refreshMinutes={config.refreshMinutes ?? 5}
		shame={args.shame || config.shame === true}
		animate={animate}
		ascii={args.ascii || NO_COLOR}
	/>,
);

try {
	await waitUntilExit();
} catch (err) {
	// App already rendered the error; just report failure via the exit code.
	process.exitCode = 1;
	if (!(err instanceof Error)) console.error(err);
}
