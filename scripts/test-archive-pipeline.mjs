#!/usr/bin/env node
/**
 * Offline checks for the archive agent's deterministic layer — the transformer,
 * the quality gates, and the page renderer. No API keys and no network needed,
 * so CI can verify the parts that decide whether a draft gets published.
 *
 * Run with `npm run test:archive`.
 */

import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { archiveTopics } from './archive-topics.mjs';
import { __test } from "./archive-pipeline.mjs";

const { normalize, checkQuality, renderPage, metaDescription } = __test;
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

let passed = 0;
function check(name, fn) {
  try {
    fn();
    passed += 1;
    console.log(`  ok  ${name}`);
  } catch (error) {
    console.error(`  FAIL  ${name}\n        ${error.message}`);
    process.exitCode = 1;
  }
}

const topic = archiveTopics[0];

function paragraph(seed, n = 60) {
  // Distinct filler long enough to clear the 40-character paragraph floor.
  return Array.from({ length: n }, (_, i) => `${seed}word${i}`).join(' ');
}

function goodDraft() {
  return {
    title: 'What a Headless Migration Actually Costs',
    subtitle: 'The line items nobody quotes',
    lede: `${paragraph('lede')}\n\n${paragraph('ledetwo')}`,
    pullQuote: 'The quote costs less than the dual-running period.',
    sections: Array.from({ length: 5 }, (_, i) => ({
      heading: `Section heading number ${i + 1}`,
      paragraphs: [paragraph(`sec${i}a`, 95), paragraph(`sec${i}b`, 95)],
    })),
    takeaways: ['Inventory the content model first.', 'Budget the dual-running period.'],
    coverType: 'strategy',
  };
}

console.log('archive-pipeline deterministic checks\n');

check('normalize strips markdown and drops stub paragraphs', () => {
  const draft = normalize(
    {
      ...goodDraft(),
      title: '**Bold Title**',
      sections: [{ heading: '## A heading', paragraphs: ['too short', paragraph('keep', 70)] }],
    },
    topic,
  );
  assert.equal(draft.title, 'Bold Title');
  assert.equal(draft.sections[0].heading, 'A heading');
  assert.equal(draft.sections[0].paragraphs.length, 1, 'the short paragraph should be dropped');
});

check('normalize falls back to a valid cover type', () => {
  const draft = normalize({ ...goodDraft(), coverType: 'nonsense' }, topic);
  assert.equal(draft.coverType, 'dispatch');
});

check('a good draft passes every gate', () => {
  const problems = checkQuality(normalize(goodDraft(), topic), []);
  assert.deepEqual(problems, [], `unexpected problems: ${problems.join('; ')}`);
});

check('a short draft is rejected', () => {
  const draft = normalize({ ...goodDraft(), sections: goodDraft().sections.slice(0, 4).map((s) => ({ ...s, paragraphs: [paragraph('x', 10)] })) }, topic);
  const problems = checkQuality(draft, []);
  assert.ok(problems.some((p) => p.includes('too short')), `expected a length failure, got: ${problems.join('; ')}`);
});

check('too few sections is rejected', () => {
  const base = goodDraft();
  const problems = checkQuality(normalize({ ...base, sections: base.sections.slice(0, 2) }, topic), []);
  assert.ok(problems.some((p) => p.includes('too few sections')), problems.join('; '));
});

check('banned phrasing is rejected', () => {
  const base = goodDraft();
  base.sections[0].paragraphs[0] = `In today's fast-paced world this is a game changer. ${paragraph('b', 70)}`;
  const problems = checkQuality(normalize(base, topic), []);
  assert.ok(problems.some((p) => p.includes('banned phrasing')), problems.join('; '));
});

check('duplicate headings are rejected', () => {
  const base = goodDraft();
  base.sections[1].heading = base.sections[0].heading;
  const problems = checkQuality(normalize(base, topic), []);
  assert.ok(problems.some((p) => p.includes('duplicate section headings')), problems.join('; '));
});

// The fabrication gate is the one that protects a proof-first site from
// publishing claims nobody can check, so each pattern gets its own case.
const fabrications = [
  ['first-person ship claim', 'This week I shipped the new checkout flow.'],
  ['invented deploy count', 'We deployed 14 services to production.'],
  ['invented business metric', 'Our revenue grew substantially after the change.'],
  ['invented population statistic', 'Roughly 73% of merchants never check this.'],
  ['invented cited source', 'According to a 2024 study, most migrations fail.'],
  ['invented client anecdote', 'We worked with a client who had this exact problem.'],
];

