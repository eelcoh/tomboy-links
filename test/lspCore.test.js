'use strict';

const assert = require('assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { pathToFileURL } = require('url');
const { TomboyLinksWorkspace } = require('../lsp/core');

const root = fs.mkdtempSync(path.join(os.tmpdir(), 'tomboy-links-lsp-'));
const projectPlan = path.join(root, 'Project Plan.md');
const daily = path.join(root, 'Daily.md');

fs.writeFileSync(projectPlan, '# Project Plan\n\nDetails\n');
fs.writeFileSync(daily, '# Daily\n\nSee Project Plan today.\n');

const workspace = new TomboyLinksWorkspace();
workspace.initialize([pathToFileURL(root).toString()]);
workspace.open(pathToFileURL(daily).toString(), '# Daily\n\nSee Project Plan today.\n');

const definition = workspace.definitionAt(pathToFileURL(daily).toString(), {
  line: 2,
  character: 6,
});

assert.strictEqual(definition.uri, pathToFileURL(projectPlan).toString());

const links = workspace.documentLinks(pathToFileURL(daily).toString());
assert.strictEqual(links.length, 1);
assert.strictEqual(links[0].target, pathToFileURL(projectPlan).toString());
assert.deepStrictEqual(links[0].range, {
  start: { line: 2, character: 4 },
  end: { line: 2, character: 16 },
});

console.log('lspCore tests passed');
