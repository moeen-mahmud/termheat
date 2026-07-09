import { render } from "ink";
import { App } from "@/components/App";
import { ConfigError, configPath, loadConfig } from "@/config";
import { parseArgs } from "@/lib/args";
import { THEMES, VERSION } from "@/lib/const";
import type { TermheatConfig } from "@/lib/schema";
import { themeFor } from "@/themes";

const HELP = `
  🔥 termheat — animated terminal heatmap of your GitHub contributions

  Usage: termheat [username] [options]

  Options:
    -u, --username <name>   GitHub username (or set it in ~/.termheat.json)
    -w, --watch             Auto-refresh (default: every 5 minutes)
    -t, --theme <theme>     Color theme: ${THEMES.join(" | ")}
    -s, --shame             Enable gentle shame mode
    -c, --config            Show config file path and contents
    -h, --help              Show this help
    --version               Show version

  Examples:
    npx termheat moeen-mahmud
    npx termheat moeen-mahmud --watch --theme fire --shame

  Tip: set GITHUB_TOKEN for exact counts via the GraphQL API.
`;

const args = parseArgs(process.argv.slice(2));

if (args.errors.length > 0) {
  for (const error of args.errors) console.error(`termheat: ${error}`);
  console.error(HELP);
  process.exit(1);
}
if (args.help) {
  console.log(HELP);
  process.exit(0);
}
if (args.version) {
  console.log(VERSION);
  process.exit(0);
}

let config: TermheatConfig;
try {
  config = await loadConfig();
} catch (err) {
  if (err instanceof ConfigError) {
    console.error(`termheat: ${err.message}`);
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
  console.error("termheat: no username — pass one or set it in the config");
  console.error(HELP);
  process.exit(1);
}

const { waitUntilExit } = render(
  <App
    username={username}
    theme={themeFor(args.theme ?? config.theme ?? "github")}
    watch={args.watch}
    refreshMinutes={config.refreshMinutes ?? 5}
    shame={args.shame || config.shame === true}
  />,
);

try {
  await waitUntilExit();
} catch (err) {
  // App already rendered the error; just report failure via the exit code.
  process.exitCode = 1;
  if (!(err instanceof Error)) console.error(err);
}
