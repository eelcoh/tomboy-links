# Implicit Markdown Links

This VS Code extension makes plain text in Markdown files behave like Tomboy-style note links when it matches the title of another Markdown file in the workspace.

For example, if `notes/Project Plan.md` starts with:

```markdown
# Project Plan
```

then the words `Project Plan` in another Markdown file are underlined and can be opened with `Ctrl+Click` or `Cmd+Click`.

## Title Detection

Titles are derived from these sources by default:

1. The first level-one heading, such as `# Project Plan`
2. Frontmatter `title: Project Plan`
3. The Markdown filename without extension

## Settings

- `implicitMarkdownLinks.titleSources`
- `implicitMarkdownLinks.minTitleLength`
- `implicitMarkdownLinks.caseSensitive`
- `implicitMarkdownLinks.scope`
- `implicitMarkdownLinks.exclude`
- `implicitMarkdownLinks.decorationEnabled`

## Development

Run the tests:

```sh
npm test
```

Open this folder in VS Code and press `F5` to launch an Extension Development Host.
