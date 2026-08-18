#!/usr/bin/env node
/**
 * archive-agent.mjs — publishes one new archive transmission per run.
 *
 * Design constraints, in priority order:
 *
 * 1. NEVER REPEAT A TOPIC. The daily brief agent cycles seven themes with a
 *    modulo, which produced ~8 near-identical pages per theme and made the
 *    whole section unrankable. Here each topic in scripts/archive-topics.mjs is
 *    consumed once, recorded in data/archive-state.json, and never reused. The
 *    run also refuses to publish if the draft is too similar to an existing
 *    dispatch, so a repeat cannot slip through by another route.
 *
 * 2. NEVER FABRICATE PROOF. This site's whole claim is that its numbers are
 *    real. A model cannot know what shipped this week, so generated dispatches
 *    are analytical: no invented metrics, deploy counts, revenue figures,
 *    client names, or "this week I built X" claims. The transformer rejects
 *    drafts containing those patterns rather than publishing them.
 *
 * 3. PUBLISH NOTHING RATHER THAN PUBLISH FILLER. Every quality gate is fatal.
 *    A failed run exits non-zero with no file written, and the workflow makes
 *    no commit. A quiet day is cheaper than a thin page.
 *
 * Pipeline: plan (Groq, JSON outline) → draft (Groq, long-form) → edit (Gemini,
 * specificity + de-slop pass) → deterministic transform into the site's HTML.
 * Providers fall back to each other, so a rate-limited free tier is survivable.
 *
 * Env: GROQ_API_KEY and/or GEMINI_API_KEY. Optional: SIGNAL_DATE (YYYY-MM-DD),
 * ARCHIVE_TOPIC_ID (force a topic), DRY_RUN=1 (write nothing).
 */

