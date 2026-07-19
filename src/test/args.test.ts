import { describe, expect, test } from "bun:test";
import { parseArgs } from "@/lib/args";

describe("parseArgs", () => {
	test("bare positional becomes the username", () => {
		expect(parseArgs(["moeen-mahmud"]).username).toBe("moeen-mahmud");
	});

	test("-u flag also sets the username", () => {
		expect(parseArgs(["-u", "octocat"]).username).toBe("octocat");
	});

	test("boolean flags combine", () => {
		const args = parseArgs(["octocat", "--watch", "-s"]);
		expect(args.watch).toBe(true);
		expect(args.shame).toBe(true);
		expect(args.errors).toEqual([]);
	});

	test("valid theme is accepted", () => {
		expect(parseArgs(["-t", "fire"]).theme).toBe("fire");
	});

	test("invalid theme is an error, not a silent default", () => {
		const args = parseArgs(["--theme", "lava"]);
		expect(args.theme).toBeUndefined();
		expect(args.errors[0]).toContain("lava");
	});

	test("flag missing its value is an error", () => {
		expect(parseArgs(["--username"]).errors[0]).toContain("--username");
	});

	test("unknown flag is an error", () => {
		expect(parseArgs(["--frobnicate"]).errors[0]).toContain("--frobnicate");
	});

	test("second positional is rejected", () => {
		expect(parseArgs(["one", "two"]).errors[0]).toContain("two");
	});

	test("help and version are recognized", () => {
		expect(parseArgs(["-h"]).help).toBe(true);
		expect(parseArgs(["--version"]).version).toBe(true);
	});

	test("all three no-animation spellings work", () => {
		expect(parseArgs(["-n"]).noAnimation).toBe(true);
		expect(parseArgs(["--no-animation"]).noAnimation).toBe(true);
		expect(parseArgs(["--static"]).noAnimation).toBe(true);
		expect(parseArgs([]).noAnimation).toBe(false);
	});

	test("ascii flag is recognized", () => {
		expect(parseArgs(["-a"]).ascii).toBe(true);
		expect(parseArgs(["--ascii"]).ascii).toBe(true);
		expect(parseArgs([]).ascii).toBe(false);
	});

	test("valid export format is accepted, short and long", () => {
		expect(parseArgs(["-e", "svg"]).export).toBe("svg");
		expect(parseArgs(["--export", "png"]).export).toBe("png");
	});

	test("invalid export format is an error naming the valid ones", () => {
		const args = parseArgs(["--export", "gif"]);
		expect(args.export).toBeUndefined();
		expect(args.errors[0]).toContain("svg, png");
		expect(args.errors[0]).toContain("gif");
	});

	test("export missing its value is an error, not a throw", () => {
		expect(parseArgs(["--export"]).errors[0]).toContain("--export");
	});

	test("out flag takes a path, errors without one", () => {
		expect(parseArgs(["-o", "card.svg"]).out).toBe("card.svg");
		expect(parseArgs(["--out"]).errors[0]).toContain("--out");
	});

	test("status flag is recognized", () => {
		expect(parseArgs(["-S"]).status).toBe(true);
		expect(parseArgs(["--status"]).status).toBe(true);
		expect(parseArgs([]).status).toBe(false);
	});

	test("export doesn't swallow a following positional username", () => {
		const args = parseArgs(["--export", "svg", "octocat"]);
		expect(args.username).toBe("octocat");
		expect(args.export).toBe("svg");
		expect(args.errors).toEqual([]);
	});

	test("--out without --export is an error", () => {
		expect(parseArgs(["-o", "card.svg"]).errors[0]).toContain("--export");
	});

	test("--status and --export together are an error", () => {
		expect(parseArgs(["-S", "-e", "svg"]).errors[0]).toContain("pick one");
	});

	test("robustness flags don't swallow a following username", () => {
		const args = parseArgs(["--static", "octocat", "--ascii"]);
		expect(args.username).toBe("octocat");
		expect(args.noAnimation).toBe(true);
		expect(args.ascii).toBe(true);
		expect(args.errors).toEqual([]);
	});
});

describe("parseArgs: play subcommand", () => {
	test("play verb is consumed, next positional is the username", () => {
		const args = parseArgs(["play", "octocat"]);
		expect(args.command).toBe("play");
		expect(args.username).toBe("octocat");
		expect(args.errors).toEqual([]);
	});

	test("play works with no username (config may supply it)", () => {
		const args = parseArgs(["play"]);
		expect(args.command).toBe("play");
		expect(args.username).toBeUndefined();
		expect(args.errors).toEqual([]);
	});

	test("play composes with flags", () => {
		const args = parseArgs(["play", "octocat", "--theme", "fire"]);
		expect(args.command).toBe("play");
		expect(args.theme).toBe("fire");
		expect(args.errors).toEqual([]);
	});

	test("'play' only counts as a verb in first position", () => {
		const args = parseArgs(["octocat", "play"]);
		expect(args.command).toBeUndefined();
		expect(args.errors[0]).toContain("play"); // second positional, rejected
	});

	test("modes that bypass the TUI don't apply to play", () => {
		expect(parseArgs(["play", "-e", "svg"]).errors[0]).toContain("play");
		expect(parseArgs(["play", "-S"]).errors[0]).toContain("play");
		expect(parseArgs(["play", "-w"]).errors[0]).toContain("play");
	});

	test("a user actually named 'play' is reachable via -u", () => {
		const args = parseArgs(["-u", "play"]);
		expect(args.command).toBeUndefined();
		expect(args.username).toBe("play");
	});
});
