import { render } from "ink";
import { App } from "@/components/App";
import { ConfigError, configPath, loadConfig } from "@/config";
import { HELP, parseArgs } from "@/lib/args";
import { APP_NAME, APP_VERSION, DEFAULT_THEME } from "@/lib/const";
import { NO_COLOR } from "@/lib/env";
import type { TermheatConfig } from "@/lib/schema";
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

const { waitUntilExit } = render(
	<App
		username={username}
		theme={themeFor(args.theme ?? config.theme ?? DEFAULT_THEME)}
		watch={args.watch}
		refreshMinutes={config.refreshMinutes ?? 5}
		shame={args.shame || config.shame === true}
		animate={!args.noAnimation && !NO_COLOR}
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