import { mkdir, readFile, readdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { archiveTopics, findTopic } from './archive-topics.mjs';
import { buildCover } from './generate-covers.mjs';
import { complete, hasGemini, hasGroq, MODELS, parseJsonBlock, redact } from './llm-client.mjs';
import { buildChrome } from './lib/site-chrome.mjs';
import { escapeHtml, safeJsonLd } from './lib/html.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const ARCHIVE_DIR = path.join(ROOT, 'archive');
const STATE_FILE = path.join(ROOT, 'data', 'archive-state.json');
const COVERS_DIR = path.join(ROOT, 'images', 'covers');
const SITE_URL = 'https://1commercesolutions.com';
const CSS_VERSION = '20260711a';

const TODAY = process.env.SIGNAL_DATE || new Date().toISOString().slice(0, 10);
const DRY_RUN = process.env.DRY_RUN === '1';

const ARCHIVE_CHROME = buildChrome({ prefix: '../', active: 'Archive' });

const MIN_WORDS = 900;
const MIN_SECTIONS = 4;
const MAX_SIMILARITY = 0.28; // Jaccard over 5-word shingles against any existing dispatch.

/* ------------------------------ house voice ------------------------------ */

const SYSTEM = `You write for THE SIGNAL, the publication of 1Commerce LLC — a solo commerce-infrastructure operator in Canby, Oregon.

VOICE
- Direct, technical, unsentimental. You are talking to another operator who has shipped things.
- Concrete over abstract. Prefer a specific mechanism to a general principle.
- Willing to say a common practice is wrong, and to say why.
- Short declaratives mixed with longer explanatory sentences. No breathless tone.

HARD RULES — violating any of these makes the piece unpublishable:
- NEVER invent facts about 1Commerce, Keith, clients, revenue, traffic, deploy counts, dates, or "what shipped this week". You do not know these. Write analysis, not a personal build log.
- NEVER invent statistics, study results, survey data, percentages, or named sources. If a number is not something a reader could derive themselves, do not use it.
- NEVER use these phrases: "in today's fast-paced", "in the world of", "game changer", "leverage synergies", "dive deep", "unlock the power", "it's important to note", "at the end of the day", "revolutionize", "seamless", "cutting-edge", "landscape" (as metaphor), "delve".
- NEVER open with a dictionary definition or a rhetorical question.
- NEVER end with a generic call to action or a summary that restates the headings.

STRUCTURE
- Lead with the specific claim, not with context-setting.
- Every section must make an argument and support it with a mechanism, a trade-off, or a worked example.
- Name the counter-argument somewhere and answer it honestly.
- Concrete detail comes from reasoning about systems, not from invented anecdotes.`;

/* ------------------------------ state ------------------------------ */

async function loadState() {
  try {
    return JSON.parse(await readFile(STATE_FILE, 'utf8'));
  } catch {
    return { published: [], usedTopicIds: [] };
  }
}

async function saveState(state) {
  await mkdir(path.dirname(STATE_FILE), { recursive: true });
  await writeFile(STATE_FILE, `${JSON.stringify(state, null, 2)}\n`);
}

async function existingNumbers() {
  const entries = await readdir(ARCHIVE_DIR);
  return entries
    .map((name) => name.match(/^(\d{3})\.html$/)?.[1])
    .filter(Boolean)
    .sort();
}

function nextNumber(numbers) {
  const highest = numbers.length ? Math.max(...numbers.map(Number)) : 0;
  return String(highest + 1).padStart(3, '0');
}

/* --------------------------- text utilities --------------------------- */

function words(text) {
  return text.toLowerCase().replace(/[^a-z0-9\s]/g, ' ').split(/\s+/).filter(Boolean);
}

function shingles(text, size = 5) {
  const w = words(text);
  const set = new Set();
  for (let i = 0; i + size <= w.length; i += 1) set.add(w.slice(i, i + size).join(' '));
  return set;
}

function jaccard(a, b) {
  if (!a.size || !b.size) return 0;
  let intersection = 0;
  for (const item of a) if (b.has(item)) intersection += 1;
  return intersection / (a.size + b.size - intersection);
}

function stripTags(html) {
  return html.replace(/<script[\s\S]*?<\/script>/gi, ' ').replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ');
}

/* ------------------------- honesty + quality gates ------------------------- */

const BANNED_PHRASES = [
  "in today's fast-paced", 'in the world of', 'game changer', 'game-changer', 'leverage synergies',
  'dive deep', 'unlock the power', "it's important to note", 'it is important to note',
  'at the end of the day', 'revolutionize', 'cutting-edge', 'delve', 'in conclusion',
  'firstly', 'furthermore,', 'moreover,', 'navigating the', 'ever-evolving', 'testament to',
];

// Patterns that would put an unverifiable first-person proof claim on a site
// whose entire positioning is that its claims are checkable.
const FABRICATION_PATTERNS = [
  { re: /\bthis (?:week|month)\s+(?:i|we)\s+(?:shipped|built|launched|deployed|closed)/i, why: 'first-person claim about what shipped this period' },
  { re: /\b(?:i|we)\s+(?:shipped|deployed|launched)\s+\d+/i, why: 'invented deploy/ship count' },
  { re: /\b(?:our|my)\s+(?:revenue|mrr|arr|traffic)\s+(?:grew|rose|increased|hit|reached)/i, why: 'invented business metric' },
  { re: /\b\d+(?:\.\d+)?%\s+(?:of\s+)?(?:users|customers|operators|merchants|businesses|companies)\b/i, why: 'invented statistic about a population' },
  { re: /\baccording to (?:a|an|the)\s+(?:\d{4}\s+)?(?:study|survey|report|research)/i, why: 'invented cited source' },
  { re: /\b(?:study|survey|report)\s+(?:by|from)\s+[A-Z][a-z]+/i, why: 'invented named source' },
  { re: /\bwe (?:worked with|helped)\s+(?:a|an|our)\s+client\b/i, why: 'invented client anecdote' },
];

function checkQuality(draft, existingTexts) {
  const problems = [];
  const bodyText = draft.sections.map((s) => `${s.heading} ${s.paragraphs.join(' ')}`).join(' ');
  const full = `${draft.lede} ${bodyText}`;
  const wordCount = words(full).length;

  if (wordCount < MIN_WORDS) problems.push(`too short: ${wordCount} words (minimum ${MIN_WORDS})`);
  if (draft.sections.length < MIN_SECTIONS) problems.push(`too few sections: ${draft.sections.length} (minimum ${MIN_SECTIONS})`);

  const lower = full.toLowerCase();
  const banned = BANNED_PHRASES.filter((phrase) => lower.includes(phrase));
  if (banned.length) problems.push(`banned phrasing: ${banned.join(', ')}`);

  for (const { re, why } of FABRICATION_PATTERNS) {
    const hit = full.match(re);
    if (hit) problems.push(`possible fabricated claim (${why}): "${redact(hit[0])}"`);
  }

  const draftShingles = shingles(full);
  for (const { label, text } of existingTexts) {
    const score = jaccard(draftShingles, shingles(text));
    if (score > MAX_SIMILARITY) {
      problems.push(`too similar to ${label}: ${(score * 100).toFixed(1)}% shingle overlap (max ${MAX_SIMILARITY * 100}%)`);
    }
  }

  // Repeated headings are the clearest structural tell of a padded draft.
  const headings = draft.sections.map((s) => s.heading.toLowerCase().trim());
  if (new Set(headings).size !== headings.length) problems.push('duplicate section headings');

  return problems;
}

/* ------------------------------ pipeline ------------------------------ */

async function planStage(topic) {
  const prompt = `Plan a long-form dispatch for THE SIGNAL.

TOPIC: ${topic.title}
ANGLE: ${topic.angle}
TARGET SEARCH INTENT: ${topic.keyword}

Produce an outline as JSON with exactly this shape:
{
  "thesis": "one sentence — the specific, arguable claim the piece defends",
  "counterpoint": "the strongest honest objection to the thesis",
  "sections": [
    { "heading": "specific, not generic", "argument": "what this section proves", "mechanism": "the concrete mechanism, trade-off, or worked example that supports it" }
  ]
}

Requirements:
- 5 or 6 sections.
- Headings must be specific claims or questions, never one-word labels like "Introduction", "Overview", "Benefits", "Conclusion".
- Each mechanism must be something derivable by reasoning about how the system works — never a statistic, study, or anecdote.
- The thesis must be arguable. If a reasonable operator could not disagree with it, it is too weak.

Return only the JSON object.`;

  const raw = await complete({ system: SYSTEM, prompt, temperature: 0.75, maxTokens: 2048, json: true });
  const plan = parseJsonBlock(raw);

  if (!plan?.thesis || !Array.isArray(plan.sections) || plan.sections.length < MIN_SECTIONS) {
    throw new Error(`plan stage returned an unusable outline: ${redact(JSON.stringify(plan).slice(0, 300))}`);
  }
  return plan;
}

async function draftStage(topic, plan) {
  const outline = plan.sections
    .map((s, i) => `${i + 1}. ${s.heading}\n   argument: ${s.argument}\n   mechanism: ${s.mechanism}`)
    .join('\n');

  const prompt = `Write the full dispatch from this outline.

TOPIC: ${topic.title}
THESIS: ${plan.thesis}
COUNTERPOINT TO ADDRESS: ${plan.counterpoint}

OUTLINE:
${outline}

Return JSON with exactly this shape:
{
  "title": "the headline — specific, under 65 characters, no colon-subtitle pattern",
  "subtitle": "one clause that sharpens the headline",
  "lede": "2-3 paragraphs opening the piece, separated by \\n\\n — start with the claim, not with context",
  "pullQuote": "one sentence from the piece worth setting apart",
  "sections": [ { "heading": "...", "paragraphs": ["...", "..."] } ],
  "takeaways": ["4-6 imperative sentences an operator can act on"],
  "coverType": "one of: dispatch, build, strategy, system"
}

Requirements:
- 180-320 words per section, across 2-4 paragraphs.
- Total length 1100-1600 words.
- Address the counterpoint honestly inside one of the sections.
- No statistics, no studies, no client stories, no claims about what 1Commerce shipped.
- Plain prose. No markdown formatting, no bold, no bullet characters inside paragraphs.

Return only the JSON object.`;

  const raw = await complete({ system: SYSTEM, prompt, temperature: 0.8, maxTokens: 8192, json: true });
  const draft = parseJsonBlock(raw);

  if (!draft?.title || !draft?.lede || !Array.isArray(draft.sections)) {
    throw new Error(`draft stage returned an unusable draft: ${redact(JSON.stringify(draft).slice(0, 300))}`);
  }
  return draft;
}

async function editStage(draft) {
  const prompt = `Edit this dispatch. Return the same JSON shape, with the same keys, edited.

${JSON.stringify(draft, null, 2)}

Editing pass — apply all of these:
1. Delete every sentence that only restates the previous one. Padding is the main defect to remove.
2. Replace vague phrasing with the specific mechanism. "This can cause problems" becomes the actual failure.
3. Remove any statistic, percentage, study reference, or claim about a specific company, client, or shipped work. If a sentence depends on one, rewrite it as reasoning.
4. Cut these if present: "in today's fast-paced", "in the world of", "game changer", "dive deep", "it's important to note", "at the end of the day", "revolutionize", "cutting-edge", "delve", "in conclusion", "firstly", "furthermore", "moreover", "ever-evolving", "testament to", "landscape" as metaphor.
5. Vary sentence length. Consecutive sentences of the same shape read as generated.
6. Make the first sentence of the lede carry the claim.
7. Keep total length between 1100 and 1600 words. Cut rather than pad.

Return only the edited JSON object, no commentary.`;

  // Gemini first here: the edit pass benefits from a different model than the
  // one that wrote the draft, which catches self-consistent padding.
  const raw = await complete({ system: SYSTEM, prompt, temperature: 0.4, maxTokens: 8192, json: true }, ['gemini', 'groq']);
  const edited = parseJsonBlock(raw);

  if (!edited?.title || !Array.isArray(edited.sections) || !edited.sections.length) {
    console.warn('edit stage returned an unusable object — falling back to the unedited draft');
    return draft;
  }
  // Preserve fields the editor may have dropped.
  return {
    ...draft,
    ...edited,
    takeaways: Array.isArray(edited.takeaways) && edited.takeaways.length ? edited.takeaways : draft.takeaways,
    coverType: edited.coverType || draft.coverType,
  };
}

/* ------------------------------ transformer ------------------------------ */

const VALID_COVER_TYPES = new Set(['dispatch', 'build', 'strategy', 'system']);

function normalize(draft, topic) {
  const clean = (value) =>
    String(value ?? '')
      .replace(/\*\*/g, '')
      .replace(/^#+\s*/gm, '')
      .replace(/^[-*•]\s*/gm, '')
      .replace(/\s+/g, ' ')
      .trim();

  const sections = (draft.sections || [])
    .map((s) => ({
      heading: clean(s.heading),
      paragraphs: (Array.isArray(s.paragraphs) ? s.paragraphs : [s.paragraphs])
        .map(clean)
        .filter((p) => p.length > 40),
    }))
    .filter((s) => s.heading && s.paragraphs.length);

  const lede = String(draft.lede || '')
    .split(/\n\n+/)
    .map(clean)
    .filter((p) => p.length > 40);

  return {
    title: clean(draft.title).replace(/^["']|["']$/g, ''),
    subtitle: clean(draft.subtitle),
    lede,
    pullQuote: clean(draft.pullQuote),
    sections,
    takeaways: (draft.takeaways || []).map(clean).filter(Boolean),
    coverType: VALID_COVER_TYPES.has(draft.coverType) ? draft.coverType : 'dispatch',
    keyword: topic.keyword,
    topicId: topic.id,
  };
}

function metaDescription(draft) {
  const source = draft.lede[0] || draft.subtitle || draft.title;
  if (source.length <= 155) return source;
  const cut = source.slice(0, 155);
  return `${cut.slice(0, cut.lastIndexOf(' '))}…`;
}

function slugId(heading, index) {
  const base = heading.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  return base ? base.slice(0, 48) : `section-${index + 1}`;
}

const ROMAN = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X'];

function renderPage(draft, { number, date, prev }) {
  const url = `${SITE_URL}/archive/${number}.html`;
  const description = metaDescription(draft);
  const readMinutes = Math.max(
    4,
    Math.round(words(`${draft.lede.join(' ')} ${draft.sections.map((s) => s.paragraphs.join(' ')).join(' ')}`).length / 220),
  );
  const humanDate = new Date(`${date}T00:00:00Z`).toLocaleDateString('en-US', {
    year: 'numeric', month: 'long', day: 'numeric', timeZone: 'UTC',
  });

  const article = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: draft.title,
    description,
    keywords: draft.keyword,
    datePublished: date,
    dateModified: date,
    articleSection: 'Weekly Dispatch',
    inLanguage: 'en-US',
    author: { '@type': 'Person', name: 'Keith' },
    publisher: { '@type': 'Organization', name: '1Commerce LLC', url: SITE_URL },
    mainEntityOfPage: url,
    image: `${SITE_URL}/images/covers/${number}.svg`,
    wordCount: words(draft.sections.map((s) => s.paragraphs.join(' ')).join(' ')).length,
  };

  const breadcrumbs = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'THE SIGNAL', item: `${SITE_URL}/` },
      { '@type': 'ListItem', position: 2, name: 'Archive', item: `${SITE_URL}/archive/` },
      { '@type': 'ListItem', position: 3, name: draft.title, item: url },
    ],
  };

  const sectionsHtml = draft.sections
    .map(
      (s, i) => `      <article class="dispatch" id="${slugId(s.heading, i)}">
        <div class="dispatch-numeral" aria-hidden="true">${ROMAN[i] || i + 1}</div>
        <h2>${escapeHtml(s.heading)}</h2>
${s.paragraphs.map((p) => `        <p>${escapeHtml(p)}</p>`).join('\n')}
      </article>`,
    )
    .join('\n');

  return `<!DOCTYPE html>
<html lang="en" data-theme="dark">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<meta name="robots" content="index, follow, max-snippet:-1, max-image-preview:large">
<title>THE SIGNAL — Transmission №${number} | ${escapeHtml(draft.title)}</title>
<meta name="description" content="${escapeHtml(description)}">
<meta name="keywords" content="${escapeHtml(draft.keyword)}, THE SIGNAL, 1Commerce LLC">
<link rel="canonical" href="${url}">
${prev ? `<link rel="prev" href="${SITE_URL}/archive/${prev}.html">\n` : ''}<meta property="og:title" content="THE SIGNAL №${number} — ${escapeHtml(draft.title)}">
<meta property="og:description" content="${escapeHtml(description)}">
<meta property="og:type" content="article">
<meta property="og:url" content="${url}">
<meta property="og:site_name" content="THE SIGNAL">
<meta property="og:image" content="${SITE_URL}/images/covers/${number}.svg">
<meta property="og:image:alt" content="THE SIGNAL Transmission ${number} — ${escapeHtml(draft.title)}">
<meta property="og:locale" content="en_US">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="THE SIGNAL №${number} — ${escapeHtml(draft.title)}">
<meta name="twitter:description" content="${escapeHtml(description)}">
<meta name="twitter:image" content="${SITE_URL}/images/covers/${number}.svg">
<meta name="twitter:image:alt" content="THE SIGNAL Transmission ${number} — ${escapeHtml(draft.title)}">
<meta name="author" content="Keith">
<meta name="geo.region" content="US-OR">
<meta name="geo.placename" content="Canby, Oregon">
<meta name="theme-color" content="#E8B86A">
<link rel="icon" type="image/svg+xml" href="/assets/brand/favicon.svg">
<link rel="icon" type="image/png" sizes="32x32" href="/assets/brand/favicon-32.png">
<link rel="apple-touch-icon" sizes="180x180" href="/assets/brand/apple-touch-icon.png">
<link rel="manifest" href="/manifest.json">
<link rel="alternate" type="application/rss+xml" title="THE SIGNAL — Weekly Dispatches" href="/feed.xml">
<meta name="apple-mobile-web-app-capable" content="yes">
<meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">
<meta name="apple-mobile-web-app-title" content="THE SIGNAL">
<link rel="stylesheet" href="../base.css?v=${CSS_VERSION}">
<link rel="stylesheet" href="../style.css?v=${CSS_VERSION}">
<style>
.tx-wrap{max-width:820px;margin:0 auto;padding:clamp(48px,7vw,88px) 24px}
.tx-kicker{font-family:var(--font-mono);font-size:12px;letter-spacing:.18em;text-transform:uppercase;color:var(--verified);margin:0 0 18px}
.tx-title{font-family:var(--font-display);font-size:clamp(2.3rem,6.4vw,4rem);line-height:1.06;margin:0 0 16px;color:var(--text)}
.tx-sub{font-family:var(--font-display);font-size:clamp(1.05rem,2vw,1.3rem);line-height:1.55;color:#DFD3BA;margin:0 0 24px}
.tx-meta{font-family:var(--font-mono);font-size:12px;color:var(--faint);letter-spacing:.06em;margin:0 0 40px}
.tx-cover{width:100%;height:auto;border:1px solid var(--rule);border-radius:var(--r);margin:0 0 44px;display:block}
.tx-lede p{font-size:19px;line-height:1.75;color:#DFD3BA;margin:0 0 20px}
.dispatch{border-top:1px solid var(--rule);padding-top:30px;margin-top:38px;position:relative}
.dispatch-numeral{font-family:var(--font-mono);font-size:11px;letter-spacing:.2em;color:var(--verified);opacity:.75;margin-bottom:10px}
.dispatch h2{font-family:var(--font-display);font-size:clamp(1.4rem,3vw,1.8rem);line-height:1.25;color:var(--text);margin:0 0 14px}
.dispatch p{font-size:18px;line-height:1.78;color:var(--muted);margin:0 0 18px}
.tx-quote{margin:44px 0;padding:26px 28px;border-left:3px solid var(--verified);background:rgba(232,184,106,.06)}
.tx-quote p{font-family:var(--font-display);font-size:clamp(1.15rem,2.4vw,1.45rem);line-height:1.5;color:var(--text);margin:0}
.tx-takeaways{margin:44px 0 0;padding:26px 28px;border:1px solid var(--rule);background:var(--panel);border-radius:var(--r)}
.tx-takeaways h2{font-family:var(--font-mono);font-size:12px;letter-spacing:.14em;text-transform:uppercase;color:var(--verified);margin:0 0 16px}
.tx-takeaways ul{margin:0;padding-left:20px;color:var(--muted);line-height:1.75}
.tx-takeaways li{margin-bottom:10px}
.tx-foot{margin-top:44px;padding-top:24px;border-top:1px solid var(--rule);font-family:var(--font-mono);font-size:12px;color:var(--faint);line-height:1.8}
.tx-foot a{color:var(--verified)}
</style>
<script type="application/ld+json">
${safeJsonLd(article)}
</script>
<script type="application/ld+json">
${safeJsonLd(breadcrumbs)}
</script>
</head>
<body>
${ARCHIVE_CHROME.header}
<main id="main" class="tx-wrap">
  <p class="tx-kicker">◈ Field Transmission · №${number} · ${humanDate} ◈</p>
  <h1 class="tx-title">${escapeHtml(draft.title)}</h1>
${draft.subtitle ? `  <p class="tx-sub">${escapeHtml(draft.subtitle)}</p>\n` : ''}  <p class="tx-meta">${readMinutes} min read · <a href="./">Archive</a> · <a href="../playbooks/">Playbooks</a> · <a href="../fieldnotes/">Fieldnotes</a></p>

  <img class="tx-cover" src="../images/covers/${number}.svg" alt="THE SIGNAL Transmission ${number} — ${escapeHtml(draft.title)}" width="1200" height="630" loading="eager" decoding="async">

  <div class="tx-lede">
${draft.lede.map((p) => `    <p>${escapeHtml(p)}</p>`).join('\n')}
  </div>

${sectionsHtml}

${draft.pullQuote ? `  <section class="tx-quote">\n    <p>${escapeHtml(draft.pullQuote)}</p>\n  </section>\n` : ''}
${draft.takeaways.length
      ? `  <section class="tx-takeaways">
    <h2>Operator moves</h2>
    <ul>
${draft.takeaways.map((t) => `      <li>${escapeHtml(t)}</li>`).join('\n')}
    </ul>
  </section>`
      : ''}

  <div class="tx-foot">
    <p>Transmission №${number} · ${humanDate} · THE SIGNAL · 1Commerce LLC${prev ? ` · <a href="./${prev}.html">Previous: №${prev}</a>` : ''}</p>
    <p>This transmission is analysis, not a build report. Verified build claims live in <a href="../builds/">Verified Builds</a>; the operating playbooks live in <a href="../playbooks/">Playbooks</a>.</p>
  </div>
</main>
${ARCHIVE_CHROME.footer}
<script src="../app.js?v=${CSS_VERSION}" defer></script>
</body>
</html>
`;
}

