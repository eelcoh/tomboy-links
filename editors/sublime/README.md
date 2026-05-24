# Tomboy Links for Sublime Text

This config attaches the Tomboy Links language server to Markdown files through
the Sublime Text `LSP` package. It provides editor-neutral navigation for plain
text that matches Markdown note titles.

## Requirements

- Sublime Text with the `LSP` package installed.
- Node.js available to Sublime Text.
- This repository checked out locally, or `tomboy-links-lsp` available on
  Sublime Text's `PATH`.

## Local Development

From this repository, run:

```sh
npm run install:sublime
```

The installer updates Sublime Text's `LSP.sublime-settings` with a `tomboy-links`
client entry pointing at this checkout's `lsp/server.js`. It uses the absolute
path to the Node.js executable that runs the installer, which avoids common
macOS Dock `PATH` issues.

If Sublime Text stores packages somewhere non-standard, pass the User package
directory explicitly:

```sh
SUBLIME_PACKAGES_USER=/path/to/Sublime/Packages/User npm run install:sublime
```

Then restart Sublime Text and open a folder containing Markdown notes.

## Manual Setup

1. Install the `LSP` package in Sublime Text.
2. Open `Preferences > Package Settings > LSP > Settings`.
3. Add the `tomboy-links` client from `LSP.sublime-settings`.
4. Replace `/absolute/path/to/tomboy-links/lsp/server.js` with the absolute path
   to this repository's `lsp/server.js`.
5. Open a folder containing Markdown notes as a Sublime project or window.

If you have linked the package so `tomboy-links-lsp` is on the `PATH` seen by
Sublime Text, you can use this command instead:

```json
"command": ["tomboy-links-lsp"]
```

## Current Behavior

- Go to definition on matching Markdown note titles.
- Document links when the Sublime LSP client surfaces them.
- No VS Code-style always-visible underline; Sublime Text support goes through
  LSP.

If the server is attached, Sublime's status bar should show `tomboy-links` when
a Markdown file is active. Use `LSP: Toggle Log Panel` from the Command Palette
to inspect startup errors.
