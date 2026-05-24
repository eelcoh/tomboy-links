'use strict';

const path = require('path');
const vscode = require('vscode');
const { buildTitleEntries, findTitleMatches } = require('./titleIndex');

const MARKDOWN_SELECTOR = { language: 'markdown', scheme: 'file' };

let titleEntries = [];
let decorationType;
let rebuildTimer;
let decorationTimer;

function activate(context) {
  decorationType = vscode.window.createTextEditorDecorationType({
    textDecoration: 'underline',
    cursor: 'pointer',
    light: {
      color: new vscode.ThemeColor('textLink.foreground'),
    },
    dark: {
      color: new vscode.ThemeColor('textLink.foreground'),
    },
  });

  const linkProvider = vscode.languages.registerDocumentLinkProvider(
    MARKDOWN_SELECTOR,
    {
      provideDocumentLinks(document) {
        return documentMatches(document).map((match) => {
          const link = new vscode.DocumentLink(
            new vscode.Range(document.positionAt(match.start), document.positionAt(match.end)),
            vscode.Uri.file(match.targetPath),
          );
          link.tooltip = `Open ${path.basename(match.targetPath)}`;
          return link;
        });
      },
    },
  );

  const watcher = vscode.workspace.createFileSystemWatcher('**/*.md');
  watcher.onDidCreate(() => scheduleRebuildIndex());
  watcher.onDidChange(() => scheduleRebuildIndex());
  watcher.onDidDelete(() => scheduleRebuildIndex());

  context.subscriptions.push(
    decorationType,
    linkProvider,
    watcher,
    vscode.commands.registerCommand('implicitMarkdownLinks.rebuildIndex', rebuildIndex),
    vscode.workspace.onDidChangeConfiguration((event) => {
      if (event.affectsConfiguration('implicitMarkdownLinks')) {
        scheduleRebuildIndex();
      }
    }),
    vscode.window.onDidChangeActiveTextEditor(updateActiveEditorDecorations),
    vscode.workspace.onDidChangeTextDocument((event) => {
      if (vscode.window.activeTextEditor?.document === event.document) {
        scheduleDecorationUpdate();
      }
    }),
    vscode.window.onDidChangeVisibleTextEditors(updateVisibleEditorDecorations),
  );

  rebuildIndex();
}

function deactivate() {
  if (rebuildTimer) {
    clearTimeout(rebuildTimer);
    rebuildTimer = undefined;
  }

  if (decorationTimer) {
    clearTimeout(decorationTimer);
    decorationTimer = undefined;
  }
}

async function rebuildIndex() {
  const config = readConfig();
  const exclude = config.exclude.length > 0 ? `{${config.exclude.join(',')}}` : undefined;
  const files = await vscode.workspace.findFiles('**/*.md', exclude);
  const documents = [];

  for (const uri of files) {
    const bytes = await vscode.workspace.fs.readFile(uri);
    documents.push({
      path: uri.fsPath,
      text: Buffer.from(bytes).toString('utf8'),
    });
  }

  titleEntries = buildTitleEntries(documents, config);
  updateVisibleEditorDecorations();
}

function scheduleRebuildIndex() {
  if (rebuildTimer) {
    clearTimeout(rebuildTimer);
  }

  rebuildTimer = setTimeout(() => {
    rebuildTimer = undefined;
    rebuildIndex();
  }, 250);
}

function scheduleDecorationUpdate() {
  if (decorationTimer) {
    clearTimeout(decorationTimer);
  }

  decorationTimer = setTimeout(() => {
    decorationTimer = undefined;
    updateVisibleEditorDecorations();
  }, 150);
}

function updateVisibleEditorDecorations() {
  for (const editor of vscode.window.visibleTextEditors) {
    updateEditorDecorations(editor);
  }
}

function updateActiveEditorDecorations(editor) {
  if (editor) {
    updateEditorDecorations(editor);
  }
}

function updateEditorDecorations(editor) {
  if (!editor || editor.document.languageId !== 'markdown' || editor.document.uri.scheme !== 'file') {
    return;
  }

  const config = readConfig();
  if (!config.decorationEnabled) {
    editor.setDecorations(decorationType, []);
    return;
  }

  const decorations = documentMatches(editor.document).map((match) => ({
    range: new vscode.Range(editor.document.positionAt(match.start), editor.document.positionAt(match.end)),
    hoverMessage: new vscode.MarkdownString(`Open ${path.basename(match.targetPath)}`),
  }));

  editor.setDecorations(decorationType, decorations);
}

function documentMatches(document) {
  const config = readConfig();
  const entries = scopedEntries(document.uri.fsPath, config);
  return findTitleMatches(document.getText(), entries, document.uri.fsPath, config);
}

function scopedEntries(currentPath, config) {
  if (config.scope !== 'currentFolderAndChildren') {
    return titleEntries;
  }

  const baseDir = path.dirname(currentPath);
  return titleEntries.filter((entry) => isChildPath(entry.path, baseDir));
}

function isChildPath(childPath, parentPath) {
  const relative = path.relative(parentPath, childPath);
  return relative && !relative.startsWith('..') && !path.isAbsolute(relative);
}

function readConfig() {
  const config = vscode.workspace.getConfiguration('implicitMarkdownLinks');
  return {
    titleSources: config.get('titleSources', ['h1', 'frontmatter', 'filename']),
    minTitleLength: config.get('minTitleLength', 4),
    caseSensitive: config.get('caseSensitive', false),
    scope: config.get('scope', 'workspace'),
    exclude: config.get('exclude', ['**/node_modules/**', '**/.git/**']),
    decorationEnabled: config.get('decorationEnabled', true),
  };
}

module.exports = {
  activate,
  deactivate,
};
