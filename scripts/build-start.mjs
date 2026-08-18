#!/usr/bin/env node
/**
 * build-start.mjs — generates /start/, the orientation page for new readers.
 *
 * The gap this fills: every entry point on this site was reverse-chronological.
 * A first-time visitor landing on a dispatch or the archive had no way to tell
 * what the publication is, which pieces matter, or where to begin — so the only
 * available action was to leave. Competitive review of comparable single-author
 * operator publications found a dedicated "start here" path to be the common
 * pattern for solving exactly that, ahead of any visual change.
 *
 * The page is generated rather than hand-written so its counts and links stay
 * accurate as the archive grows. Run with `npm run start-page`.
 */

import { mkdir, readdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { buildChrome } from './lib/site-chrome.mjs';
import { escapeHtml, safeJsonLd } from './lib/html.mjs';
import { playbooks } from './playbooks-content.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT_DIR = path.join(ROOT, 'start');
const SITE_URL = 'https://1commercesolutions.com';
const CSS_VERSION = '20260711a';

const chrome = buildChrome({ prefix: '../', active: 'Start Here' });

/** Curated entry points. Ordered by what a new reader should read first, not by date. */
const PATHS = [
  {
    kicker: 'If you have five minutes',
    title: 'Read one playbook',
    body: 'The playbooks are the evergreen core — one page per idea, maintained rather than regenerated. Start with whichever problem is closest to what you are working on right now.',
    href: '../playbooks/',
    cta: 'Browse the playbooks',
  },
  {
    kicker: 'If you want the argument',
    title: 'Read the latest transmission',
    body: 'Dispatches are analysis of how commerce systems actually behave — the trade-offs, the failure modes, and the parts of a decision that do not appear on the invoice.',
    href: '../archive/',
    cta: 'Open the archive',
  },
  {
    kicker: 'If you want the receipts',
    title: 'Look at the builds',
    body: 'Verified Builds is the checkable half of this site: shipped systems with links, not claims. If anything here reads as marketing, this is where you test it.',
    href: '../builds/',
    cta: 'See what shipped',
  },
  {
    kicker: 'If you want the working notes',
    title: 'Read the fieldnotes',
    body: 'Longer, rougher, and more specific — build logs, system specs, and the reasoning behind decisions, with sensitive material redacted.',
    href: '../fieldnotes/',
    cta: 'Open the notebook',
  },
];

async function countDispatches() {
  try {
    return (await readdir(path.join(ROOT, 'archive'))).filter((f) => /^\d{3}\.html$/.test(f)).length;
  } catch {
    return 0;
  }
}

async function countFieldnotes() {
  try {
    return (await readdir(path.join(ROOT, 'fieldnotes'))).filter((f) => f.endsWith('.html') && f !== 'index.html').length;
  } catch {
    return 0;
  }
}

function pathCard(item) {
  return `      <a class="st-card" href="${item.href}">
        <span class="st-kicker">${escapeHtml(item.kicker)}</span>
        <span class="st-card-title">${escapeHtml(item.title)}</span>
        <span class="st-card-body">${escapeHtml(item.body)}</span>
        <span class="st-cta">${escapeHtml(item.cta)} <span aria-hidden="true">→</span></span>
      </a>`;
}

function playbookRow(pb) {
  return `        <li><a href="../playbooks/${pb.slug}.html">${escapeHtml(pb.navTitle)}</a> — ${escapeHtml(pb.dek)}</li>`;
}

async function main() {
  const dispatches = await countDispatches();
  const fieldnotes = await countFieldnotes();
  const canonical = `${SITE_URL}/start/`;

  const breadcrumbs = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'THE SIGNAL', item: `${SITE_URL}/` },
      { '@type': 'ListItem', position: 2, name: 'Start Here', item: canonical },
    ],
  };

  const html = `<!DOCTYPE html>
<html lang="en" data-theme="dark">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<meta name="robots" content="index, follow, max-snippet:-1, max-image-preview:large">
<title>Start Here — THE SIGNAL | Where to begin</title>
<meta name="description" content="New to THE SIGNAL? Start here. The playbooks, dispatches, verified builds, and fieldnotes of 1Commerce LLC — and which one to read first depending on what you need.">
<link rel="canonical" href="${canonical}">
<meta property="og:title" content="Start Here — THE SIGNAL">
<meta property="og:description" content="Where to begin with THE SIGNAL: playbooks, dispatches, verified builds, and fieldnotes from 1Commerce LLC.">
<meta property="og:type" content="website">
<meta property="og:url" content="${canonical}">
<meta property="og:site_name" content="THE SIGNAL">
<meta property="og:image" content="${SITE_URL}/og-image.png">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="630">
<meta property="og:image:alt" content="Start Here — THE SIGNAL">
<meta property="og:locale" content="en_US">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="Start Here — THE SIGNAL">
<meta name="twitter:description" content="Where to begin with THE SIGNAL: playbooks, dispatches, verified builds, and fieldnotes.">
<meta name="twitter:image" content="${SITE_URL}/og-image.png">
<meta name="twitter:image:alt" content="Start Here — THE SIGNAL">
<meta name="author" content="Keith">
<meta name="theme-color" content="#E8B86A">
<link rel="icon" type="image/svg+xml" href="/assets/brand/favicon.svg">
<link rel="icon" type="image/png" sizes="32x32" href="/assets/brand/favicon-32.png">
<link rel="apple-touch-icon" sizes="180x180" href="/assets/brand/apple-touch-icon.png">
<link rel="manifest" href="/manifest.json">
<link rel="alternate" type="application/rss+xml" title="THE SIGNAL" href="/feed.xml">
<link rel="stylesheet" href="../base.css?v=${CSS_VERSION}">
<link rel="stylesheet" href="../style.css?v=${CSS_VERSION}">
<style>
.st-wrap{max-width:900px;margin:0 auto;padding:clamp(48px,7vw,88px) 24px}
.st-eyebrow{font-family:var(--font-mono);font-size:12px;letter-spacing:.18em;text-transform:uppercase;color:var(--verified);margin:0 0 18px}
.st-title{font-family:var(--font-display);font-size:clamp(2.3rem,6.4vw,3.8rem);line-height:1.06;margin:0 0 18px;color:var(--text);letter-spacing:-.01em}
.st-dek{font-size:clamp(1.05rem,2vw,1.25rem);line-height:1.7;color:#DFD3BA;margin:0 0 14px;max-width:62ch}
.st-note{font-size:16.5px;line-height:1.75;color:var(--muted);margin:0 0 34px;max-width:62ch}
.st-stats{display:flex;flex-wrap:wrap;gap:28px;padding:20px 0;border-top:1px solid var(--rule);border-bottom:1px solid var(--rule);margin:0 0 44px}
.st-stat b{display:block;font-family:var(--font-display);font-size:1.8rem;color:var(--text);line-height:1.1}
.st-stat span{font-family:var(--font-mono);font-size:11px;letter-spacing:.12em;text-transform:uppercase;color:var(--faint)}
.st-h2{font-family:var(--font-mono);font-size:12px;letter-spacing:.14em;text-transform:uppercase;color:var(--verified);margin:0 0 18px}
.st-grid{display:grid;gap:16px;margin-bottom:48px}
@media(min-width:700px){.st-grid{grid-template-columns:repeat(2,minmax(0,1fr))}}
.st-card{display:flex;flex-direction:column;padding:24px;border:1px solid var(--rule);border-radius:var(--r);background:var(--panel);text-decoration:none;transition:border-color .15s,background .15s}
.st-card:hover{border-color:var(--rule2);background:var(--panel2)}
.st-kicker{font-family:var(--font-mono);font-size:10.5px;letter-spacing:.14em;text-transform:uppercase;color:var(--verified);margin-bottom:10px}
.st-card-title{font-family:var(--font-display);font-size:1.3rem;line-height:1.25;color:var(--text);margin-bottom:10px}
.st-card-body{font-size:15.5px;line-height:1.65;color:var(--muted);margin-bottom:16px;flex:1}
.st-cta{font-family:var(--font-mono);font-size:12px;letter-spacing:.06em;color:var(--verified)}
.st-list{margin:0 0 48px;padding-left:20px;color:var(--muted);line-height:1.85;font-size:16px}
.st-list a{color:var(--text);text-decoration:none;border-bottom:1px solid var(--rule2)}
.st-list a:hover{color:var(--verified);border-color:var(--verified)}
.st-sub{padding:28px;border:1px solid var(--rule2);border-radius:var(--r);background:linear-gradient(180deg,rgba(232,184,106,.07),rgba(232,184,106,.02))}
.st-sub h2{font-family:var(--font-display);font-size:1.35rem;color:var(--text);margin:0 0 10px}
.st-sub p{font-size:15.5px;line-height:1.65;color:var(--muted);margin:0 0 18px;max-width:52ch}
.st-sub form{display:flex;gap:10px;flex-wrap:wrap}
.st-sub input{flex:1 1 240px;min-width:0;padding:12px 14px;border:1px solid var(--rule2);border-radius:6px;background:var(--bg);color:var(--text);font-family:var(--font-mono);font-size:14px}
.st-sub input:focus{outline:2px solid var(--verified);outline-offset:1px}
.st-sub button{padding:12px 22px;border:0;border-radius:6px;background:var(--verified);color:#0B0F1A;font-family:var(--font-mono);font-size:13px;font-weight:600;letter-spacing:.06em;text-transform:uppercase;cursor:pointer}
.st-sub button:hover{filter:brightness(1.08)}
</style>
<script type="application/ld+json">
${safeJsonLd(breadcrumbs)}
</script>
</head>
<body>
${chrome.header}
<main id="main" class="st-wrap">
  <p class="st-eyebrow">Start Here</p>
  <h1 class="st-title">A working record of commerce infrastructure.</h1>
  <p class="st-dek">THE SIGNAL is written by Keith at 1Commerce LLC — a solo operator building commerce systems in Canby, Oregon, in public.</p>
  <p class="st-note">Everything here is either an argument you can check or a build you can open. There are no case studies with invented numbers, and nothing claims a result that was not measured. If a page makes a claim it cannot support, that is a defect — not a style.</p>

  <div class="st-stats">
    <div class="st-stat"><b>${dispatches}</b><span>Transmissions</span></div>
    <div class="st-stat"><b>${playbooks.length}</b><span>Playbooks</span></div>
    <div class="st-stat"><b>${fieldnotes}</b><span>Fieldnotes</span></div>
  </div>

  <h2 class="st-h2">Where to begin</h2>
  <div class="st-grid">
${PATHS.map(pathCard).join('\n')}
  </div>

  <h2 class="st-h2">The playbooks, in full</h2>
  <ul class="st-list">
${playbooks.map(playbookRow).join('\n')}
  </ul>

  <section class="st-sub" id="subscribe">
    <h2>Get the next transmission</h2>
    <p>One dispatch on commerce infrastructure, sent when it is written. No cadence padding, no recycled posts.</p>
    <form class="subscribe-form" action="https://assets.mailerlite.com/jsonp/887036/forms/131950373498498498/subscribe" method="POST">
      <input type="email" name="fields[email]" placeholder="your@email.com" required aria-label="Email address">
      <button type="submit">Subscribe</button>
    </form>
  </section>
</main>
${chrome.footer}
<script src="../app.js?v=${CSS_VERSION}" defer></script>
</body>
</html>
`;

  await mkdir(OUT_DIR, { recursive: true });
  await writeFile(path.join(OUT_DIR, 'index.html'), html);
  console.log(`Built /start/ — ${dispatches} dispatches, ${playbooks.length} playbooks, ${fieldnotes} fieldnotes.`);
}

main().catch((error) => {
  console.error(`build-start failed: ${error?.message || error}`);
  process.exit(1);
});
