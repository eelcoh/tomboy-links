'use strict';

const path = require('path');

const DEFAULT_OPTIONS = Object.freeze({
  titleSources: ['h1', 'frontmatter', 'filename'],
  minTitleLength: 4,
  caseSensitive: false,
});

function normalizeOptions(options = {}) {
  return {
    ...DEFAULT_OPTIONS,
    ...options,
    titleSources: Array.isArray(options.titleSources)
      ? options.titleSources
      : DEFAULT_OPTIONS.titleSources,
  };
}

function deriveTitle(filePath, text, options = {}) {
  const settings = normalizeOptions(options);

  for (const source of settings.titleSources) {
    const title = titleFromSource(source, filePath, text);
    if (title) {
      return title.length >= settings.minTitleLength ? title : undefined;
    }
  }

  return undefined;
}

function titleFromSource(source, filePath, text) {
  if (source === 'frontmatter') {
    return extractFrontmatterTitle(text);
  }

  if (source === 'h1') {
    return extractFirstH1(text);
  }

  if (source === 'filename') {
    return path.basename(filePath, path.extname(filePath)).trim();
  }

  return undefined;
}

function extractFrontmatterTitle(text) {
  const frontmatter = /^---\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)/.exec(text);
  if (!frontmatter) {
    return undefined;
  }

  const titleLine = /^title:\s*(.+?)\s*$/im.exec(frontmatter[1]);
  if (!titleLine) {
    return undefined;
  }

  return unquoteYamlScalar(titleLine[1].trim());
}

function unquoteYamlScalar(value) {
  const quoted = /^(['"])(.*)\1$/.exec(value);
  return quoted ? quoted[2].trim() : value.trim();
}

function extractFirstH1(text) {
  const lines = text.split(/\r?\n/);
  let inFence = false;
  let fenceMarker = '';

  for (const line of lines) {
    const fence = /^\s*(```+|~~~+)/.exec(line);
    if (fence) {
      if (!inFence) {
        inFence = true;
        fenceMarker = fence[1][0];
      } else if (fence[1][0] === fenceMarker) {
        inFence = false;
      }
      continue;
    }

    if (inFence) {
      continue;
    }

    const heading = /^#\s+(.+?)\s*#*\s*$/.exec(line);
    if (heading) {
      return heading[1].trim();
    }
  }

  return undefined;
}

function buildTitleEntries(files, options = {}) {
  const settings = normalizeOptions(options);
  const byKey = new Map();

  for (const file of files) {
    const title = deriveTitle(file.path, file.text, settings);
    if (!title) {
      continue;
    }

    const key = titleKey(title, settings.caseSensitive);
    const entries = byKey.get(key) || [];
    entries.push({ title, path: file.path });
    byKey.set(key, entries);
  }

  return [...byKey.values()]
    .filter((entries) => entries.length === 1)
    .map((entries) => entries[0])
    .sort((a, b) => b.title.length - a.title.length || a.title.localeCompare(b.title));
}

function findTitleMatches(text, entries, currentPath, options = {}) {
  const settings = normalizeOptions(options);
  const matches = [];
  const occupied = [];

  for (const entry of entries) {
    if (samePath(entry.path, currentPath)) {
      continue;
    }

    const pattern = new RegExp(escapeRegExp(entry.title), settings.caseSensitive ? 'g' : 'gi');
    let match;
    while ((match = pattern.exec(text)) !== null) {
      const start = match.index;
      const end = start + match[0].length;

      if (isUsableMatch(text, start, end) && !overlapsAny(start, end, occupied)) {
        matches.push({ start, end, title: match[0], targetPath: entry.path });
        occupied.push({ start, end });
      }

      if (pattern.lastIndex === match.index) {
        pattern.lastIndex++;
      }
    }
  }

  return matches.sort((a, b) => a.start - b.start || b.end - a.end);
}

function isUsableMatch(text, start, end) {
  return isBoundary(text[start - 1]) && isBoundary(text[end]) && !isInsideInlineMarkdownLink(text, start, end);
}

function isBoundary(char) {
  return char === undefined || !/[A-Za-z0-9_-]/.test(char);
}

function isInsideInlineMarkdownLink(text, start, end) {
  const lineStart = text.lastIndexOf('\n', start - 1) + 1;
  const lineEndIndex = text.indexOf('\n', end);
  const lineEnd = lineEndIndex === -1 ? text.length : lineEndIndex;
  const line = text.slice(lineStart, lineEnd);
  const localStart = start - lineStart;
  const localEnd = end - lineStart;
  const linkPattern = /!?\[[^\]]*]\([^)]+\)/g;
  let link;

  while ((link = linkPattern.exec(line)) !== null) {
    if (localStart >= link.index && localEnd <= link.index + link[0].length) {
      return true;
    }
  }

  return false;
}

function overlapsAny(start, end, ranges) {
  return ranges.some((range) => start < range.end && end > range.start);
}

function titleKey(title, caseSensitive) {
  return caseSensitive ? title : title.toLocaleLowerCase();
}

function samePath(left, right) {
  return path.resolve(left) === path.resolve(right);
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

module.exports = {
  buildTitleEntries,
  deriveTitle,
  extractFirstH1,
  extractFrontmatterTitle,
  findTitleMatches,
};
