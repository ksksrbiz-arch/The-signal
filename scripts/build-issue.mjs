#!/usr/bin/env node
/**
 * build-issue.mjs — on-site newsletter issue archive
 * --------------------------------------------------
 * Reads data/issues.json + data/content-index.json and generates:
 *   - /blog/issues/index.html        (the issue archive)
 *   - /blog/issues/<slug>.html       (each issue: intro + the posts it collected)
 *
 * This is THE SIGNAL's self-hosted newsletter: an "issue" is a curated digest of
 * posts, published as a durable on-site page and carried by the existing RSS /
 * JSON feeds — pull-based delivery, no external mail service. Dependency-free;
 * reuses the arc-* design + shared chrome. `npm run issue`.
 */

import { readFile, writeFile, mkdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildChrome } from './lib/site-chrome.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SITE = 'https://1commercesolutions.com';
const V = '20260711a';
const esc = (s = '') =>
  String(s).replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;').replaceAll("'", '&#39;');

const STREAM_LABEL = { archive: 'Dispatch', fieldnotes: 'Fieldnote', daily: 'Daily' };
const prettyDate = (iso) => {
  if (!iso) return '';
  const [y, m, d] = iso.split('-').map(Number);
  return `${['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'][m - 1]} ${d}, ${y}`;
};

const index = JSON.parse(await readFile(path.join(ROOT, 'data', 'content-index.json'), 'utf8'));
const issues = JSON.parse(await readFile(path.join(ROOT, 'data', 'issues.json'), 'utf8')).issues;
const byId = new Map(index.items.map((it) => [it.id, it]));

function pageShell({ title, description, canonical, breadcrumbName, bodyLd, main }) {
  const { header, footer } = buildChrome({ prefix: '../../', active: '' });
  return `<!DOCTYPE html>
<html lang="en" data-theme="dark">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<meta name="robots" content="index, follow">
<title>${esc(title)}</title>
<meta name="description" content="${esc(description)}">
<link rel="canonical" href="${canonical}">
<meta property="og:type" content="website">
<meta property="og:site_name" content="THE SIGNAL">
<meta property="og:title" content="${esc(title)}">
<meta property="og:description" content="${esc(description)}">
<meta property="og:url" content="${canonical}">
<meta property="og:image" content="${SITE}/og-image.png">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="630">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="${esc(title)}">
<meta name="twitter:image" content="${SITE}/og-image.png">
<meta name="theme-color" content="#E8B86A">
<link rel="icon" type="image/svg+xml" href="/assets/brand/favicon.svg">
<link rel="icon" type="image/png" sizes="32x32" href="/assets/brand/favicon-32.png">
<link rel="apple-touch-icon" sizes="180x180" href="/assets/brand/apple-touch-icon.png">
<link rel="manifest" href="/manifest.json">
<link rel="alternate" type="application/rss+xml" title="THE SIGNAL — Dispatches" href="/feed.xml">
<link rel="alternate" type="application/json" title="THE SIGNAL — JSON Feed" href="/feed.json">
<script type="application/ld+json">
${bodyLd}
</script>
<script type="application/ld+json">
{"@context":"https://schema.org","@type":"BreadcrumbList","itemListElement":[{"@type":"ListItem","position":1,"name":"Home","item":"${SITE}/"},{"@type":"ListItem","position":2,"name":"Blog","item":"${SITE}/blog/"},{"@type":"ListItem","position":3,"name":"Issues","item":"${SITE}/blog/issues/"}${breadcrumbName ? `,{"@type":"ListItem","position":4,"name":"${esc(breadcrumbName)}"}` : ''}]}
</script>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,400;9..144,600;9..144,700&family=IBM+Plex+Sans:wght@400;500;600&family=JetBrains+Mono:wght@300;400;500&display=swap" rel="stylesheet">
<link rel="stylesheet" href="../../base.css?v=${V}">
<link rel="stylesheet" href="../../style.css?v=${V}">
</head>
<body>
  <a href="#main" class="skip-link">Skip to main content</a>
${header}
${main}
${footer}
  <script src="../../app.js" defer></script>
</body>
</html>
`;
}

function postCard(it, depthPrefix) {
  const base = it.id.split('/').pop();
  const media = it.stream === 'archive'
    ? `<div class="arc-item-media"><img src="${depthPrefix}images/covers/${base}.svg" alt="${esc(it.title)}" loading="lazy"></div>`
    : it.stream === 'fieldnotes'
      ? `<div class="arc-item-media"><img src="${depthPrefix}images/og/${base}.png" alt="${esc(it.title)}" loading="lazy"></div>`
      : `<div class="arc-item-media arc-item-media--placeholder"><span class="arc-item-marker">${esc(it.date || 'Daily')}</span></div>`;
  return `          <li class="arc-item">
            <a href="${depthPrefix.replace(/\/$/, '')}${it.path}" class="arc-item-link">
              ${media}
              <div class="arc-item-body">
                <div class="arc-item-meta"><span class="arc-type-badge">${STREAM_LABEL[it.stream] || 'Post'}</span><span class="arc-meta-sep">·</span><time datetime="${it.date || ''}">${prettyDate(it.date) || '—'}</time></div>
                <h3 class="arc-item-title">${esc(it.title)}</h3>
                ${it.description ? `<p class="arc-item-quote">${esc(it.description.slice(0, 140))}${it.description.length > 140 ? '…' : ''}</p>` : ''}
              </div>
              <span class="arc-item-arrow" aria-hidden="true">→</span>
            </a>
          </li>`;
}

