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

	test("robustness flags don't swallow a following username", () => {
		const args = parseArgs(["--static", "octocat", "--ascii"]);
		expect(args.username).toBe("octocat");
		expect(args.noAnimation).toBe(true);
		expect(args.ascii).toBe(true);
		expect(args.errors).toEqual([]);
	});
});
