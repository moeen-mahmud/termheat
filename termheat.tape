# VHS tape for the README demo — https://github.com/charmbracelet/vhs
# Regenerate locally with `vhs termheat.tape`; CI does it automatically
# whenever this file changes (.github/workflows/demo.yml).

Output demo.gif

Set FontSize 15
Set Width 1100
Set Height 640
Set Padding 16
Set Theme "Catppuccin Mocha"

# The published package is what users type, but CI records from this repo —
# shim `npx termheat` onto the local source, invisibly.
Hide
Type `npx() { shift; bun run src/index.tsx "$@"; }`
Enter
Type "clear"
Enter
Show

Type "npx termheat moeen-mahmud --shame"
Sleep 500ms
Enter
Sleep 10s

Hide
Type "q"
