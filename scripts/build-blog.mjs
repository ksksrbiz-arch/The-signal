#!/usr/bin/env node
/**
 * build-blog.mjs — unified /blog hub + JSON Feed
 * ----------------------------------------------
 * Generates /blog/index.html — one reverse-chronological hub that merges all
 * three streams (archive dispatches, fieldnotes, daily briefs) from the content
 * index, with stream filters, reusing the archive `arc-*` design system and the
 * shared chrome module. Also emits /feed.json (JSON Feed 1.1) covering every
 * post.
 *
 * Dependency-free. `npm run blog` (reads data/content-index.json).
 */

import { readFile, writeFile, mkdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildChrome } from './lib/site-chrome.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SITE = 'https://1commercesolutions.com';
const V = '20260711a';

const escapeHtml = (s = '') =>
  String(s).replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;').replaceAll("'", '&#39;');
const escapeJson = (s = '') => String(s).replaceAll('\\', '\\\\').replaceAll('"', '\\"').replaceAll('\n', ' ');

const STREAM_LABEL = { archive: 'Dispatch', fieldnotes: 'Fieldnote', daily: 'Daily' };
const prettyDate = (iso) => {
  if (!iso) return '';
  const [y, m, d] = iso.split('-').map(Number);
  return `${['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'][m - 1]} ${d}, ${y}`;
};

function mediaFor(it) {
  const base = it.id.split('/').pop();
  if (it.stream === 'archive') {
    return `<div class="arc-item-media"><img src="../images/covers/${base}.svg" alt="${escapeHtml(it.title)}" loading="lazy" decoding="async"></div>`;
  }
  if (it.stream === 'fieldnotes') {
    return `<div class="arc-item-media"><img src="../images/og/${base}.png" alt="${escapeHtml(it.title)}" loading="lazy" decoding="async"></div>`;
  }
  return `<div class="arc-item-media arc-item-media--placeholder"><span class="arc-item-marker">${escapeHtml(it.date || 'Daily')}</span></div>`;
}

function card(it) {
  const label = STREAM_LABEL[it.stream] || 'Post';
  const tags = (it.tags || []).slice(0, 3).map((t) => `<span class="arc-tag">${escapeHtml(t)}</span>`).join('');
  return `          <li class="arc-item" data-stream="${it.stream}">
            <a href="..${it.path}" class="arc-item-link">
              ${mediaFor(it)}
              <div class="arc-item-body">
                <div class="arc-item-meta">
                  <span class="arc-type-badge">${label}</span>
                  <span class="arc-meta-sep">·</span>
                  <time datetime="${it.date || ''}">${prettyDate(it.date) || '—'}</time>
                  ${it.readMins ? `<span class="arc-meta-sep">·</span><span>${it.readMins} min</span>` : ''}
                </div>
                <h3 class="arc-item-title">${escapeHtml(it.title)}</h3>
                ${it.description ? `<p class="arc-item-quote">${escapeHtml(it.description.slice(0, 150))}${it.description.length > 150 ? '…' : ''}</p>` : ''}
                ${tags ? `<div class="arc-tags">${tags}</div>` : ''}
              </div>
              <span class="arc-item-arrow" aria-hidden="true">→</span>
            </a>
          </li>`;
}

// ---- load ----
const index = JSON.parse(await readFile(path.join(ROOT, 'data', 'content-index.json'), 'utf8'));
const posts = index.items
  .filter((it) => it.kind === 'post')
  .sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0));

const { header, footer } = buildChrome({ prefix: '../', active: '' });

const itemListLd = {
  '@context': 'https://schema.org',
  '@type': 'ItemList',
  name: 'THE SIGNAL — All Posts',
  numberOfItems: posts.length,
  itemListElement: posts.slice(0, 40).map((it, i) => ({
    '@type': 'ListItem',
    position: i + 1,
    item: { '@type': 'Article', name: it.title, url: it.url, datePublished: it.date || undefined },
  })),
};

