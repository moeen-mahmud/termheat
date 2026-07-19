import { describe, expect, test } from "bun:test";
import { parseContributionsHtml, parseGraphQLResponse, UserNotFoundError } from "@/github";

describe("parseGraphQLResponse", () => {
	const payload = {
		data: {
			user: {
				contributionsCollection: {
					contributionCalendar: {
						weeks: [
							{
								contributionDays: [{ contributionCount: 3, date: "2026-07-05" }],
							},
							{
								contributionDays: [
									{ contributionCount: 0, date: "2026-07-06" },
									{ contributionCount: 12, date: "2026-07-07" },
								],
							},
						],
					},
				},
			},
		},
	};

	test("flattens weeks into sorted days", () => {
		expect(parseGraphQLResponse(payload, "someone")).toEqual([
			{ date: "2026-07-05", count: 3 },
			{ date: "2026-07-06", count: 0 },
			{ date: "2026-07-07", count: 12 },
		]);
	});

	test("null user means the account does not exist", () => {
		expect(() => parseGraphQLResponse({ data: { user: null } }, "ghost")).toThrow(UserNotFoundError);
	});

	test("surfaces GraphQL error messages", () => {
		expect(() => parseGraphQLResponse({ errors: [{ message: "API rate limit exceeded" }] }, "someone")).toThrow(
			/rate limit/,
		);
	});
});

describe("parseContributionsHtml", () => {
	const html = `
    <table>
      <td id="contribution-day-component-0-0" data-date="2026-07-06" data-level="0"
          class="ContributionCalendar-day"></td>
      <td id="contribution-day-component-1-0" data-date="2026-07-07" data-level="1"
          class="ContributionCalendar-day"></td>
      <td id="contribution-day-component-2-0" data-date="2026-07-08" data-level="4"
          class="ContributionCalendar-day"></td>
      <td data-date="2026-07-09" data-level="2" class="ContributionCalendar-day"></td>
    </table>
    <tool-tip for="contribution-day-component-0-0">No contributions on July 6th.</tool-tip>
    <tool-tip for="contribution-day-component-1-0">2 contributions on July 7th.</tool-tip>
    <tool-tip for="contribution-day-component-2-0">1,024 contributions on July 8th.</tool-tip>
  `;

	test("joins cells with tooltip counts by id", () => {
		const days = parseContributionsHtml(html);
		expect(days).toContainEqual({ date: "2026-07-06", count: 0 });
		expect(days).toContainEqual({ date: "2026-07-07", count: 2 });
	});

	test("parses comma-grouped counts", () => {
		expect(parseContributionsHtml(html)).toContainEqual({
			date: "2026-07-08",
			count: 1024,
		});
	});

	test("falls back to data-level when a cell has no tooltip", () => {
		expect(parseContributionsHtml(html)).toContainEqual({
			date: "2026-07-09",
			count: 2,
		});
	});

	test("returns [] for markup it no longer understands", () => {
		expect(parseContributionsHtml("<html><body>Sign in to GitHub</body></html>")).toEqual([]);
	});
});
