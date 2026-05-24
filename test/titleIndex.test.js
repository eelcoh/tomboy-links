'use strict';

const assert = require('assert');
const path = require('path');
const {
  buildTitleEntries,
  deriveTitle,
  extractFirstH1,
  extractFrontmatterTitle,
  findTitleMatches,
} = require('../src/titleIndex');

function fixturePath(name) {
  return path.join('/workspace/notes', name);
}

assert.strictEqual(extractFirstH1('# Project Plan\n\nBody'), 'Project Plan');
assert.strictEqual(extractFirstH1('```md\n# Not a Heading\n```\n# Real Heading'), 'Real Heading');
assert.strictEqual(extractFrontmatterTitle('---\ntitle: "Frontmatter Title"\n---\n# H1'), 'Frontmatter Title');

assert.strictEqual(
  deriveTitle(fixturePath('Fallback Name.md'), 'No title here', { titleSources: ['h1', 'filename'] }),
  'Fallback Name',
);

{
  const entries = buildTitleEntries([
    { path: fixturePath('Alpha.md'), text: '# Alpha Note' },
    { path: fixturePath('Duplicate A.md'), text: '# Duplicate' },
    { path: fixturePath('Duplicate B.md'), text: '# Duplicate' },
    { path: fixturePath('Short.md'), text: '# Go' },
  ]);

  assert.deepStrictEqual(entries, [{ title: 'Alpha Note', path: fixturePath('Alpha.md') }]);
}

{
  const entries = buildTitleEntries([
    { path: fixturePath('Project Plan.md'), text: '# Project Plan' },
    { path: fixturePath('Project.md'), text: '# Project' },
  ]);
  const text = 'See Project Plan today. Projector is not Project.';
  const matches = findTitleMatches(text, entries, fixturePath('Current.md'));

  assert.deepStrictEqual(matches.map((match) => text.slice(match.start, match.end)), [
    'Project Plan',
    'Project',
  ]);
}

{
  const entries = buildTitleEntries([
    { path: fixturePath('Project Plan.md'), text: '# Project Plan' },
  ]);
  const text = 'Already [Project Plan](./Project%20Plan.md), but Project Plan here.';
  const matches = findTitleMatches(text, entries, fixturePath('Current.md'));

  assert.strictEqual(matches.length, 1);
  assert.strictEqual(text.slice(matches[0].start, matches[0].end), 'Project Plan');
}

{
  const entries = buildTitleEntries([
    { path: fixturePath('Current.md'), text: '# Current' },
  ]);
  const matches = findTitleMatches('Current should not self-link.', entries, fixturePath('Current.md'));

  assert.deepStrictEqual(matches, []);
}

console.log('titleIndex tests passed');
