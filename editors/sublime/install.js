#!/usr/bin/env node
'use strict';

const fs = require('fs');
const os = require('os');
const path = require('path');

const repoRoot = path.resolve(__dirname, '..', '..');
const serverPath = path.join(repoRoot, 'lsp', 'server.js');
const serverName = 'tomboy-links';
const settingsFile = 'LanguageServers.sublime-settings';

main();

function main() {
  if (!fs.existsSync(serverPath)) {
    fail(`Could not find language server at ${serverPath}`);
  }

  const userDir = findSublimeUserDir();
  if (!userDir) {
    fail([
      'Could not find Sublime Text Packages/User directory.',
      'Open Sublime Text once, install the LSP package, then rerun this installer.',
      'You can also pass SUBLIME_PACKAGES_USER=/path/to/Packages/User.',
    ].join('\n'));
  }

  fs.mkdirSync(userDir, { recursive: true });

  const settingsPath = path.join(userDir, settingsFile);
  const settings = readSettings(settingsPath);
  settings[serverName] = buildServerConfig();
  fs.writeFileSync(settingsPath, `${JSON.stringify(settings, null, 2)}\n`);

  console.log(`Installed ${serverName} LSP config:`);
  console.log(settingsPath);
  console.log('');
  console.log('Restart Sublime Text, then open a folder containing Markdown notes.');
}

function findSublimeUserDir() {
  if (process.env.SUBLIME_PACKAGES_USER) {
    return path.resolve(process.env.SUBLIME_PACKAGES_USER);
  }

  return candidateUserDirs().find((dir) => fs.existsSync(path.dirname(dir))) || null;
}

function candidateUserDirs() {
  const home = os.homedir();

  if (process.platform === 'darwin') {
    return [
      path.join(home, 'Library', 'Application Support', 'Sublime Text', 'Packages', 'User'),
      path.join(home, 'Library', 'Application Support', 'Sublime Text 3', 'Packages', 'User'),
    ];
  }

  if (process.platform === 'win32') {
    const appData = process.env.APPDATA || path.join(home, 'AppData', 'Roaming');
    return [
      path.join(appData, 'Sublime Text', 'Packages', 'User'),
      path.join(appData, 'Sublime Text 3', 'Packages', 'User'),
    ];
  }

  return [
    path.join(home, '.config', 'sublime-text', 'Packages', 'User'),
    path.join(home, '.config', 'sublime-text-3', 'Packages', 'User'),
  ];
}

function readSettings(settingsPath) {
  if (!fs.existsSync(settingsPath)) {
    return {};
  }

  const raw = fs.readFileSync(settingsPath, 'utf8').trim();
  if (!raw) {
    return {};
  }

  try {
    return JSON.parse(stripJsonComments(raw));
  } catch (error) {
    fail([
      `Could not parse ${settingsPath}.`,
      `Error: ${error.message}`,
      'Fix the settings file or add the config from editors/sublime/LanguageServers.sublime-settings manually.',
    ].join('\n'));
  }
}

function stripJsonComments(input) {
  let output = '';
  let inString = false;
  let escaped = false;

  for (let index = 0; index < input.length; index += 1) {
    const char = input[index];
    const next = input[index + 1];

    if (inString) {
      output += char;
      if (escaped) {
        escaped = false;
      } else if (char === '\\') {
        escaped = true;
      } else if (char === '"') {
        inString = false;
      }
      continue;
    }

    if (char === '"') {
      inString = true;
      output += char;
      continue;
    }

    if (char === '/' && next === '/') {
      while (index < input.length && input[index] !== '\n') {
        index += 1;
      }
      output += '\n';
      continue;
    }

    if (char === '/' && next === '*') {
      index += 2;
      while (index < input.length && !(input[index] === '*' && input[index + 1] === '/')) {
        index += 1;
      }
      index += 1;
      continue;
    }

    output += char;
  }

  return output.replace(/,\s*([}\]])/g, '$1');
}

function buildServerConfig() {
  return {
    enabled: true,
    command: ['node', serverPath],
    selector: 'text.html.markdown | text.html.markdown.gfm',
  };
}

function fail(message) {
  console.error(message);
  process.exit(1);
}
