export const CommandMaps = {
	help: {
		short: "-h",
		long: "--help",
	},
	version: {
		short: "-v",
		long: "--version",
	},
	watch: {
		short: "-w",
		long: "--watch",
	},
	shame: {
		short: "-s",
		long: "--shame",
	},
	config: {
		short: "-c",
		long: "--config",
	},
	username: {
		short: "-u",
		long: "--username",
	},
	theme: {
		short: "-t",
		long: "--theme",
	},
	noAnimation: {
		short: "-n",
		long: "--no-animation",
		/** Second spelling people reach for; both must work. */
		alias: "--static",
	},
	ascii: {
		short: "-a",
		long: "--ascii",
	},
	export: {
		short: "-e",
		long: "--export",
	},
	out: {
		short: "-o",
		long: "--out",
	},
	gif: {
		short: "-g",
		long: "--gif",
	},
	mute: {
		short: "-m",
		long: "--mute",
	},
	status: {
		/** Uppercase: -s is taken by --shame. */
		short: "-S",
		long: "--status",
	},
	/** Internal: the detached child --status spawns to refresh the cache. Not in HELP. */
	refreshCache: {
		long: "--refresh-cache",
	},
};
