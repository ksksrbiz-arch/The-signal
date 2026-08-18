#!/usr/bin/env node
/**
 * archive-pipeline.mjs — the deterministic half of archive publishing.
 *
 * Authoring is done by Claude in the routine session (see CLAUDE.md). This
 * module is everything that must NOT depend on a model's judgement: topic
 * selection, the quality gates, the transformer, the page renderer, the archive
 * index update, and the state file. Separating them this way means the writing
 * can get better over time while the guarantees stay fixed and testable.
 *
 * The gates are the whole point. They exist because a previous generator
 * produced 54 near-identical pages that suppressed the entire site, so they are
 * enforced in code rather than trusted to whoever is drafting:
 *
 *   - a topic is consumed once and never reused
 *   - a draft too close to any existing dispatch is refused
 *   - drafts making unverifiable first-person proof claims are refused, because
 *     this site's positioning is that its claims are checkable
 *
 * Consumed by scripts/archive-compose.mjs and scripts/test-archive-agent.mjs.
 */

import { mkdir, readFile, readdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { archiveTopics, findTopic } from './archive-topics.mjs';
import { buildCover } from './generate-covers.mjs';
import { buildChrome } from './lib/site-chrome.mjs';
import { playbooks } from './playbooks-content.mjs';
import { escapeHtml, safeJsonLd } from './lib/html.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const ARCHIVE_DIR = path.join(ROOT, 'archive');
const STATE_FILE = path.join(ROOT, 'data', 'archive-state.json');
const COVERS_DIR = path.join(ROOT, 'images', 'covers');
const SITE_URL = 'https://1commercesolutions.com';
const CSS_VERSION = '20260711a';

const TODAY = process.env.SIGNAL_DATE || new Date().toISOString().slice(0, 10);

const ARCHIVE_CHROME = buildChrome({ prefix: '../', active: 'Archive' });

const MIN_WORDS = 900;
const MIN_SECTIONS = 4;
const MAX_SIMILARITY = 0.28; // Jaccard over 5-word shingles against any existing dispatch.

/* ------------------------------ house voice ------------------------------ */

// The authoring brief. scripts/archive-brief.mjs prints this to whoever is
// writing (now Claude, in the routine session) alongside the accumulated
// craft lessons. It is data, not a model prompt.
export const HOUSE_VOICE = `You write for THE SIGNAL, the publication of 1Commerce LLC — a solo commerce-infrastructure operator in Canby, Oregon.

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
    if (hit) problems.push(`possible fabricated claim (${why}): "${hit[0].slice(0, 120)}"`);
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

  const sectionHtml = (s, i) => `      <article class="dispatch" id="${slugId(s.heading, i)}">
        <div class="dispatch-numeral" aria-hidden="true">${ROMAN[i] || i + 1}</div>
        <h2>${escapeHtml(s.heading)}</h2>
${s.paragraphs.map((p) => `        <p>${escapeHtml(p)}</p>`).join('\n')}
      </article>`;

  // The subscribe block goes after the second section: late enough that the
  // reader has seen the argument work, early enough that most readers who will
  // ever reach it still have. Asking above the fold converts worse and costs
  // attention before any value has been delivered.
  const ctaAfter = Math.min(2, draft.sections.length - 1);
  const sectionsHtml = draft.sections
    .map((s, i) => (i === ctaAfter ? `${sectionHtml(s, i)}\n${SUBSCRIBE_BLOCK}` : sectionHtml(s, i)))
    .join('\n');

  const tocItems = draft.sections
    .map((s, i) => `      <li><a href="#${slugId(s.heading, i)}">${escapeHtml(s.heading)}</a></li>`)
    .join('\n');

  // Where a finishing reader goes next. Playbooks first: they are the evergreen
  // pages built to rank and be revisited, so moving a reader from a dated
  // dispatch into one is the most valuable hop on the site.
  const related = relatedPlaybooks(draft);
  const playbookCards = related.length
    ? related.map(
      (pb) => `        <a class="tx-card" href="../playbooks/${pb.slug}.html">
          <span class="k">Playbook</span>
          <span class="t">${escapeHtml(pb.navTitle)}</span>
          <span class="d">${escapeHtml(pb.dek)}</span>
        </a>`,
      )
    : [
        `        <a class="tx-card" href="../playbooks/">
          <span class="k">Playbooks</span>
          <span class="t">The operator playbooks</span>
          <span class="d">Seven evergreen guides to the systems behind these dispatches.</span>
        </a>`,
      ];

  const nextCards = [
    ...playbookCards,
    prev
      ? `        <a class="tx-card" href="./${prev}.html">
          <span class="k">Previous transmission</span>
          <span class="t">№${prev}</span>
          <span class="d">The dispatch before this one.</span>
        </a>`
      : '',
    `        <a class="tx-card" href="../fieldnotes/">
          <span class="k">Fieldnotes</span>
          <span class="t">The working notebook</span>
          <span class="d">Longer build logs and system notes, published most Saturdays.</span>
        </a>`,
  ]
    .filter(Boolean)
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
/* Reading-first layout. The measure is capped near 68 characters because that
   is where sustained reading stays comfortable; the sidebar sits outside it so
   navigation never competes with the text column. */
.tx-progress{position:fixed;top:0;left:0;height:2px;width:100%;background:transparent;z-index:60}
.tx-progress span{display:block;height:100%;width:0;background:var(--verified);transition:width .1s linear}
.tx-shell{max-width:1180px;margin:0 auto;padding:clamp(44px,6vw,80px) 24px;display:grid;grid-template-columns:minmax(0,1fr);gap:0}
.tx-wrap{max-width:68ch;width:100%}
.tx-kicker{font-family:var(--font-mono);font-size:12px;letter-spacing:.18em;text-transform:uppercase;color:var(--verified);margin:0 0 18px}
.tx-title{font-family:var(--font-display);font-size:clamp(2.2rem,6vw,3.6rem);line-height:1.07;margin:0 0 16px;color:var(--text);letter-spacing:-.01em}
.tx-sub{font-family:var(--font-display);font-size:clamp(1.05rem,2vw,1.3rem);line-height:1.55;color:#DFD3BA;margin:0 0 22px}
.tx-meta{font-family:var(--font-mono);font-size:12px;color:var(--faint);letter-spacing:.06em;margin:0 0 36px;display:flex;flex-wrap:wrap;gap:10px;align-items:center}
.tx-meta a{color:var(--faint)}.tx-meta a:hover{color:var(--verified)}
.tx-dot{opacity:.4}
.tx-cover{width:100%;height:auto;border:1px solid var(--rule);border-radius:var(--r);margin:0 0 44px;display:block}
.tx-lede p{font-size:19.5px;line-height:1.75;color:#DFD3BA;margin:0 0 20px}
.dispatch{border-top:1px solid var(--rule);padding-top:30px;margin-top:38px;scroll-margin-top:90px}
.dispatch-numeral{font-family:var(--font-mono);font-size:11px;letter-spacing:.2em;color:var(--verified);opacity:.75;margin-bottom:10px}
.dispatch h2{font-family:var(--font-display);font-size:clamp(1.4rem,3vw,1.85rem);line-height:1.25;color:var(--text);margin:0 0 14px;letter-spacing:-.005em}
.dispatch p{font-size:18px;line-height:1.8;color:var(--muted);margin:0 0 18px}
.tx-quote{margin:44px 0;padding:26px 28px;border-left:3px solid var(--verified);background:rgba(232,184,106,.06)}
.tx-quote p{font-family:var(--font-display);font-size:clamp(1.15rem,2.4vw,1.45rem);line-height:1.5;color:var(--text);margin:0}
.tx-takeaways{margin:44px 0 0;padding:26px 28px;border:1px solid var(--rule);background:var(--panel);border-radius:var(--r)}
.tx-takeaways h2{font-family:var(--font-mono);font-size:12px;letter-spacing:.14em;text-transform:uppercase;color:var(--verified);margin:0 0 16px}
.tx-takeaways ul{margin:0;padding-left:20px;color:var(--muted);line-height:1.75}
.tx-takeaways li{margin-bottom:10px}

/* Sticky contents. Desktop only — on mobile it would cost more scroll than it
   saves, so it collapses into a plain jump list above the article. */
.tx-toc{display:none}
.tx-toc-inline{margin:0 0 36px;padding:16px 20px;border:1px solid var(--rule);border-radius:var(--r);background:var(--panel)}
.tx-toc-inline p{font-family:var(--font-mono);font-size:11px;letter-spacing:.14em;text-transform:uppercase;color:var(--verified);margin:0 0 10px}
.tx-toc-inline ol{margin:0;padding-left:18px;color:var(--muted);font-size:15px;line-height:1.7}
.tx-toc-inline a{color:var(--muted);text-decoration:none}
.tx-toc-inline a:hover{color:var(--verified)}

/* Mid-article subscribe. Placed after the argument is established rather than
   at the top, where it interrupts before the reader has any reason to convert. */
.tx-cta{margin:48px 0;padding:26px 28px;border:1px solid var(--rule2);border-radius:var(--r);background:linear-gradient(180deg,rgba(232,184,106,.07),rgba(232,184,106,.02))}
.tx-cta h2{font-family:var(--font-display);font-size:1.25rem;color:var(--text);margin:0 0 8px}
.tx-cta p{font-size:15.5px;line-height:1.65;color:var(--muted);margin:0 0 16px}
.tx-cta form{display:flex;gap:10px;flex-wrap:wrap}
.tx-cta input{flex:1 1 220px;min-width:0;padding:11px 14px;border:1px solid var(--rule2);border-radius:6px;background:var(--bg);color:var(--text);font-family:var(--font-mono);font-size:14px}
.tx-cta input:focus{outline:2px solid var(--verified);outline-offset:1px}
.tx-cta button{padding:11px 20px;border:0;border-radius:6px;background:var(--verified);color:#0B0F1A;font-family:var(--font-mono);font-size:13px;font-weight:600;letter-spacing:.06em;text-transform:uppercase;cursor:pointer}
.tx-cta button:hover{filter:brightness(1.08)}

/* Keep reading. The end of an article is the largest drop-off point on the
   site, so it gets a real next step instead of a dead stop. */
.tx-next{margin:52px 0 0;padding-top:32px;border-top:1px solid var(--rule)}
.tx-next h2{font-family:var(--font-mono);font-size:12px;letter-spacing:.14em;text-transform:uppercase;color:var(--verified);margin:0 0 18px}
.tx-next-grid{display:grid;gap:14px}
@media(min-width:640px){.tx-next-grid{grid-template-columns:repeat(2,minmax(0,1fr))}}
.tx-card{display:block;padding:20px;border:1px solid var(--rule);border-radius:var(--r);background:var(--panel);text-decoration:none;transition:border-color .15s,background .15s}
.tx-card:hover{border-color:var(--rule2);background:var(--panel2)}
.tx-card .k{font-family:var(--font-mono);font-size:10.5px;letter-spacing:.14em;text-transform:uppercase;color:var(--verified);display:block;margin-bottom:8px}
.tx-card .t{font-family:var(--font-display);font-size:1.05rem;line-height:1.3;color:var(--text);display:block;margin-bottom:6px}
.tx-card .d{font-size:14px;line-height:1.55;color:var(--faint);display:block}
.tx-foot{margin-top:44px;padding-top:24px;border-top:1px solid var(--rule);font-family:var(--font-mono);font-size:12px;color:var(--faint);line-height:1.8}
.tx-foot a{color:var(--verified)}

@media(min-width:1080px){
  .tx-shell{grid-template-columns:216px minmax(0,68ch);gap:60px;justify-content:center}
  .tx-toc{display:block;grid-column:1;position:sticky;top:96px;align-self:start;max-height:calc(100vh - 140px);overflow-y:auto}
  .tx-toc p{font-family:var(--font-mono);font-size:11px;letter-spacing:.14em;text-transform:uppercase;color:var(--verified);margin:0 0 12px}
  .tx-toc ol{list-style:none;margin:0;padding:0;counter-reset:toc}
  .tx-toc li{counter-increment:toc;margin-bottom:10px;line-height:1.45}
  .tx-toc a{font-size:13.5px;color:var(--faint);text-decoration:none;display:block;padding-left:22px;position:relative;border-left:1px solid transparent;transition:color .15s}
  .tx-toc a::before{content:counter(toc,upper-roman);position:absolute;left:0;font-family:var(--font-mono);font-size:10px;opacity:.6}
  .tx-toc a:hover{color:var(--muted)}
  .tx-toc a.is-current{color:var(--verified)}
  .tx-wrap{grid-column:2}
  .tx-toc-inline{display:none}
}
@media(prefers-reduced-motion:reduce){.tx-progress span{transition:none}}
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
<div class="tx-progress" aria-hidden="true"><span id="tx-bar"></span></div>
<div class="tx-shell">
  <nav class="tx-toc" aria-label="Contents">
    <p>Contents</p>
    <ol>
${tocItems}
    </ol>
  </nav>

  <main id="main" class="tx-wrap">
  <p class="tx-kicker">◈ Field Transmission · №${number} · ${humanDate} ◈</p>
  <h1 class="tx-title">${escapeHtml(draft.title)}</h1>
${draft.subtitle ? `  <p class="tx-sub">${escapeHtml(draft.subtitle)}</p>\n` : ''}  <p class="tx-meta"><span>${readMinutes} min read</span><span class="tx-dot">·</span><a href="./">Archive</a><span class="tx-dot">·</span><a href="../playbooks/">Playbooks</a><span class="tx-dot">·</span><a href="../fieldnotes/">Fieldnotes</a></p>

  <img class="tx-cover" src="../images/covers/${number}.svg" alt="THE SIGNAL Transmission ${number} — ${escapeHtml(draft.title)}" width="1200" height="630" loading="eager" decoding="async">

  <div class="tx-lede">
${draft.lede.map((p) => `    <p>${escapeHtml(p)}</p>`).join('\n')}
  </div>

  <nav class="tx-toc-inline" aria-label="Contents">
    <p>In this transmission</p>
    <ol>
${tocItems}
    </ol>
  </nav>

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

  <section class="tx-next">
    <h2>Keep reading</h2>
    <div class="tx-next-grid">
${nextCards}
    </div>
  </section>

  <div class="tx-foot">
    <p>Transmission №${number} · ${humanDate} · THE SIGNAL · 1Commerce LLC</p>
    <p>This transmission is analysis, not a build report. Verified build claims live in <a href="../builds/">Verified Builds</a>; the operating playbooks live in <a href="../playbooks/">Playbooks</a>.</p>
  </div>
  </main>
</div>
${ARCHIVE_CHROME.footer}
<script src="../app.js?v=${CSS_VERSION}" defer></script>
<script>
// Reading progress + current-section highlight. Deliberately tiny and
// dependency-free: this runs on every dispatch, so it must not cost a
// measurable slice of the page's performance budget.
(function () {
  var bar = document.getElementById('tx-bar');
  var links = Array.prototype.slice.call(document.querySelectorAll('.tx-toc a'));
  var targets = links.map(function (a) { return document.getElementById(a.getAttribute('href').slice(1)); });
  var ticking = false;

  function update() {
    ticking = false;
    var doc = document.documentElement;
    var max = doc.scrollHeight - doc.clientHeight;
    if (bar) bar.style.width = (max > 0 ? Math.min(100, (doc.scrollTop / max) * 100) : 0) + '%';

    var current = -1;
    for (var i = 0; i < targets.length; i++) {
      if (targets[i] && targets[i].getBoundingClientRect().top <= 120) current = i;
    }
    for (var j = 0; j < links.length; j++) links[j].classList.toggle('is-current', j === current);
  }

  addEventListener('scroll', function () {
    if (!ticking) { ticking = true; requestAnimationFrame(update); }
  }, { passive: true });
  update();
})();
</script>
</body>
</html>
`;
}