/* --------------------- archive index insertion --------------------- */

function listItemHtml(draft, number, date) {
  const shortDate = new Date(`${date}T00:00:00Z`).toLocaleDateString('en-US', {
    year: 'numeric', month: 'short', day: 'numeric', timeZone: 'UTC',
  });
  const typeLabel = { dispatch: 'Dispatch', build: 'Build Update', strategy: 'Strategy', system: 'System' }[draft.coverType] || 'Dispatch';
  const quote = draft.pullQuote || draft.lede[0] || draft.subtitle;

  return `          <li class="arc-item" data-type="${draft.coverType}">
            <a href="./${number}.html" class="arc-item-link">
              <div class="arc-item-media">
                <img src="../images/covers/${number}.svg" alt="THE SIGNAL — Dispatch №${number}: ${escapeHtml(draft.title)}" loading="lazy" decoding="async">
              </div>
              <div class="arc-item-body">
                <div class="arc-item-meta">
                  <span class="arc-item-week">№${number}</span>
                  <span class="arc-meta-sep">·</span>
                  <time datetime="${date}">${shortDate}</time>
                  <span class="arc-meta-sep">·</span>
                  <span class="arc-type-badge">${typeLabel}</span>
                </div>
                <h3 class="arc-item-title">${escapeHtml(draft.title)}</h3>
                <p class="arc-item-quote">"${escapeHtml(quote)}"</p>
              </div>
              <span class="arc-item-arrow" aria-hidden="true">→</span>
            </a>
          </li>`;
}

