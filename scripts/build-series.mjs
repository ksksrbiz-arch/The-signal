#!/usr/bin/env node
/**
 * build-series.mjs — thematic series pages + cross-link map
 * --------------------------------------------------------
 * Reads data/series.json + data/content-index.json and generates:
 *   - /blog/series/index.html         (the series hub)
 *   - /blog/series/<slug>.html        (each series, posts in reading order)
 *   - data/series-map.json            (post-path → membership, for the client
 *                                       "part of series" banner + prev/next)
 *
 * Dependency-free; reuses the arc-* design + shared chrome. `npm run series`.
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
const series = JSON.parse(await readFile(path.join(ROOT, 'data', 'series.json'), 'utf8')).series;
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
<script type="application/ld+json">
${bodyLd}
</script>
<script type="application/ld+json">
{"@context":"https://schema.org","@type":"BreadcrumbList","itemListElement":[{"@type":"ListItem","position":1,"name":"Home","item":"${SITE}/"},{"@type":"ListItem","position":2,"name":"Blog","item":"${SITE}/blog/"},{"@type":"ListItem","position":3,"name":"Series","item":"${SITE}/blog/series/"}${breadcrumbName ? `,{"@type":"ListItem","position":4,"name":"${esc(breadcrumbName)}"}` : ''}]}
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

await mkdir(path.join(ROOT, 'blog', 'series'), { recursive: true });
const seriesMap = {};
const resolved = [];

for (const s of series) {
  const posts = s.posts.map((id) => byId.get(id)).filter(Boolean);
  resolved.push({ ...s, posts });
  const canonical = `${SITE}/blog/series/${s.slug}.html`;
  const itemLd = {
    '@context': 'https://schema.org', '@type': 'ItemList', name: s.name, description: s.description,
    numberOfItems: posts.length, url: canonical,
    itemListElement: posts.map((it, i) => ({ '@type': 'ListItem', position: i + 1, item: { '@type': 'Article', name: it.title, url: it.url } })),
  };
  const main = `  <nav class="breadcrumb" aria-label="Breadcrumb"><a href="../../">Home</a><span class="sep">›</span><a href="../">Blog</a><span class="sep">›</span><a href="./">Series</a><span class="sep">›</span><span class="current">${esc(s.name)}</span></nav>
  <main id="main">
    <section class="arc-hero"><div class="arc-hero-inner">
      <div class="arc-hero-kicker">◆ Series · ${posts.length} parts</div>
      <h1 class="arc-hero-title">${esc(s.name)}</h1>
      <p class="arc-hero-lede">${esc(s.description)}</p>
    </div></section>
    <section class="arc-list-wrap"><div class="arc-list-inner">
      <div class="arc-list-header"><h2 class="arc-list-title">In reading order</h2><div class="arc-list-sub">${posts.length} parts, start to finish.</div></div>
      <ol class="arc-list">
${posts.map((it) => postCard(it, '../../')).join('\n')}
      </ol>
    </div></section>
  </main>`;
  await writeFile(path.join(ROOT, 'blog', 'series', `${s.slug}.html`),
    pageShell({ title: `${s.name} — Series · THE SIGNAL`, description: s.description, canonical, breadcrumbName: s.name, bodyLd: JSON.stringify(itemLd), main }));

  // membership map for the client banner
  posts.forEach((it, i) => {
    (seriesMap[it.path] ||= []).push({
      slug: s.slug, name: s.name, url: `/blog/series/${s.slug}.html`,
      index: i + 1, total: posts.length,
      prev: i > 0 ? posts[i - 1].path : null,
      next: i < posts.length - 1 ? posts[i + 1].path : null,
    });
  });
}

// series hub
const hubCards = resolved.map((s) => `        <a class="arc-item-link" href="./${s.slug}.html" style="border:1px solid var(--rule,#232a36);border-radius:10px;padding:22px 24px;margin-bottom:14px;display:block;text-decoration:none">
          <div class="arc-item-meta"><span class="arc-type-badge">Series</span><span class="arc-meta-sep">·</span><span>${s.posts.length} parts</span></div>
          <h3 class="arc-item-title" style="margin:8px 0 6px">${esc(s.name)}</h3>
          <p class="arc-item-quote">${esc(s.description)}</p>
        </a>`).join('\n');
const hubLd = { '@context': 'https://schema.org', '@type': 'CollectionPage', name: 'Series — THE SIGNAL', url: `${SITE}/blog/series/`, isPartOf: { '@type': 'WebSite', name: 'THE SIGNAL', url: `${SITE}/` } };
const hubMain = `  <nav class="breadcrumb" aria-label="Breadcrumb"><a href="../../">Home</a><span class="sep">›</span><a href="../">Blog</a><span class="sep">›</span><span class="current">Series</span></nav>
  <main id="main">
    <section class="arc-hero"><div class="arc-hero-inner">
      <div class="arc-hero-kicker">◆ Reading Threads · THE SIGNAL</div>
      <h1 class="arc-hero-title">Series</h1>
      <p class="arc-hero-lede">Curated reading orders that thread related dispatches and fieldnotes into one argument.</p>
    </div></section>
    <section class="arc-list-wrap"><div class="arc-list-inner">
${hubCards}
    </div></section>
  </main>`;
await writeFile(path.join(ROOT, 'blog', 'series', 'index.html'),
  pageShell({ title: 'Series — THE SIGNAL', description: 'Curated reading threads across THE SIGNAL dispatches and fieldnotes.', canonical: `${SITE}/blog/series/`, breadcrumbName: '', bodyLd: JSON.stringify(hubLd), main: hubMain }));

await writeFile(path.join(ROOT, 'data', 'series-map.json'), JSON.stringify(seriesMap, null, 2) + '\n');

console.log(`series: ${series.length} series pages + hub + series-map.json (${Object.keys(seriesMap).length} member posts).`);