// One subscribe block, reused mid-article. Posts to the same MailerLite
// endpoint as the footer form so there is a single list to maintain.
const SUBSCRIBE_BLOCK = `  <aside class="tx-cta">
    <h2>Get the next transmission</h2>
    <p>One dispatch on commerce infrastructure, sent when it is written. No cadence padding, no recycled posts.</p>
    <form class="subscribe-form" action="https://assets.mailerlite.com/jsonp/887036/forms/131950373498498498/subscribe" method="POST">
      <input type="email" name="fields[email]" placeholder="your@email.com" required aria-label="Email address">
      <button type="submit">Subscribe</button>
    </form>
  </aside>`;

/* --------------------------- related content --------------------------- */

const STOPWORDS = new Set(['the', 'a', 'an', 'for', 'and', 'of', 'to', 'in', 'on', 'your', 'you', 'is', 'are', 'with', 'without', 'what', 'how', 'when', 'why', 'it', 'that', 'this', 'actually', 'really']);

function tokens(text) {
  return new Set(
    String(text).toLowerCase().replace(/[^a-z0-9\s]/g, ' ').split(/\s+/).filter((w) => w.length > 2 && !STOPWORDS.has(w)),
  );
}

/**
 * Pick the playbooks closest to this dispatch by vocabulary overlap. Dispatches
 * are timely analysis; playbooks are the evergreen pillar pages. Sending a
 * finishing reader from one to the other is the highest-value internal link on
 * the page — it moves them from a dated post to a page built to rank and to be
 * returned to.
 */
