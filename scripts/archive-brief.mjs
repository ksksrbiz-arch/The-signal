#!/usr/bin/env node
/**
 * archive-brief.mjs — prints the authoring brief for today's dispatch.
 *
 * Run at the START of the routine, before writing anything. It assembles
 * everything the author needs and cannot hold in their head across sessions:
 * the next unused topic, the house voice, the standing rubric earned from past
 * mistakes, open lessons, and a drift analysis of recent dispatches so the
 * writing does not converge on a formula.
 *
 * Usage: npm run archive:brief
 */

import { readFile } from 'node:fs/promises';
import path from 'node:path';

import {
  ARCHIVE_DIR,
  HOUSE_VOICE,
  MAX_SIMILARITY,
  MIN_SECTIONS,
  MIN_WORDS,
  existingNumbers,
  loadState,
  nextNumber,
  pickTopic,
  stripTags,
} from './archive-pipeline.mjs';
import { detectDrift, loadCraft } from './archive-craft.mjs';

function heading(text) {
  return `\n${'═'.repeat(72)}\n${text}\n${'═'.repeat(72)}`;
}

async function main() {
  const state = await loadState();
  const craft = await loadCraft();
  const topic = await pickTopic(state);
  const numbers = await existingNumbers();
  const number = nextNumber(numbers);

  const used = new Set(state.usedTopicIds || []);
  const remaining = (await import('./archive-topics.mjs')).archiveTopics.filter((t) => !used.has(t.id)).length;

  console.log(heading(`TODAY'S DISPATCH — archive/${number}.html`));
  console.log(`Topic id:   ${topic.id}`);
  console.log(`Working title: ${topic.title}`);
  console.log(`Angle:      ${topic.angle}`);
  console.log(`Search intent to own: ${topic.keyword}`);
  console.log(`\nTopics remaining in queue: ${remaining}`);
  if (remaining <= 14) console.log('WARNING: queue running low — add entries to scripts/archive-topics.mjs.');

  console.log(heading('HOUSE VOICE'));
  console.log(HOUSE_VOICE);

  console.log(heading('HARD REQUIREMENTS (enforced in code — a draft that misses these is refused)'));
  console.log(`- At least ${MIN_WORDS} words and ${MIN_SECTIONS} sections.`);
  console.log(`- Below ${MAX_SIMILARITY} shingle similarity against every existing dispatch.`);
  console.log('- No duplicate section headings.');
  console.log('- No banned phrasing (the AI-tell list in archive-pipeline.mjs).');
  console.log('- No unverifiable proof claims: no deploy counts, revenue movement, population');
  console.log('  statistics, cited studies, or client anecdotes. You do not know what shipped.');

  if (craft.rubric.length) {
    console.log(heading('STANDING RUBRIC — earned from past mistakes, satisfy every line'));
    for (const rule of craft.rubric) {
      console.log(`- [${rule.tag}] ${rule.rule}`);
      console.log(`    (${rule.reason})`);
    }
  }

  const openLessons = craft.lessons.filter((l) => !craft.rubric.some((r) => r.tag === l.tag));
  if (openLessons.length) {
    console.log(heading('OPEN LESSONS — seen once, not yet a rule'));
    for (const lesson of openLessons.slice(0, 12)) {
      console.log(`- [${lesson.tag}, ${lesson.count}×] ${lesson.observation}`);
      if (lesson.action) console.log(`    → ${lesson.action}`);
    }
  }

  const drift = detectDrift(craft.structures);
  if (drift.length) {
    console.log(heading('DRIFT WARNINGS — how the recent run of dispatches is converging'));
    for (const warning of drift) console.log(`- ${warning}`);
  }

  // The openings of recent dispatches, verbatim. The most direct way to avoid
  // repeating yourself is to see what you already wrote.
  const recent = numbers.slice(-5).reverse();
  if (recent.length) {
    console.log(heading('RECENT OPENINGS — do not echo these'));
    for (const n of recent) {
      try {
        const html = await readFile(path.join(ARCHIVE_DIR, `${n}.html`), 'utf8');
        const title = html.match(/<title>([^<]+)<\/title>/)?.[1] || '';
        const text = stripTags(html.slice(html.indexOf('<main')));
        console.log(`\n№${n} — ${title.replace(/ \| THE SIGNAL.*/, '')}`);
        console.log(`   "${text.trim().slice(0, 220)}…"`);
      } catch {
        /* a missing dispatch is not worth failing the brief over */
      }
    }
  }

  console.log(heading('WHEN THE DRAFT IS READY'));
  console.log('Write it to a JSON file and run:');
  console.log('    npm run archive:compose -- <path-to-draft.json>');
  console.log('\nShape:');
  console.log(
    JSON.stringify(
      {
        title: 'headline — specific, under 65 chars, no colon-subtitle pattern',
        subtitle: 'one clause sharpening the headline',
        lede: ['opening paragraph — lead with the claim', 'second paragraph'],
        pullQuote: 'one sentence worth setting apart',
        sections: [{ heading: 'a specific claim, not a label', paragraphs: ['…', '…'] }],
        takeaways: ['4-6 imperative sentences an operator can act on'],
        coverType: 'dispatch | build | strategy | system',
      },
      null,
      2,
    ),
  );
  console.log('\nCompose runs every gate. If it refuses, it tells you exactly why and records');
  console.log('the lesson — fix the draft and run it again rather than lowering a gate.');
}

main().catch((error) => {
  console.error(`archive-brief failed: ${error?.message || error}`);
  process.exit(1);
});
