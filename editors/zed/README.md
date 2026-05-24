# Tomboy Links for Zed

This Zed extension attaches the Tomboy Links language server to Markdown files.
It provides editor-neutral navigation for plain text that matches Markdown note titles.

## Local Development

Install this repository as a Zed dev extension:

1. Open Zed.
2. Run `zed: install dev extension`.
3. Select `editors/zed`.

When developing from this repository, open the repository root as the Zed project. The extension will launch `lsp/server.js` from the worktree.

For use from another project, either put `tomboy-links-lsp` on your `PATH` or set:

```sh
export TOMBOY_LINKS_LSP_PATH=/path/to/tomboy-links/lsp/server.js
```

## Current Behavior

- Go to definition on matching Markdown note titles.
- Document links when the editor client supports them.
- No VS Code-style always-visible underline; Zed support goes through LSP.