function relatedPlaybooks(draft, limit = 2) {
  const source = tokens(`${draft.title} ${draft.keyword} ${draft.subtitle}`);
  return playbooks
    .map((pb) => {
      const target = tokens(`${pb.title} ${pb.keyword} ${pb.dek}`);
      let overlap = 0;
      for (const t of source) if (target.has(t)) overlap += 1;
      return { pb, overlap };
    })
    // Two shared terms, not one: a single common word like "commerce" matches
    // almost everything on this site and produces confident-looking noise.
    .filter((entry) => entry.overlap >= 2)
    .sort((a, b) => b.overlap - a.overlap)
    .slice(0, limit)
    .map((entry) => entry.pb);
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


/* ------------------------------ exports ------------------------------ */

export {
  loadState,
  saveState,
  existingNumbers,
  nextNumber,
  words,
  shingles,
  jaccard,
  stripTags,
  checkQuality,
  normalize,
  metaDescription,
  renderPage,
  listItemHtml,
  updateArchiveIndex,
  collectExistingTexts,
  pickTopic,
  BANNED_PHRASES,
  FABRICATION_PATTERNS,
  MIN_WORDS,
  MIN_SECTIONS,
  MAX_SIMILARITY,
  ARCHIVE_DIR,
  COVERS_DIR,
  STATE_FILE,
  ROOT,
  SITE_URL,
  TODAY,
  buildCover,
  archiveTopics,
  findTopic,
};

// Kept for the existing offline test suite.
export const __test = { normalize, checkQuality, renderPage, metaDescription, jaccard, shingles, updateArchiveIndex, listItemHtml };
