#!/usr/bin/env node
/**
 * archive-craft.mjs — the self-improvement layer.
 *
 * The gates in archive-pipeline.mjs stop bad pages from shipping. They cannot
 * make the writing better. This module is the part that compounds: it measures
 * every dispatch that ships, remembers what went wrong, and feeds both back to
 * whoever writes the next one.
 *
 * The design constraint that shapes everything here: this site runs no
 * analytics ("No tracking. No analytics." is in the footer), so there is no
 * traffic signal to learn from. Improvement therefore has to come from
 * measurable properties of the work itself:
 *
 *   1. GATE MARGINS — not just pass/fail, but how close each run came to
 *      failing. A dispatch that passed similarity at 0.27 against a 0.28 limit
 *      is a warning about the next one, and only shows up if you record it.
 *   2. STRUCTURAL DRIFT — openings, heading shapes, section counts, sentence
 *      length. A writer converging on a formula is exactly how /daily/ decayed,
 *      and it is detectable long before a similarity gate would catch it.
 *   3. EXPLICIT LESSONS — a written note after a rejection or a near-miss,
 *      promoted to a standing rubric rule once the same problem recurs.
 *
 * Rule promotion is the mechanism that makes this a ratchet rather than a
 * diary: a lesson seen `PROMOTE_AFTER` times stops being advice and becomes a
 * rubric line the next author is told to satisfy before drafting.
 *
 * Store: data/archive-craft.json (committed, so the learning survives the
 * ephemeral routine sessions that produce it).
 */

import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const CRAFT_FILE = path.join(ROOT, 'data', 'archive-craft.json');

/** A lesson recurring this many times becomes a standing rubric rule. */
const PROMOTE_AFTER = 2;

/** How many recent dispatches the drift analysis looks at. */
const DRIFT_WINDOW = 8;

const EMPTY = {
  version: 1,
  rubric: [],
  lessons: [],
  runs: [],
  structures: [],
};

export async function loadCraft() {
  try {
    return { ...EMPTY, ...JSON.parse(await readFile(CRAFT_FILE, 'utf8')) };
  } catch {
    return structuredClone(EMPTY);
  }
}

export async function saveCraft(craft) {
  await mkdir(path.dirname(CRAFT_FILE), { recursive: true });
  await writeFile(CRAFT_FILE, `${JSON.stringify(craft, null, 2)}\n`);
}

/* ---------------------------- measurement ---------------------------- */

function sentences(text) {
  return String(text)
    .split(/(?<=[.!?])\s+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 1);
}

function wordCount(text) {
  return String(text).trim().split(/\s+/).filter(Boolean).length;
}

/**
 * A coarse shape for an opening sentence. The point is not linguistic accuracy
 * — it is having a stable label so "every dispatch opens the same way" becomes
 * visible in a count.
 */
export function openingShape(firstSentence) {
  const s = String(firstSentence).trim();
  if (/^(most|many|almost every|nearly every)\b/i.test(s)) return 'most-people-claim';
  if (/^(the|a|an)\s+\w+\s+(is|are|was|were)\b/i.test(s)) return 'definitional';
  if (/\b(fails?|breaks?|goes wrong|is wrong|does not work)\b/i.test(s)) return 'failure-first';
  if (/^(when|if|once|after|before)\b/i.test(s)) return 'conditional';
  if (/^(there is|there are|it is|this is)\b/i.test(s)) return 'existential';
  if (/\?$/.test(s)) return 'question';
  if (/^\w+ing\b/i.test(s)) return 'gerund';
  return 'other';
}

/** Structural fingerprint of one dispatch, used for drift detection. */
export function fingerprint(draft, number) {
  const lede = Array.isArray(draft.lede) ? draft.lede : [draft.lede];
  const first = sentences(lede[0] || '')[0] || '';
  const bodySentences = draft.sections.flatMap((s) => sentences(s.paragraphs.join(' ')));
  const lengths = bodySentences.map(wordCount);

  return {
    number,
    openingShape: openingShape(first),
    openingWords: first.split(/\s+/).slice(0, 3).join(' ').toLowerCase(),
    sections: draft.sections.length,
    headingWords: Math.round(
      draft.sections.reduce((sum, s) => sum + wordCount(s.heading), 0) / Math.max(draft.sections.length, 1),
    ),
    headingStartsWith: draft.sections.map((s) => s.heading.split(/\s+/)[0].toLowerCase()),
    avgSentenceWords: lengths.length ? Math.round(lengths.reduce((a, b) => a + b, 0) / lengths.length) : 0,
    sentenceVariance: lengths.length
      ? Math.round(Math.sqrt(lengths.reduce((sum, n) => sum + (n - lengths.reduce((a, b) => a + b, 0) / lengths.length) ** 2, 0) / lengths.length))
      : 0,
    words: wordCount(`${lede.join(' ')} ${draft.sections.map((s) => s.paragraphs.join(' ')).join(' ')}`),
  };
}

