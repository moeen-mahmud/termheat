import { CommandMaps } from "@/lib/commands";
import { APP_NAME, APP_VERSION, THEMES } from "@/lib/const";
import type { CliArgs } from "@/lib/schema";
import type { ThemeName } from "@/lib/types";

export const HELP = `
  🔥 ${APP_NAME} v${APP_VERSION} — animated terminal heatmap of your GitHub contributions

  Usage: ${APP_NAME} [username] [options]

  Options:
    ${CommandMaps.username.short}, ${CommandMaps.username.long} <name>   GitHub username (or set it in ~/.${APP_NAME}.json)
    ${CommandMaps.watch.short}, ${CommandMaps.watch.long}             Auto-refresh (default: every 5 minutes)
    ${CommandMaps.theme.short}, ${CommandMaps.theme.long} <theme>     Color theme: ${THEMES.join(" | ")}
    ${CommandMaps.shame.short}, ${CommandMaps.shame.long}             Enable gentle shame mode
    ${CommandMaps.noAnimation.short}, ${CommandMaps.noAnimation.long}      Render one static frame (alias: ${CommandMaps.noAnimation.alias})
    ${CommandMaps.ascii.short}, ${CommandMaps.ascii.long}             ASCII-only output for basic terminals and fonts
    ${CommandMaps.config.short}, ${CommandMaps.config.long}            Show config file path and contents
    ${CommandMaps.help.short}, ${CommandMaps.help.long}              Show this help
    ${CommandMaps.version.short}, ${CommandMaps.version.long}               Show version

  Examples:
    npx ${APP_NAME} <your-username>
    npx ${APP_NAME} <your-username> ${CommandMaps.watch.long} ${CommandMaps.theme.long} fire ${CommandMaps.shame.long}

  Tip: set GITHUB_TOKEN for exact counts via the GraphQL API.
  Honors NO_COLOR (https://no-color.org) — implies ${CommandMaps.ascii.long} + ${CommandMaps.noAnimation.long}.
`;

/**
 * Parses argv (already stripped of the runtime and script entries). Kept as a
 * pure function — no process, no exit — so the flag surface is unit-testable.
 */
export function parseArgs(argv: string[]): CliArgs {
	const args: CliArgs = {
		watch: false,
		shame: false,
		config: false,
		help: false,
		version: false,
		noAnimation: false,
		ascii: false,
		errors: [],
	};

	for (let i = 0; i < argv.length; i++) {
		const arg = argv[i]!;
		switch (arg) {
			case CommandMaps.help.short:
			case CommandMaps.help.long:
				args.help = true;
				break;
			case CommandMaps.version.short:
			case CommandMaps.version.long:
				args.version = true;
				break;
			case CommandMaps.watch.short:
			case CommandMaps.watch.long:
				args.watch = true;
				break;
			case CommandMaps.shame.short:
			case CommandMaps.shame.long:
				args.shame = true;
				break;
			case CommandMaps.config.short:
			case CommandMaps.config.long:
				args.config = true;
				break;
			case CommandMaps.noAnimation.short:
			case CommandMaps.noAnimation.long:
			case CommandMaps.noAnimation.alias:
				args.noAnimation = true;
				break;
			case CommandMaps.ascii.short:
			case CommandMaps.ascii.long:
				args.ascii = true;
				break;
			case CommandMaps.username.short:
			case CommandMaps.username.long: {
				const value = argv[++i];
				if (value) args.username = value;
				else args.errors.push(`${arg} needs a value`);
				break;
			}
			case CommandMaps.theme.short:
			case CommandMaps.theme.long: {
				const value = argv[++i];
				if (value && THEMES.includes(value as ThemeName)) {
					args.theme = value as ThemeName;
				} else {
					args.errors.push(`--theme must be one of: ${THEMES.join(", ")} (got ${value ?? "nothing"})`);
				}
				break;
			}
			default:
				if (arg.startsWith("-")) {
					args.errors.push(`unknown flag: ${arg}`);
				} else if (args.username === undefined) {
					args.username = arg; // bare positional = username
				} else {
					args.errors.push(`unexpected argument: ${arg}`);
				}
		}
	}

	return args;
}