await mkdir(path.join(ROOT, 'blog', 'issues'), { recursive: true });
const resolved = [];

for (const issue of issues) {
  const posts = issue.posts.map((id) => byId.get(id)).filter(Boolean);
  resolved.push({ ...issue, posts });
  const canonical = `${SITE}/blog/issues/${issue.slug}.html`;
  const heading = `Issue ${String(issue.num).padStart(3, '0')} — ${issue.title}`;
  const itemLd = {
    '@context': 'https://schema.org', '@type': 'ItemList', name: heading, description: issue.intro,
    numberOfItems: posts.length, url: canonical,
    itemListElement: posts.map((it, i) => ({ '@type': 'ListItem', position: i + 1, item: { '@type': 'Article', name: it.title, url: it.url } })),
  };
  const main = `  <nav class="breadcrumb" aria-label="Breadcrumb"><a href="../../">Home</a><span class="sep">›</span><a href="../">Blog</a><span class="sep">›</span><a href="./">Issues</a><span class="sep">›</span><span class="current">Issue ${String(issue.num).padStart(3, '0')}</span></nav>
  <main id="main">
    <section class="arc-hero"><div class="arc-hero-inner">
      <div class="arc-hero-kicker">◆ Newsletter · Issue ${String(issue.num).padStart(3, '0')} · ${prettyDate(issue.date)}</div>
      <h1 class="arc-hero-title">${esc(issue.title)}</h1>
      <p class="arc-hero-lede">${esc(issue.intro)}</p>
    </div></section>
    <section class="arc-list-wrap"><div class="arc-list-inner">
      <div class="arc-list-header"><h2 class="arc-list-title">In this issue</h2><div class="arc-list-sub">${posts.length} ${posts.length === 1 ? 'piece' : 'pieces'}, collected.</div></div>
      <ol class="arc-list">
${posts.map((it) => postCard(it, '../../')).join('\n')}
      </ol>
    </div></section>
  </main>`;
  await writeFile(path.join(ROOT, 'blog', 'issues', `${issue.slug}.html`),
    pageShell({ title: `${heading} · THE SIGNAL`, description: issue.intro, canonical, breadcrumbName: `Issue ${String(issue.num).padStart(3, '0')}`, bodyLd: JSON.stringify(itemLd), main }));
}

// issue archive (newest first)
const ordered = [...resolved].sort((a, b) => b.num - a.num);
const archiveCards = ordered.map((issue) => `        <a class="arc-item-link" href="./${issue.slug}.html" style="border:1px solid var(--rule,#232a36);border-radius:10px;padding:22px 24px;margin-bottom:14px;display:block;text-decoration:none">
          <div class="arc-item-meta"><span class="arc-type-badge">Issue ${String(issue.num).padStart(3, '0')}</span><span class="arc-meta-sep">·</span><time datetime="${issue.date}">${prettyDate(issue.date)}</time><span class="arc-meta-sep">·</span><span>${issue.posts.length} ${issue.posts.length === 1 ? 'piece' : 'pieces'}</span></div>
          <h3 class="arc-item-title" style="margin:8px 0 6px">${esc(issue.title)}</h3>
          <p class="arc-item-quote">${esc(issue.intro.slice(0, 180))}${issue.intro.length > 180 ? '…' : ''}</p>
        </a>`).join('\n');
const archiveLd = { '@context': 'https://schema.org', '@type': 'CollectionPage', name: 'Newsletter Issues — THE SIGNAL', url: `${SITE}/blog/issues/`, isPartOf: { '@type': 'WebSite', name: 'THE SIGNAL', url: `${SITE}/` } };
const archiveMain = `  <nav class="breadcrumb" aria-label="Breadcrumb"><a href="../../">Home</a><span class="sep">›</span><a href="../">Blog</a><span class="sep">›</span><span class="current">Issues</span></nav>
  <main id="main">
    <section class="arc-hero"><div class="arc-hero-inner">
      <div class="arc-hero-kicker">◆ The Newsletter · On the record</div>
      <h1 class="arc-hero-title">Issues</h1>
      <p class="arc-hero-lede">Every dispatch of THE SIGNAL, archived and readable in full. Subscribe for the next one — one issue per week, no noise.</p>
    </div></section>
    <section class="arc-list-wrap"><div class="arc-list-inner">
${archiveCards}
    </div></section>
  </main>`;
await writeFile(path.join(ROOT, 'blog', 'issues', 'index.html'),
  pageShell({ title: 'Newsletter Issues — THE SIGNAL', description: 'The full archive of THE SIGNAL newsletter — every issue, readable on-site.', canonical: `${SITE}/blog/issues/`, breadcrumbName: '', bodyLd: JSON.stringify(archiveLd), main: archiveMain }));

console.log(`issues: ${issues.length} issue page(s) + archive.`);