async function updateArchiveIndex(draft, number, date) {
  const file = path.join(ARCHIVE_DIR, 'index.html');
  let html = await readFile(file, 'utf8');

  // Promote the new dispatch into the "Latest" featured slot.
  const quote = draft.pullQuote || draft.lede[0] || draft.subtitle;
  const humanDate = new Date(`${date}T00:00:00Z`).toLocaleDateString('en-US', {
    year: 'numeric', month: 'long', day: 'numeric', timeZone: 'UTC',
  });
  const typeLabel = { dispatch: 'Dispatch', build: 'Build Update', strategy: 'Strategy', system: 'System' }[draft.coverType] || 'Dispatch';

  const featured = html.match(/<a href="\.\/\d{3}\.html" class="arc-featured">[\s\S]*?<\/a>/);
  if (!featured) throw new Error('archive index: could not find the featured dispatch block');
  html = html.replace(
    featured[0],
    `<a href="./${number}.html" class="arc-featured">
          <div class="arc-featured-media">
            <img src="../images/covers/${number}.svg" alt="THE SIGNAL — Dispatch №${number}: ${escapeHtml(draft.title)}" loading="eager" decoding="async">
          </div>
          <div class="arc-featured-body">
            <div class="arc-badge">Latest · №${number}</div>
            <h2 class="arc-featured-title">${escapeHtml(draft.title)}</h2>
            <p class="arc-featured-quote">"${escapeHtml(quote)}"</p>
            <div class="arc-featured-meta">
              <time datetime="${date}">${humanDate} · ${typeLabel}</time>
            </div>
            <span class="arc-featured-cta">Read the dispatch <span aria-hidden="true">→</span></span>
          </div>
        </a>`,
  );

  // Insert the new dispatch at the head of the scannable list.
  const anchor = html.match(/\n[ \t]*<li class="arc-item"[^>]*>/);
  if (!anchor) throw new Error('archive index: could not find the dispatch list to insert into');
  html = html.replace(anchor[0], `\n${listItemHtml(draft, number, date)}\n${anchor[0].replace(/^\n/, '')}`);

  // Add the dispatch to the ItemList schema as position 1 and renumber the rest.
  const listItem = `    {
      "@type": "ListItem",
      "position": 1,
      "item": {
        "@type": "Article",
        "name": ${JSON.stringify(draft.title)},
        "url": "${SITE_URL}/archive/${number}.html",
        "datePublished": "${date}",
        "description": ${JSON.stringify(metaDescription(draft))},
        "author": {"@type": "Organization", "name": "1Commerce LLC"}
      }
    },
`;
  const firstItem = html.indexOf('    {\n      "@type": "ListItem",');
  if (firstItem !== -1) {
    let position = 1;
    html = `${html.slice(0, firstItem)}${listItem}${html.slice(firstItem)}`.replace(
      /"position": \d+/g,
      () => `"position": ${position++}`,
    );
  }

  await writeFile(file, html);
}

