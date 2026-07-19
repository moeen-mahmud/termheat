import { APP_NAME } from "@/lib/const";
import type { ExportOptions } from "@/lib/schema";
import type { ExportFormat } from "@/lib/types";
import { renderRunCard, type RunCardOptions } from "@/run-card";
import { renderSvgCard } from "@/svg";
import { writeFile } from "node:fs/promises";
import { createRequire } from "node:module";
import { join, resolve } from "node:path";

/** Expected failure with a message meant for the user — print */
export class ExportError extends Error {}

/** Renders the card and writes it to disk. Returns the absolute path written. */
export async function exportCard(opts: ExportOptions): Promise<string> {
	const svg = renderSvgCard({
		username: opts.username,
		days: opts.days,
		theme: opts.theme,
		// A PNG is one frame by definition — never embed animation CSS in it.
		animate: opts.animate && opts.format === "svg",
	});
	return writeCard(svg, opts.format, resolve(opts.out ?? `${APP_NAME}-${opts.username}.${opts.format}`));
}

/**
 * Writes the `play --export` run card once a run ends. The "-play-" in the
 * default filename keeps it from clobbering the heatmap card of the same user.
 */
export async function exportRunCard(opts: RunCardOptions & { format: ExportFormat; out?: string }): Promise<string> {
	const svg = renderRunCard(opts);
	return writeCard(svg, opts.format, resolve(opts.out ?? `${APP_NAME}-play-${opts.username}.${opts.format}`));
}

async function writeCard(svg: string, format: ExportFormat, path: string): Promise<string> {
	if (format === "svg") {
		await writeFile(path, svg, "utf8");
	} else {
		await writeFile(path, await renderPng(svg));
	}
	return path;
}

/**
 * PNG rasterization is the one feature with a heavyweight native dependency,
 * so @resvg/resvg-js is deliberately absent from package.json dependencies
 * (optionalDependencies would make every npx cold start download it). It's
 * resolved lazily: first from termheat's own tree (dev/CI installs), then
 * from the invoking directory (a user who followed the install hint).
 */
async function renderPng(svg: string): Promise<Buffer> {
	const { Resvg } = await loadResvg();
	// 2x the SVG's intrinsic size so README-width embeds stay crisp on retina.
	const rendered = new Resvg(svg, { fitTo: { mode: "zoom", value: 2 } }).render();
	return rendered.asPng();
}

interface ResvgModule {
	Resvg: new (svg: string, opts?: { fitTo?: { mode: "zoom"; value: number } }) => { render(): { asPng(): Buffer } };
}

async function loadResvg(): Promise<ResvgModule> {
	try {
		return (await import("@resvg/resvg-js")) as unknown as ResvgModule;
	} catch {
		try {
			const requireFromCwd = createRequire(join(process.cwd(), "noop.js"));
			return requireFromCwd("@resvg/resvg-js") as ResvgModule;
		} catch {
			throw new ExportError(
				`PNG export needs the optional @resvg/resvg-js package.\n` +
					`Install it where you run ${APP_NAME}:  npm install @resvg/resvg-js\n` +
					`(or export SVG instead — it animates and GitHub READMEs render it directly)`,
			);
		}
	}
}
