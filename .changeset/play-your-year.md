---
"termheat": major
---

🎮 `termheat play <user>` — play your year. A terminal platformer where your
contribution graph is the level: contribution intensity is terrain height,
zero-days are pits, your current streak burns as collectible flames, and the
run ends at today's column. Auto-runner with one-button controls: [space]
jumps, tap again mid-air for a double jump. Months are respawn checkpoints;
dead months are spanned by dim ghost bridges so every real graph is beatable.

Your streak is your health bar (2 hearts + 1 per streak week), and a 15+
contribution day shines as a gold ★ — grab it and for three seconds the level
can't touch you: walls become steps and pits grow a floor, so you sprint
across the lava itself. Unless the timer runs out mid-pit. Death lines are
dated — and roast you with `--shame` — and every run ends in a Wordle-style
share card whose last line is the replay command: any public username is a
level. `termheat play <user> --export svg|png` also writes the run card as an
image when the run ends — a miniature of the level itself, with your deaths
scarred in and your sprite where the run ended. `termheat play <user> --gif`
records the run (one input code per tick — the engine is deterministic, so
the log IS the run) and re-renders it offline into a looping replay GIF,
still zero dependencies: the GIF89a/LZW encoder is ~150 lines of TypeScript.

You play as a glyph with character — `@` the rogue, `☻` the smiley, `♞` the
knight, and five more, riding above the runner block. Your username hash picks
your default (stable identity, identicon-style), [tab] on the title screen
cycles the roster, and the pick persists to `~/.termheat.json`. Death leaves
a `☠` where the level got you.

And it sounds like a Game Boy: jump blips, pickup arpeggios, a death crunch,
and a win fanfare, synthesized as real DMG channels (square waves with duty
cycles, LFSR noise) — still zero dependencies, the WAVs are generated at
startup and played through the OS. [m] or `--mute` for silence; piped runs
never make a sound.

Breaking: Node >= 22 is now required (Ink 7's floor). If you're on `npx`,
nothing changes unless your Node is older than April 2024.
