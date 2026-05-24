'use strict';

const fs = require('fs');
const path = require('path');
const { fileURLToPath, pathToFileURL } = require('url');
const { buildTitleEntries, findTitleMatches } = require('../src/titleIndex');

const DEFAULT_OPTIONS = Object.freeze({
  titleSources: ['h1', 'frontmatter', 'filename'],
  minTitleLength: 4,
  caseSensitive: false,
});

class TomboyLinksWorkspace {
  constructor(options = {}) {
    this.options = { ...DEFAULT_OPTIONS, ...options };
    this.documents = new Map();
    this.workspaceRoots = [];
    this.titleEntries = [];
  }

  initialize(rootUrisOrPaths) {
    this.workspaceRoots = rootUrisOrPaths.map(uriOrPathToPath).filter(Boolean);
    this.rebuildIndex();
  }

  open(uri, text) {
    this.documents.set(uriToPath(uri), text);
    this.rebuildIndex();
  }

  change(uri, text) {
    this.documents.set(uriToPath(uri), text);
    this.rebuildIndex();
  }

  rebuildIndex() {
    const files = new Map();

    for (const root of this.workspaceRoots) {
      for (const filePath of listMarkdownFiles(root)) {
        files.set(filePath, readFile(filePath));
      }
    }

    for (const [filePath, text] of this.documents.entries()) {
      if (isMarkdownPath(filePath)) {
        files.set(filePath, text);
      }
    }

    this.titleEntries = buildTitleEntries(
      [...files.entries()].map(([filePath, text]) => ({ path: filePath, text })),
      this.options,
    );
  }

  definitionAt(uri, position) {
    const filePath = uriToPath(uri);
    const text = this.textForDocument(filePath);
    if (!text) {
      return null;
    }

    const offset = offsetAt(text, position);
    const match = findTitleMatches(text, this.titleEntries, filePath, this.options)
      .find((candidate) => offset >= candidate.start && offset <= candidate.end);

    if (!match) {
      return null;
    }

    return {
      uri: pathToFileURL(match.targetPath).toString(),
      range: {
        start: { line: 0, character: 0 },
        end: { line: 0, character: 0 },
      },
    };
  }

  documentLinks(uri) {
    const filePath = uriToPath(uri);
    const text = this.textForDocument(filePath);
    if (!text) {
      return [];
    }

    return findTitleMatches(text, this.titleEntries, filePath, this.options).map((match) => ({
      range: {
        start: positionAt(text, match.start),
        end: positionAt(text, match.end),
      },
      target: pathToFileURL(match.targetPath).toString(),
      tooltip: `Open ${path.basename(match.targetPath)}`,
    }));
  }

  textForDocument(filePath) {
    return this.documents.get(filePath) ?? readFile(filePath);
  }
}

function listMarkdownFiles(root) {
  const results = [];
  const pending = [root];

  while (pending.length > 0) {
    const current = pending.pop();
    let entries;

    try {
      entries = fs.readdirSync(current, { withFileTypes: true });
    } catch {
      continue;
    }

    for (const entry of entries) {
      if (entry.name === '.git' || entry.name === 'node_modules') {
        continue;
      }

      const entryPath = path.join(current, entry.name);
      if (entry.isDirectory()) {
        pending.push(entryPath);
      } else if (entry.isFile() && isMarkdownPath(entryPath)) {
        results.push(entryPath);
      }
    }
  }

  return results;
}

function readFile(filePath) {
  try {
    return fs.readFileSync(filePath, 'utf8');
  } catch {
    return '';
  }
}

function isMarkdownPath(filePath) {
  return /\.md(?:own)?$/i.test(filePath);
}

function offsetAt(text, position) {
  let line = 0;
  let character = 0;

  for (let offset = 0; offset < text.length; offset++) {
    if (line === position.line && character === position.character) {
      return offset;
    }

    if (text[offset] === '\n') {
      line++;
      character = 0;
    } else {
      character++;
    }
  }

  return text.length;
}

function positionAt(text, targetOffset) {
  let line = 0;
  let character = 0;

  for (let offset = 0; offset < targetOffset && offset < text.length; offset++) {
    if (text[offset] === '\n') {
      line++;
      character = 0;
    } else {
      character++;
    }
  }

  return { line, character };
}

function uriOrPathToPath(value) {
  return typeof value === 'string' && value.startsWith('file:') ? uriToPath(value) : value;
}

function uriToPath(uri) {
  return fileURLToPath(uri);
}

module.exports = {
  TomboyLinksWorkspace,
  offsetAt,
  positionAt,
};