const counts = index.counts || {};
const page = `<!DOCTYPE html>
<html lang="en" data-theme="dark">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<meta name="robots" content="index, follow">
<title>The Blog — THE SIGNAL | Every dispatch, fieldnote & daily brief</title>
<meta name="description" content="Every post from THE SIGNAL in one place — weekly dispatches, long-form fieldnotes, and daily briefs from 1Commerce LLC, newest first.">
<link rel="canonical" href="${SITE}/blog/">
<meta property="og:type" content="website">
<meta property="og:site_name" content="THE SIGNAL">
<meta property="og:title" content="The Blog — THE SIGNAL">
<meta property="og:description" content="Every dispatch, fieldnote and daily brief in one reverse-chronological feed.">
<meta property="og:url" content="${SITE}/blog/">
<meta property="og:image" content="${SITE}/og-image.png">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="630">
<meta property="og:locale" content="en_US">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="The Blog — THE SIGNAL">
<meta name="twitter:description" content="Every dispatch, fieldnote and daily brief in one place.">
<meta name="twitter:image" content="${SITE}/og-image.png">
<meta name="theme-color" content="#E8B86A">
<link rel="icon" type="image/svg+xml" href="/assets/brand/favicon.svg">
<link rel="icon" type="image/png" sizes="32x32" href="/assets/brand/favicon-32.png">
<link rel="apple-touch-icon" sizes="180x180" href="/assets/brand/apple-touch-icon.png">
<link rel="manifest" href="/manifest.json">
<link rel="alternate" type="application/rss+xml" title="THE SIGNAL — Dispatches" href="/feed.xml">
<link rel="alternate" type="application/feed+json" title="THE SIGNAL — All Posts" href="/feed.json">
<meta name="geo.region" content="US-OR">
<meta name="geo.placename" content="Canby, Oregon">
<meta name="geo.position" content="45.2640;-122.6918">
<meta name="ICBM" content="45.2640, -122.6918">
<script type="application/ld+json">
{"@context":"https://schema.org","@type":"CollectionPage","name":"The Blog — THE SIGNAL","description":"Every post from THE SIGNAL — dispatches, fieldnotes, and daily briefs.","url":"${SITE}/blog/","isPartOf":{"@type":"WebSite","name":"THE SIGNAL","url":"${SITE}/"},"publisher":{"@type":"Organization","name":"1Commerce LLC"}}
</script>
<script type="application/ld+json">
{"@context":"https://schema.org","@type":"BreadcrumbList","itemListElement":[{"@type":"ListItem","position":1,"name":"Home","item":"${SITE}/"},{"@type":"ListItem","position":2,"name":"Blog","item":"${SITE}/blog/"}]}
</script>
<script type="application/ld+json">
${JSON.stringify(itemListLd)}
</script>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,400;9..144,600;9..144,700&family=IBM+Plex+Sans:wght@400;500;600&family=JetBrains+Mono:wght@300;400;500&display=swap" rel="stylesheet">
<link rel="stylesheet" href="../base.css?v=${V}">
<link rel="stylesheet" href="../style.css?v=${V}">
</head>
<body>
  <a href="#main" class="skip-link">Skip to main content</a>
${header}
  <nav class="breadcrumb" aria-label="Breadcrumb">
    <a href="../">Home</a>
    <span class="sep">›</span>
    <span class="current">Blog</span>
  </nav>

  <main id="main">
    <section class="arc-hero">
      <div class="arc-hero-inner">
        <div class="arc-hero-kicker">◆ The Full Feed · 1Commerce LLC · Canby, Oregon</div>
        <h1 class="arc-hero-title">The&nbsp;Blog</h1>
        <p class="arc-hero-lede">Every transmission in one place — weekly dispatches, long-form fieldnotes, and daily briefs, newest first.</p>
        <div class="arc-hero-meta">
          <span class="arc-meta-item"><strong>${counts.posts || posts.length}</strong> posts</span>
          <span class="arc-meta-sep">·</span>
          <span class="arc-meta-item"><strong>${counts.archive || 0}</strong> dispatches</span>
          <span class="arc-meta-sep">·</span>
          <span class="arc-meta-item"><strong>${counts.fieldnotes || 0}</strong> fieldnotes</span>
          <span class="arc-meta-sep">·</span>
          <span class="arc-meta-item"><strong>${counts.daily || 0}</strong> daily</span>
        </div>
      </div>
    </section>

    <section class="arc-list-wrap">
      <div class="arc-list-inner">
        <div class="arc-list-header">
          <h2 class="arc-list-title">All posts</h2>
          <div class="arc-list-sub">Newest to oldest, across every stream.</div>
          <a class="arc-feed-link" href="./series/">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01"/></svg>
            Browse by series
          </a>
          <a class="arc-feed-link" href="/feed.json">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M6.18 15.64a2.18 2.18 0 1 1 0 4.36 2.18 2.18 0 0 1 0-4.36zM4 4.44A15.56 15.56 0 0 1 19.56 20h-2.83A12.73 12.73 0 0 0 4 7.27V4.44zm0 5.66a9.9 9.9 0 0 1 9.9 9.9h-2.83A7.07 7.07 0 0 0 4 12.93V10.1z"/></svg>
            JSON Feed
          </a>
        </div>
        <div class="arc-filters" role="group" aria-label="Filter posts by stream">
          <button class="arc-filter-btn active" data-filter="all">All</button>
          <button class="arc-filter-btn" data-filter="archive">Dispatches</button>
          <button class="arc-filter-btn" data-filter="fieldnotes">Fieldnotes</button>
          <button class="arc-filter-btn" data-filter="daily">Daily</button>
        </div>
        <ol class="arc-list" id="blog-list">
${posts.map(card).join('\n')}
        </ol>
        <p class="arc-empty-msg" id="blog-empty" style="display:none; text-align:center; padding:40px; color:var(--faint);">No posts match this filter.</p>
      </div>
    </section>
  </main>
${footer}
  <script src="../app.js" defer></script>
  <script>
    (function(){
      var btns=document.querySelectorAll('.arc-filter-btn');
      var items=document.querySelectorAll('#blog-list .arc-item');
      var empty=document.getElementById('blog-empty');
      btns.forEach(function(btn){
        btn.addEventListener('click', function(){
          var f=btn.getAttribute('data-filter');
          btns.forEach(function(b){ b.classList.remove('active'); });
          btn.classList.add('active');
          var vis=0;
          items.forEach(function(it){
            var show=(f==='all'||it.getAttribute('data-stream')===f);
            it.style.display=show?'':'none'; if(show) vis++;
          });
          empty.style.display=vis===0?'block':'none';
        });
      });
    })();
  </script>
</body>
</html>
`;

await mkdir(path.join(ROOT, 'blog'), { recursive: true });
await writeFile(path.join(ROOT, 'blog', 'index.html'), page);

// ---- JSON Feed 1.1 ----
const feed = {
  version: 'https://jsonfeed.org/version/1.1',
  title: 'THE SIGNAL',
  home_page_url: `${SITE}/blog/`,
  feed_url: `${SITE}/feed.json`,
  description: 'Weekly dispatches, fieldnotes, and daily briefs from 1Commerce LLC — proof-first commerce infrastructure, built in public from Canby, Oregon.',
  language: 'en-US',
  authors: [{ name: 'Keith', url: `${SITE}/about/` }],
  items: posts.slice(0, 40).map((it) => ({
    id: it.url,
    url: it.url,
    title: it.title,
    content_text: it.description || it.title,
    date_published: it.date ? `${it.date}T12:00:00Z` : undefined,
    tags: (it.tags || []).slice(0, 6),
  })),
};
await writeFile(path.join(ROOT, 'feed.json'), JSON.stringify(feed, null, 2) + '\n');

console.log(`/blog/index.html (${posts.length} posts) + /feed.json (${feed.items.length} items) generated.`);
