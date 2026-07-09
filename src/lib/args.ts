import { THEMES } from "@/lib/const";
import type { ThemeName } from "@/lib/types";

export interface CliArgs {
  username?: string;
  theme?: ThemeName;
  watch: boolean;
  shame: boolean;
  config: boolean;
  help: boolean;
  version: boolean;
  /** Human-readable problems; if non-empty the CLI prints them and exits 1. */
  errors: string[];
}

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
    errors: [],
  };

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i]!;
    switch (arg) {
      case "-h":
      case "--help":
        args.help = true;
        break;
      case "--version":
        args.version = true;
        break;
      case "-w":
      case "--watch":
        args.watch = true;
        break;
      case "-s":
      case "--shame":
        args.shame = true;
        break;
      case "-c":
      case "--config":
        args.config = true;
        break;
      case "-u":
      case "--username": {
        const value = argv[++i];
        if (value) args.username = value;
        else args.errors.push(`${arg} needs a value`);
        break;
      }
      case "-t":
      case "--theme": {
        const value = argv[++i];
        if (value && THEMES.includes(value as ThemeName)) {
          args.theme = value as ThemeName;
        } else {
          args.errors.push(
            `--theme must be one of: ${THEMES.join(", ")} (got ${value ?? "nothing"})`,
          );
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