/**
 * Compare a fingerprint against the recent window and return concrete warnings.
 * These are the observations a writer cannot make about themselves in one
 * sitting, because they only exist across many dispatches.
 */
export function detectDrift(recent, incoming = null) {
  const window = recent.slice(0, DRIFT_WINDOW);
  const warnings = [];
  if (window.length < 3) return warnings;

  const tally = (values) =>
    values.reduce((acc, v) => acc.set(v, (acc.get(v) || 0) + 1), new Map());

  const shapes = tally(window.map((f) => f.openingShape));
  for (const [shape, count] of shapes) {
    if (count >= Math.max(3, Math.ceil(window.length * 0.5))) {
      warnings.push(
        `${count} of the last ${window.length} dispatches open with the "${shape}" move. Open the next one differently.`,
      );
    }
  }

  const openers = tally(window.map((f) => f.openingWords));
  for (const [phrase, count] of openers) {
    if (count >= 2 && phrase) warnings.push(`The phrase "${phrase}…" has opened ${count} recent dispatches. Avoid it.`);
  }

  const headingFirstWords = tally(window.flatMap((f) => f.headingStartsWith || []));
  for (const [word, count] of headingFirstWords) {
    if (count >= 5) warnings.push(`${count} recent section headings start with "${word}". Vary heading construction.`);
  }

  const avgSections = window.reduce((sum, f) => sum + f.sections, 0) / window.length;
  if (window.every((f) => f.sections === window[0].sections)) {
    warnings.push(`Every recent dispatch has exactly ${window[0].sections} sections. Let the argument set the count.`);
  } else if (incoming && Math.abs(incoming.sections - avgSections) < 0.3) {
    // Not a problem, just the baseline — no warning.
  }

  const lowVariance = window.filter((f) => f.sentenceVariance > 0 && f.sentenceVariance < 6);
  if (lowVariance.length >= 3) {
    warnings.push(
      `${lowVariance.length} recent dispatches have uniform sentence length (variance < 6 words). Mix short declaratives with longer explanatory sentences.`,
    );
  }

  if (incoming) {
    const sameShape = window.filter((f) => f.openingShape === incoming.openingShape).length;
    if (sameShape >= 2) {
      warnings.push(
        `This draft opens with "${incoming.openingShape}", which ${sameShape} of the last ${window.length} already used.`,
      );
    }
  }

  return warnings;
}

/* ---------------------------- learning ---------------------------- */

/**
 * Record a lesson. Repeats increment a counter rather than duplicating, and a
 * lesson seen PROMOTE_AFTER times is promoted into the standing rubric — the
 * ratchet that turns a one-off observation into a rule.
 */
export function recordLesson(craft, { tag, observation, action }) {
  const existing = craft.lessons.find((l) => l.tag === tag);
  if (existing) {
    existing.count += 1;
    existing.lastSeen = new Date().toISOString().slice(0, 10);
    if (action && !existing.action) existing.action = action;
  } else {
    craft.lessons.push({
      tag,
      observation,
      action: action || '',
      count: 1,
      firstSeen: new Date().toISOString().slice(0, 10),
      lastSeen: new Date().toISOString().slice(0, 10),
    });
  }

  const lesson = craft.lessons.find((l) => l.tag === tag);
  const alreadyRuled = craft.rubric.some((r) => r.tag === tag);
  if (lesson.count >= PROMOTE_AFTER && !alreadyRuled) {
    craft.rubric.push({
      tag,
      rule: lesson.action || lesson.observation,
      promotedAt: new Date().toISOString().slice(0, 10),
      reason: `Recurred ${lesson.count}× — promoted from lesson to standing rule.`,
    });
  }
  return craft;
}

export function recordRun(craft, entry) {
  craft.runs.unshift({ date: new Date().toISOString().slice(0, 10), ...entry });
  craft.runs = craft.runs.slice(0, 120);
  return craft;
}

export function recordStructure(craft, print) {
  craft.structures = [print, ...craft.structures.filter((f) => f.number !== print.number)].slice(0, 60);
  return craft;
}

/**
 * Gate margins: how close a passing draft came to being refused. Recording
 * these turns a binary pass into a gradient the next run can steer by.
 */
export function marginsFor({ words, minWords, similarity, maxSimilarity, sections, minSections }) {
  return {
    wordsOver: words - minWords,
    similarityHeadroom: Number((maxSimilarity - similarity).toFixed(3)),
    peakSimilarity: Number(similarity.toFixed(3)),
    sectionsOver: sections - minSections,
  };
}

export function marginWarnings(margins) {
  const out = [];
  if (margins.similarityHeadroom <= 0.05) {
    out.push(
      `Similarity came within ${margins.similarityHeadroom} of the limit (peak ${margins.peakSimilarity}). Pick a topic further from what is already published, and avoid reusing framings.`,
    );
  }
  if (margins.wordsOver <= 120) out.push(`Only ${margins.wordsOver} words above the minimum — the argument was probably thin.`);
  return out;
}
