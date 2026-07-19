import { apiInstance } from "@/lib/api-instance";
import { CONTRIBUTIONS_URL, GRAPHQL_ENDPOINT } from "@/lib/const";
import { GITHUB_TOKEN } from "@/lib/env";
import { CONTRIBUTIONS_QUERY } from "@/lib/query";
import type { ContributionDay } from "@/lib/types";

export class GitHubError extends Error {}

export class UserNotFoundError extends GitHubError {
	constructor(username: string) {
		super(`GitHub user "${username}" not found`);
	}
}

/**
 * Fetches the last ~365 days of contribution activity for a public profile.
 *
 * Two transports:
 * - With a token (GITHUB_TOKEN or opts.token): the GraphQL API — exact counts.
 * - Without: the public HTML calendar fragment GitHub serves for every profile.
 *   The GraphQL API rejects unauthenticated requests, so scraping is the only
 *   true zero-auth path.
 */
export async function fetchContributions(username: string, opts: { token?: string } = {}): Promise<ContributionDay[]> {
	const token = opts.token ?? GITHUB_TOKEN;
	return token ? fetchViaGraphQL(username, token) : fetchViaScrape(username);
}

async function fetchViaGraphQL(username: string, token: string): Promise<ContributionDay[]> {
	const res = await apiInstance.post(
		GRAPHQL_ENDPOINT,
		{ query: CONTRIBUTIONS_QUERY, variables: { username } },
		{ authorization: `bearer ${token}` },
	);
	if (res.status === 401) {
		throw new GitHubError(
			`GitHub rejected the token (${res.status}). Check GITHUB_TOKEN, or unset it to use tokenless mode.`,
		);
	}
	if (!res.ok) {
		throw new GitHubError(`GitHub GraphQL API returned ${res.status}`);
	}
	return parseGraphQLResponse(await res.json(), username);
}

interface GraphQLResponse {
	data?: {
		user: {
			contributionsCollection: {
				contributionCalendar: {
					weeks: {
						contributionDays: { contributionCount: number; date: string }[];
					}[];
				};
			};
		} | null;
	};
	errors?: { message: string }[];
}

export function parseGraphQLResponse(json: unknown, username: string): ContributionDay[] {
	const body = json as GraphQLResponse;
	const user = body.data?.user;
	if (!user) {
		if (body.data && body.data.user === null) throw new UserNotFoundError(username);
		const message = body.errors?.[0]?.message ?? "unexpected response shape";
		throw new GitHubError(`GitHub GraphQL error: ${message}`);
	}
	return user.contributionsCollection.contributionCalendar.weeks
		.flatMap((week) => week.contributionDays)
		.map((day) => ({ date: day.date, count: day.contributionCount }))
		.sort(byDate);
}

// --- Tokenless HTML transport ---

async function fetchViaScrape(username: string): Promise<ContributionDay[]> {
	const res = await apiInstance.get(CONTRIBUTIONS_URL(username), {
		accept: "text/html",
	});
	if (res.status === 404) throw new UserNotFoundError(username);
	if (!res.ok) throw new GitHubError(`GitHub returned ${res.status} for the contribution calendar`);
	const days = parseContributionsHtml(await res.text());
	if (days.length === 0) {
		throw new GitHubError(
			"Could not parse the contribution calendar — GitHub may have changed its markup. " +
				"Set GITHUB_TOKEN to use the GraphQL API instead.",
		);
	}
	return days;
}

/**
 * Parses GitHub's calendar fragment. Each day is a
 * `<td class="ContributionCalendar-day" data-date data-level id>` cell; exact
 * counts live in sibling `<tool-tip for="<cell id>">N contributions…</tool-tip>`
 * elements. Falls back to `data-level` (0–4) as a coarse count if a tooltip is
 * missing, which keeps streak math correct even when GitHub tweaks tooltip text.
 */
export function parseContributionsHtml(html: string): ContributionDay[] {
	const countsByCellId = new Map<string, number>();
	for (const m of html.matchAll(/<tool-tip[^>]*\bfor="([^"]+)"[^>]*>([\s\S]*?)<\/tool-tip>/g)) {
		const count = parseTooltipCount(m[2]!);
		if (count !== null) countsByCellId.set(m[1]!, count);
	}

	const days: ContributionDay[] = [];
	for (const m of html.matchAll(/<td[^>]*\bclass="[^"]*ContributionCalendar-day[^"]*"[^>]*>/g)) {
		const tag = m[0];
		const date = /\bdata-date="([^"]+)"/.exec(tag)?.[1];
		if (!date) continue;
		const id = /\bid="([^"]+)"/.exec(tag)?.[1];
		const level = Number(/\bdata-level="(\d)"/.exec(tag)?.[1] ?? "0");
		const count = (id ? countsByCellId.get(id) : undefined) ?? level;
		days.push({ date, count });
	}
	return days.sort(byDate);
}

function parseTooltipCount(text: string): number | null {
	if (/\bNo contributions\b/i.test(text)) return 0;
	const match = /(\d[\d,]*)\s+contributions?\b/i.exec(text);
	return match ? Number(match[1]!.replaceAll(",", "")) : null;
}

function byDate(a: ContributionDay, b: ContributionDay): number {
	return a.date < b.date ? -1 : a.date > b.date ? 1 : 0;
}