/* ------------------------------ main ------------------------------ */

async function collectExistingTexts() {
  const numbers = await existingNumbers();
  const texts = [];
  for (const n of numbers) {
    const html = await readFile(path.join(ARCHIVE_DIR, `${n}.html`), 'utf8');
    texts.push({ label: `archive/${n}.html`, text: stripTags(html) });
  }
  return texts;
}

async function pickTopic(state) {
  if (process.env.ARCHIVE_TOPIC_ID) {
    const forced = findTopic(process.env.ARCHIVE_TOPIC_ID);
    if (!forced) throw new Error(`ARCHIVE_TOPIC_ID "${process.env.ARCHIVE_TOPIC_ID}" is not in the topic queue`);
    return forced;
  }

  const used = new Set(state.usedTopicIds || []);
  const remaining = archiveTopics.filter((topic) => !used.has(topic.id));

  if (!remaining.length) {
    throw new Error(
      'the topic queue is exhausted — add entries to scripts/archive-topics.mjs. ' +
        'Refusing to republish a used topic, which is what made /daily/ unrankable.',
    );
  }
  if (remaining.length <= 14) {
    console.warn(`WARNING: only ${remaining.length} unused topics remain. Add more to scripts/archive-topics.mjs.`);
  }
  return remaining[0];
}

