# VHS tape for the README demo — https://github.com/charmbracelet/vhs
# Records the real published package (`npx termheat`), so it must run AFTER
# a successful npm release. Regenerate locally with `vhs termheat.tape`;
# CI regenerates it when this file changes (.github/workflows/demo.yml).

Require npx

Output demo.gif
# Text render of the same session — CI uploads it as a debug artifact.
Output demo.txt

Set FontSize 15
Set Width 1100
Set Height 640
Set Padding 16
Set Theme "Catppuccin Mocha"
# npx cold-downloads the package in the hidden prewarm; give it headroom.
Set WaitTimeout 60s

# VHS starts typing the instant the terminal exists, with no shell-readiness
# gate — on a slow CI runner early keystrokes get eaten (this once froze the
# whole demo in an unterminated bash construct). Wait for the prompt first,
# and Wait again after every hidden command instead of guessing with Sleep.
Hide
Wait
# Prewarm the npx cache with the SAME spec as the visible command below —
# different specs (e.g. termheat@latest) cache separately, and a cold visible
# run would block on npx's interactive "Ok to proceed?" prompt.
Type "npx -y termheat --version"
Enter
Wait
Type "clear"
Enter
Wait
Show

Type "npx termheat moeen-mahmud --shame"
Sleep 500ms
Enter
# Sync on real output — on timeout VHS exits non-zero, so a broken demo
# fails the workflow loudly instead of committing a blank GIF.
Wait+Screen /Total this year/
# Linger so the breathe/flicker animation records.
Sleep 8s

Hide
Type "q"
