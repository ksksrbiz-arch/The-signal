#!/usr/bin/env node
/**
 * archive-compose.mjs — takes a Claude-authored draft and publishes it.
 *
 * This is the enforcement half. Claude writes the dispatch; this decides
 * whether it is allowed to ship. That split is deliberate: the author changes
 * and improves over time, the guarantees must not.
 *
 * Sequence: load draft -> normalize -> gates -> (refuse, or) render, cover,
 * archive index, state, craft measurements -> rebuild derived files -> commit
 * -> push -> IndexNow.
 *
 * Refusal is a first-class outcome, not an error. When a gate rejects a draft
 * the reason is recorded as a craft lesson (so a recurring mistake becomes a
 * standing rule) and the process exits 2 — distinct from 1, so the caller can
 * tell "your draft needs work" from "the machinery broke".
 *
 * Usage:
 *   npm run archive:compose -- draft.json
 *   npm run archive:compose -- draft.json --dry-run   # gate only, write nothing
 *
 * Exit codes: 0 published (or dry-run passed) · 2 draft refused · 1 broken.
 */

import { execFileSync } from 'node:child_process';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import path from 'node:path';

import {
  ARCHIVE_DIR,
  COVERS_DIR,
  MAX_SIMILARITY,
  MIN_SECTIONS,
  MIN_WORDS,
  SITE_URL,
  TODAY,
  buildCover,
  checkQuality,
  collectExistingTexts,
  existingNumbers,
  jaccard,
  loadState,
  nextNumber,
  normalize,
  pickTopic,
  renderPage,
  saveState,
  shingles,
  updateArchiveIndex,
  ROOT,
} from './archive-pipeline.mjs';
import {
  fingerprint,
  detectDrift,
  loadCraft,
  marginWarnings,
  marginsFor,
  recordLesson,
  recordRun,
  recordStructure,
  saveCraft,
} from './archive-craft.mjs';

const args = process.argv.slice(2);
const DRY_RUN = args.includes('--dry-run');
const draftPath = args.find((a) => !a.startsWith('--'));

function run(command, cmdArgs, { allowFailure = false, quiet = false } = {}) {
  try {
    const output = execFileSync(command, cmdArgs, {
      cwd: ROOT,
      encoding: 'utf8',
      stdio: quiet ? ['ignore', 'pipe', 'pipe'] : ['ignore', 'inherit', 'inherit'],
    });
    return { ok: true, output: output || '' };
  } catch (error) {
    if (allowFailure) return { ok: false, output: `${error.stdout || ''}${error.stderr || ''}` };
    throw error;
  }
}

/** Turn a gate failure into a stable tag so repeats can be counted. */
function tagFor(problem) {
  if (problem.startsWith('too short')) return 'gate:length';
  if (problem.startsWith('too few sections')) return 'gate:sections';
  if (problem.startsWith('banned phrasing')) return 'gate:phrasing';
  if (problem.startsWith('duplicate section headings')) return 'gate:duplicate-headings';
  if (problem.startsWith('possible fabricated claim')) return 'gate:fabrication';
  if (problem.startsWith('too similar')) return 'gate:similarity';
  return 'gate:other';
}

const ACTIONS = {
  'gate:length': 'Develop each section to a full argument with a mechanism and a trade-off before drafting the next one.',
  'gate:sections': 'Outline at least five distinct claims before writing; a short outline means the thesis is too narrow.',
  'gate:phrasing': 'Reread for AI-tell phrasing before composing — the banned list is in archive-pipeline.mjs.',
  'gate:duplicate-headings': 'Give every section a distinct claim as its heading; repeated headings mean repeated arguments.',
  'gate:fabrication': 'Never assert specifics you cannot check — no counts, metrics, studies, or client stories. Reason from mechanism instead.',
  'gate:similarity': 'Check the recent openings in the brief and pick a genuinely different framing and vocabulary.',
};