async function main() {
  if (!hasGroq() && !hasGemini()) {
    throw new Error('no LLM provider configured — set GROQ_API_KEY and/or GEMINI_API_KEY');
  }
  console.log(`archive-agent: date=${TODAY} groq=${hasGroq() ? MODELS.groqLarge : 'off'} gemini=${hasGemini() ? MODELS.gemini : 'off'}`);

  const state = await loadState();
  const topic = await pickTopic(state);
  const numbers = await existingNumbers();
  const number = nextNumber(numbers);
  const prev = numbers.length ? numbers[numbers.length - 1] : null;

  console.log(`archive-agent: topic="${topic.id}" → archive/${number}.html`);

  const plan = await planStage(topic);
  console.log(`archive-agent: planned ${plan.sections.length} sections`);

  const rawDraft = await draftStage(topic, plan);
  const edited = await editStage(rawDraft);
  const draft = normalize(edited, topic);
  console.log(`archive-agent: drafted "${draft.title}" (${draft.sections.length} sections)`);

  const existingTexts = await collectExistingTexts();
  const problems = checkQuality(draft, existingTexts);
  if (problems.length) {
    console.error('archive-agent: quality gates failed — publishing nothing.');
    for (const problem of problems) console.error(`  · ${problem}`);
    process.exit(1);
  }
  console.log('archive-agent: quality gates passed');

  if (DRY_RUN) {
    console.log(`archive-agent: DRY_RUN — would publish archive/${number}.html "${draft.title}"`);
    return;
  }

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

  await writeFile(path.join(ARCHIVE_DIR, `${number}.html`), renderPage(draft, { number, date: TODAY, prev }));
  await updateArchiveIndex(draft, number, TODAY);

  // Point the previous dispatch forward at this one.
  if (prev) {
    const prevFile = path.join(ARCHIVE_DIR, `${prev}.html`);
    let prevHtml = await readFile(prevFile, 'utf8');
    const nextLink = `<link rel="next" href="${SITE_URL}/archive/${number}.html">`;
    if (/<link rel="next"[^>]*>/.test(prevHtml)) {
      prevHtml = prevHtml.replace(/<link rel="next"[^>]*>/, nextLink);
    } else {
      prevHtml = prevHtml.replace('<link rel="canonical"', `${nextLink}\n<link rel="canonical"`);
    }
    await writeFile(prevFile, prevHtml);
  }

  state.published = [
    { number, date: TODAY, title: draft.title, topicId: topic.id, keyword: draft.keyword, coverType: draft.coverType },
    ...(state.published || []),
  ];
  state.usedTopicIds = [...new Set([...(state.usedTopicIds || []), topic.id])];
  await saveState(state);

  console.log(`archive-agent: published archive/${number}.html — "${draft.title}"`);
}

// Exported so scripts/test-archive-agent.mjs can exercise the deterministic
// layer — transformer, gates, renderer — without API keys or network access.
export const __test = { normalize, checkQuality, renderPage, metaDescription, jaccard, shingles, updateArchiveIndex, listItemHtml };

if (process.argv[1] && path.resolve(process.argv[1]) === path.resolve(fileURLToPath(import.meta.url))) {
  main().catch((error) => {
    console.error(`archive-agent failed: ${redact(error?.message)}`);
    process.exit(1);
  });
}