for (const [label, sentence] of fabrications) {
  check(`fabrication gate catches: ${label}`, () => {
    const base = goodDraft();
    base.sections[0].paragraphs[0] = `${sentence} ${paragraph('f', 70)}`;
    const problems = checkQuality(normalize(base, topic), []);
    assert.ok(
      problems.some((p) => p.includes('fabricated claim')),
      `expected a fabrication failure, got: ${problems.join('; ') || 'none'}`,
    );
  });
}

check('near-duplicate of an existing dispatch is rejected', () => {
  const draft = normalize(goodDraft(), topic);
  const selfText = `${draft.lede.join(' ')} ${draft.sections.map((s) => `${s.heading} ${s.paragraphs.join(' ')}`).join(' ')}`;
  const problems = checkQuality(draft, [{ label: 'archive/001.html', text: selfText }]);
  assert.ok(problems.some((p) => p.includes('too similar')), problems.join('; '));
});

check('an unrelated existing dispatch does not trip the similarity gate', () => {
  const problems = checkQuality(normalize(goodDraft(), topic), [
    { label: 'archive/001.html', text: paragraph('unrelated', 400) },
  ]);
  assert.deepEqual(problems, []);
});

check('meta description stays within 156 characters', () => {
  const draft = normalize({ ...goodDraft(), lede: paragraph('long', 200) }, topic);
  assert.ok(metaDescription(draft).length <= 156, `got ${metaDescription(draft).length}`);
});

check('rendered page carries canonical, schema, and escaped content', () => {
  const draft = normalize({ ...goodDraft(), title: 'Costs & "Quotes" <hidden>' }, topic);
  const html = renderPage(draft, { number: '022', date: '2026-08-18', prev: '021' });

  assert.ok(html.includes('<link rel="canonical" href="https://1commercesolutions.com/archive/022.html">'));
  assert.ok(html.includes('"@type": "Article"'), 'Article schema missing');
  assert.ok(html.includes('"@type": "BreadcrumbList"'), 'breadcrumb schema missing');
  assert.ok(html.includes('rel="prev"'), 'prev link missing');
  assert.ok(!html.includes('<hidden>'), 'title was not escaped into the document');
  assert.ok(html.includes('Costs &amp; &quot;Quotes&quot;'), 'expected escaped title text');
  assert.ok(html.includes('images/covers/022.svg'), 'cover reference missing');
});

check('rendered page has balanced html/head/body tags', () => {
  const html = renderPage(normalize(goodDraft(), topic), { number: '022', date: '2026-08-18', prev: null });
  for (const tag of ['html', 'head', 'body', 'main']) {
    const open = (html.match(new RegExp(`<${tag}[\\s>]`, 'g')) || []).length;
    const close = (html.match(new RegExp(`</${tag}>`, 'g')) || []).length;
    assert.equal(open, close, `<${tag}> opened ${open}x, closed ${close}x`);
  }
});

check('topic queue ids and keywords are unique', () => {
  const ids = archiveTopics.map((t) => t.id);
  const keywords = archiveTopics.map((t) => t.keyword.toLowerCase());
  assert.equal(new Set(ids).size, ids.length, 'duplicate topic id');
  assert.equal(new Set(keywords).size, keywords.length, 'duplicate topic keyword');
  assert.ok(archiveTopics.length >= 60, `queue is short: ${archiveTopics.length}`);
});

check('topic keywords do not collide with existing playbook keywords', async () => {
  // Guards against the agent targeting a query a pillar page already owns.
  const playbookKeywords = ['ai commerce operations', 'build in public systems', 'solo founder tech stack',
    'ai agent revenue workflows', 'commerce intelligence layer', 'automated seo for static sites',
    'product validation systems'];
  const collisions = archiveTopics.filter((t) => playbookKeywords.includes(t.keyword.toLowerCase()));
  assert.deepEqual(collisions.map((c) => c.id), [], 'topic collides with a playbook keyword');
});

console.log(`\n${passed} checks passed${process.exitCode ? ' (with failures above)' : ''}`);