async function main() {
  if (!draftPath) {
    console.error('archive-compose: pass the path to a draft JSON file.\n  npm run archive:compose -- draft.json');
    process.exit(1);
  }

  const raw = JSON.parse(await readFile(path.resolve(draftPath), 'utf8'));
  const state = await loadState();
  const craft = await loadCraft();
  const topic = raw.topicId
    ? (await import('./archive-topics.mjs')).findTopic(raw.topicId) || (await pickTopic(state))
    : await pickTopic(state);

  const numbers = await existingNumbers();
  const number = nextNumber(numbers);
  const prev = numbers.length ? numbers[numbers.length - 1] : null;

  const draft = normalize(raw, topic);
  const existingTexts = await collectExistingTexts();
  const problems = checkQuality(draft, existingTexts);

  if (problems.length) {
    console.error(`\narchive-compose: REFUSED — the draft did not pass ${problems.length} gate(s):\n`);
    for (const problem of problems) console.error(`  · ${problem}`);

    let updated = craft;
    for (const problem of problems) {
      const tag = tagFor(problem);
      updated = recordLesson(updated, {
        tag,
        observation: problem,
        action: ACTIONS[tag] || 'Revise so this gate passes on the next attempt.',
      });
    }
    updated = recordRun(updated, { number, topicId: topic.id, outcome: 'refused', problems });
    await saveCraft(updated);

    console.error('\nRecorded as craft lessons. Revise the draft and run compose again.');
    console.error('Do NOT relax a gate to get through — the gates are why this section can rank.');
    process.exit(2);
  }

  // Passed. Measure how close it came, so the next run can steer.
  const draftShingles = shingles(
    `${draft.lede.join(' ')} ${draft.sections.map((s) => `${s.heading} ${s.paragraphs.join(' ')}`).join(' ')}`,
  );
  const peakSimilarity = existingTexts.reduce((max, { text }) => Math.max(max, jaccard(draftShingles, shingles(text))), 0);
  const print = fingerprint(draft, number);
  const margins = marginsFor({
    words: print.words,
    minWords: MIN_WORDS,
    similarity: peakSimilarity,
    maxSimilarity: MAX_SIMILARITY,
    sections: draft.sections.length,
    minSections: MIN_SECTIONS,
  });

  console.log('\narchive-compose: all gates passed.');
  console.log(`  words ${print.words} (+${margins.wordsOver} over minimum)`);
  console.log(`  peak similarity ${margins.peakSimilarity} (headroom ${margins.similarityHeadroom})`);
  console.log(`  sections ${draft.sections.length} · opening shape "${print.openingShape}"`);

  const warnings = [...marginWarnings(margins), ...detectDrift(craft.structures, print)];
  if (warnings.length) {
    console.log('\n  Notes carried into the next dispatch:');
    for (const warning of warnings) console.log(`   · ${warning}`);
  }

  if (DRY_RUN) {
    console.log('\narchive-compose: --dry-run — nothing written.');
    return;
  }

  // Publish.
  await mkdir(COVERS_DIR, { recursive: true });
  await writeFile(
    path.join(COVERS_DIR, `${number}.svg`),
    buildCover({
      seed: `signal-${number}-${draft.title}`,
      kicker: `TRANSMISSION №${number}`,
      big: `№${number}`,
      type: draft.coverType,
    }),
  );
  // Keep the normalized draft. Pages are rendered once, so without the source a
  // template or design change could never reach dispatches already published —
  // npm run archive:rerender replays these through the current renderer.
  await mkdir(path.join(ROOT, 'data', 'dispatches'), { recursive: true });
  await writeFile(
    path.join(ROOT, 'data', 'dispatches', `${number}.json`),
    `${JSON.stringify({ ...draft, number, date: TODAY }, null, 2)}\n`,
  );

  await writeFile(path.join(ARCHIVE_DIR, `${number}.html`), renderPage(draft, { number, date: TODAY, prev }));
  await updateArchiveIndex(draft, number, TODAY);

  if (prev) {
    const prevFile = path.join(ARCHIVE_DIR, `${prev}.html`);
    let prevHtml = await readFile(prevFile, 'utf8');
    const nextLink = `<link rel="next" href="${SITE_URL}/archive/${number}.html">`;
    prevHtml = /<link rel="next"[^>]*>/.test(prevHtml)
      ? prevHtml.replace(/<link rel="next"[^>]*>/, nextLink)
      : prevHtml.replace('<link rel="canonical"', `${nextLink}\n<link rel="canonical"`);
    await writeFile(prevFile, prevHtml);
  }

  state.published = [
    { number, date: TODAY, title: draft.title, topicId: topic.id, keyword: draft.keyword, coverType: draft.coverType },
    ...(state.published || []),
  ];
  state.usedTopicIds = [...new Set([...(state.usedTopicIds || []), topic.id])];
  await saveState(state);

  let updated = recordStructure(craft, print);
  updated = recordRun(updated, {
    number,
    topicId: topic.id,
    outcome: 'published',
    title: draft.title,
    margins,
    warnings,
  });
  for (const warning of marginWarnings(margins)) {
    updated = recordLesson(updated, {
      tag: warning.startsWith('Similarity') ? 'margin:similarity' : 'margin:thin',
      observation: warning,
      action:
        warning.startsWith('Similarity')
          ? 'Choose a topic and framing further from what is already published.'
          : 'Push each section to a fuller argument rather than stopping at the minimum.',
    });
  }
  await saveCraft(updated);

  console.log('\n── Rebuilding covers, indexes, feeds, and sitemap');
  for (const script of ['covers', 'index', 'blog', 'series', 'issue', 'seo:agent']) {
    run('npm', ['run', script]);
  }

  console.log('\n── Committing and pushing');
  const status = run('git', ['status', '--porcelain'], { quiet: true }).output.trim();
  if (!status) {
    console.log('archive-compose: nothing to commit (unexpected, but not fatal).');
    return;
  }

  // Must be a GitHub noreply address. The account has email-privacy protection
  // enabled, so pushing a commit authored with a real address is rejected with
  // GH007 and the dispatch never reaches production.
  run('git', ['config', 'user.name', 'signal-archive-agent']);
  run('git', ['config', 'user.email', '240277128+ksksrbiz-arch@users.noreply.github.com']);
  run('git', ['add', 'archive', 'data', 'images/covers', 'blog', 'sitemap.xml', 'feed.xml', 'feed.json']);
  run('git', ['commit', '-m', `Publish archive transmission №${number}: ${draft.title}`]);

  let pushed = false;
  for (let attempt = 1; attempt <= 4; attempt += 1) {
    if (run('git', ['push', 'origin', 'HEAD:main'], { allowFailure: true }).ok) {
      pushed = true;
      break;
    }
    console.log(`  push attempt ${attempt} failed; rebasing on origin/main`);
    run('git', ['fetch', 'origin', 'main'], { allowFailure: true });
    run('git', ['rebase', 'origin/main'], { allowFailure: true });
  }
  if (!pushed) {
    console.error('archive-compose: committed locally but could not push to main after 4 attempts.');
    process.exit(1);
  }

  console.log(`\narchive-compose: published archive/${number}.html — "${draft.title}"`);

  const page = `${SITE_URL}/archive/${number}.html`;
  if (!run('npm', ['run', 'indexnow', '--', page, `${SITE_URL}/archive/`, `${SITE_URL}/blog/`], { allowFailure: true }).ok) {
    console.log('  IndexNow ping failed — discovery is best-effort, continuing.');
  }
}

main().catch((error) => {
  console.error(`archive-compose failed: ${error?.message || error}`);
  process.exit(1);
});
