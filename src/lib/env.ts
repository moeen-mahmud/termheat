export const GITHUB_TOKEN = process.env.GITHUB_TOKEN;

// https://no-color.org — any non-empty value disables color. Ink's renderer
// already strips ANSI colors for us; termheat additionally drops animation
// and switches to the ASCII ramp so intensity survives without color.
export const NO_COLOR = Boolean(process.env.NO_COLOR);
