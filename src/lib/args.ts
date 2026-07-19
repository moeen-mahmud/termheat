import { CommandMaps } from "@/lib/commands";
import { APP_NAME, APP_VERSION, EXPORT_FORMATS, THEMES } from "@/lib/const";
import type { CliArgs } from "@/lib/schema";
import type { ExportFormat, ThemeName } from "@/lib/types";

export const HELP = `
  🔥 ${APP_NAME} v${APP_VERSION} — animated terminal heatmap of your GitHub contributions

  Usage: ${APP_NAME} [username] [options]
         ${APP_NAME} play [username]

  Commands:
    play                  🎮 Play your year — a platformer where your
                          contribution graph is the level. [space] jump.
                          With ${CommandMaps.export.long}, writes your run card when the run ends;
                          with ${CommandMaps.gif.long}, saves the whole run as a replay GIF.

  Options:
    ${CommandMaps.username.short}, ${CommandMaps.username.long} <name>   GitHub username (or set it in ~/.${APP_NAME}.json)
    ${CommandMaps.watch.short}, ${CommandMaps.watch.long}             Auto-refresh (default: every 5 minutes)
    ${CommandMaps.theme.short}, ${CommandMaps.theme.long} <theme>     Color theme: ${THEMES.join(" | ")}
    ${CommandMaps.shame.short}, ${CommandMaps.shame.long}             Enable gentle shame mode
    ${CommandMaps.noAnimation.short}, ${CommandMaps.noAnimation.long}      Render one static frame (alias: ${CommandMaps.noAnimation.alias})
    ${CommandMaps.ascii.short}, ${CommandMaps.ascii.long}             ASCII-only output for basic terminals and fonts
    ${CommandMaps.export.short}, ${CommandMaps.export.long} <fmt>      Write a shareable animated card: ${EXPORT_FORMATS.join(" | ")}
    ${CommandMaps.out.short}, ${CommandMaps.out.long} <file>        Where ${CommandMaps.export.long} writes (default: ./${APP_NAME}-<user>.<fmt>)
    ${CommandMaps.status.short}, ${CommandMaps.status.long}            Cached one-line status for tmux/starship: 🔥 37d ▁▃▅█▇
    ${CommandMaps.config.short}, ${CommandMaps.config.long}            Show config file path and contents
    ${CommandMaps.help.short}, ${CommandMaps.help.long}              Show this help
    ${CommandMaps.version.short}, ${CommandMaps.version.long}           Show version

  Examples:
    npx ${APP_NAME} <your-username>
    npx ${APP_NAME} <your-username> ${CommandMaps.watch.long} ${CommandMaps.theme.long} fire ${CommandMaps.shame.long}
    npx ${APP_NAME} play <your-username>

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
		status: false,
		refreshCache: false,
		gif: false,
		errors: [],
	};

	// Subcommand verbs are consumed before the flag loop, so the rest of the
	// grammar (bare positional = username, flags anywhere) applies unchanged.
	// Future verbs (wrapped, zen) extend this same check.
	if (argv[0] === "play") {
		args.command = "play";
		argv = argv.slice(1);
	}

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
			case CommandMaps.status.short:
			case CommandMaps.status.long:
				args.status = true;
				break;
			case CommandMaps.refreshCache.long:
				args.refreshCache = true;
				break;
			case CommandMaps.gif.short:
			case CommandMaps.gif.long:
				args.gif = true;
				break;
			case CommandMaps.export.short:
			case CommandMaps.export.long: {
				const value = argv[++i];
				if (value && EXPORT_FORMATS.includes(value as ExportFormat)) {
					args.export = value as ExportFormat;
				} else {
					args.errors.push(
						`${CommandMaps.export.long} must be one of: ${EXPORT_FORMATS.join(", ")} (got ${value ?? "nothing"})`,
					);
				}
				break;
			}
			case CommandMaps.out.short:
			case CommandMaps.out.long: {
				const value = argv[++i];
				if (value) args.out = value;
				else args.errors.push(`${arg} needs a value`);
				break;
			}
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

	// Cross-flag rules live here (not index.tsx) so they stay unit-testable.
	if (args.out && !args.export && !args.gif) {
		args.errors.push(`${CommandMaps.out.long} requires ${CommandMaps.export.long} or ${CommandMaps.gif.long}`);
	}
	if (args.out && args.export && args.gif) {
		args.errors.push(
			`${CommandMaps.out.long} is ambiguous with both ${CommandMaps.export.long} and ${CommandMaps.gif.long} — drop it and keep the default names`,
		);
	}
	if (args.gif && args.command !== "play") {
		args.errors.push(
			`${CommandMaps.gif.long} records a play run — try: ${APP_NAME} play <user> ${CommandMaps.gif.long}`,
		);
	}
	if (args.status && args.export) {
		args.errors.push(`${CommandMaps.status.long} and ${CommandMaps.export.long} are different modes — pick one`);
	}
	// --export DOES apply to play (it writes the end-of-run card), so only the
	// modes that replace the TUI entirely are rejected.
	if (args.command === "play") {
		for (const [flag, set] of [
			[CommandMaps.status.long, args.status],
			[CommandMaps.watch.long, args.watch],
		] as const) {
			if (set) args.errors.push(`${flag} doesn't apply to play`);
		}
	}

	return args;
}
