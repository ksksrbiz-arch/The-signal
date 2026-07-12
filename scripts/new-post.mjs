#!/usr/bin/env node
/**
 * new-post.mjs — Markdown → HTML authoring pipeline
 * -------------------------------------------------
 * Turns a Markdown file with front-matter into a complete, on-brand fieldnote
 * page using the shared chrome module — full <head> + JSON-LD + canonical nav +
 * footer + app.js — so a new post is one command, not a hand-built HTML file.
 *
 * Because the post is picked up by the content index → /blog hub → search on the
 * next `npm run index && npm run blog`, it's discoverable immediately without
 * hand-editing any section index.
 *
 *   npm run new-post -- content/drafts/my-note.md
 *
 * Front-matter (between --- fences):
 *   title:       (required)
 *   slug:        url slug (default: from filename)
 *   description: meta/OG description (required)
 *   date:        YYYY-MM-DD (default: today via SIGNAL_DATE env, else omitted)
 *   tags:        comma-separated
 *   section:     "Fieldnote" category label (shown as the type badge)
 *
 * Dependency-free: a small front-matter reader + a compact Markdown renderer
 * (headings, paragraphs, bold/italic/code, links, lists, blockquotes, hr, code
 * fences). Output: fieldnotes/<slug>.html. Then run `npm run index && npm run
 * blog && npm run og` to wire it into discovery + generate its social card.
 */

import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildChrome } from './lib/site-chrome.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SITE = 'https://1commercesolutions.com';
const V = '20260711a';

const esc = (s = '') =>
  String(s).replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;').replaceAll("'", '&#39;');
const escAttr = esc;
const jsonLd = (obj) => JSON.stringify(obj).replaceAll('<', '\\u003c');

function parseFrontMatter(src) {
  const m = src.match(/^---\n([\s\S]*?)\n---\n?([\s\S]*)$/);
  if (!m) return { meta: {}, body: src };
  const meta = {};
  for (const line of m[1].split('\n')) {
    const mm = line.match(/^([A-Za-z0-9_-]+)\s*:\s*(.*)$/);
    if (mm) meta[mm[1].trim()] = mm[2].trim().replace(/^["']|["']$/g, '');
  }
  return { meta, body: m[2] };
}

const slugify = (s) =>
  s.toLowerCase().trim().replace(/[^\w\s-]/g, '').replace(/\s+/g, '-').replace(/-+/g, '-').slice(0, 70);

// ---- compact Markdown → HTML ----
function inline(s) {
  return esc(s)
    .replace(/`([^`]+)`/g, (_, c) => `<code>${c}</code>`)
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
    .replace(/(^|[^*])\*([^*]+)\*/g, '$1<em>$2</em>')
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, (_, t, u) => `<a href="${escAttr(u)}">${t}</a>`);
}

function markdown(src) {
  const lines = src.replace(/\r\n/g, '\n').split('\n');
  const out = [];
  let i = 0;
  let para = [];
  const flushPara = () => {
    if (para.length) {
      out.push(`<p>${inline(para.join(' ')).trim()}</p>`);
      para = [];
    }
  };
  while (i < lines.length) {
    const line = lines[i];
    if (/^```/.test(line)) {
      flushPara();
      const buf = [];
      i++;
      while (i < lines.length && !/^```/.test(lines[i])) buf.push(lines[i++]);
      i++;
      out.push(`<pre><code>${esc(buf.join('\n'))}</code></pre>`);
      continue;
    }
    let m;
    if ((m = line.match(/^(#{1,4})\s+(.*)$/))) {
      flushPara();
      const lvl = Math.min(m[1].length + 1, 4); // # → h2 (h1 is the page title)
      out.push(`<h${lvl}>${inline(m[2])}</h${lvl}>`);
      i++;
      continue;
    }
    if (/^\s*>/.test(line)) {
      flushPara();
      const buf = [];
      while (i < lines.length && /^\s*>/.test(lines[i])) buf.push(lines[i++].replace(/^\s*>\s?/, ''));
      out.push(`<blockquote>${inline(buf.join(' '))}</blockquote>`);
      continue;
    }
    if (/^\s*([-*])\s+/.test(line)) {
      flushPara();
      const buf = [];
      while (i < lines.length && /^\s*([-*])\s+/.test(lines[i])) buf.push(lines[i++].replace(/^\s*([-*])\s+/, ''));
      out.push(`<ul>${buf.map((b) => `<li>${inline(b)}</li>`).join('')}</ul>`);
      continue;
    }
    if (/^\s*\d+\.\s+/.test(line)) {
      flushPara();
      const buf = [];
      while (i < lines.length && /^\s*\d+\.\s+/.test(lines[i])) buf.push(lines[i++].replace(/^\s*\d+\.\s+/, ''));
      out.push(`<ol>${buf.map((b) => `<li>${inline(b)}</li>`).join('')}</ol>`);
      continue;
    }
    if (/^\s*(---|\*\*\*)\s*$/.test(line)) {
      flushPara();
      out.push('<hr>');
      i++;
      continue;
    }
    if (line.trim() === '') {
      flushPara();
      i++;
      continue;
    }
    para.push(line.trim());
    i++;
  }
  flushPara();
  return out.join('\n          ');
}

// ---- run ----
const argFile = process.argv[2];
if (!argFile) {
  console.error('Usage: npm run new-post -- <file.md>');
  process.exit(1);
}
const src = await readFile(path.resolve(argFile), 'utf8');
const { meta, body } = parseFrontMatter(src);
if (!meta.title || !meta.description) {
  console.error('Front-matter must include at least: title, description');
  process.exit(1);
}
const slug = meta.slug || slugify(path.basename(argFile, path.extname(argFile))) || slugify(meta.title);
const date = meta.date || process.env.SIGNAL_DATE || '';
const tags = (meta.tags || '').split(',').map((t) => t.trim()).filter(Boolean);
const section = meta.section || 'Fieldnote';
const url = `${SITE}/fieldnotes/${slug}.html`;
const ogImage = `${SITE}/images/og/${slug}.png`;
const readMins = Math.max(1, Math.round(body.split(/\s+/).filter(Boolean).length / 225));

const { header, footer } = buildChrome({ prefix: '../', active: 'Fieldnotes' });

const article = {
  '@context': 'https://schema.org',
  '@type': 'Article',
  headline: meta.title,
  description: meta.description,
  ...(date ? { datePublished: date, dateModified: date } : {}),
  articleSection: section,
  inLanguage: 'en-US',
  author: { '@type': 'Person', name: 'Keith' },
  publisher: { '@type': 'Organization', name: '1Commerce LLC', url: SITE },
  mainEntityOfPage: url,
  image: ogImage,
  isPartOf: { '@type': 'Blog', name: 'THE SIGNAL Fieldnotes', url: `${SITE}/fieldnotes/` },
};
const breadcrumb = {
  '@context': 'https://schema.org',
  '@type': 'BreadcrumbList',
  itemListElement: [
    { '@type': 'ListItem', position: 1, name: 'Home', item: `${SITE}/` },
    { '@type': 'ListItem', position: 2, name: 'Fieldnotes', item: `${SITE}/fieldnotes/` },
    { '@type': 'ListItem', position: 3, name: meta.title },
  ],
};

const page = `<!DOCTYPE html>
<html lang="en" data-theme="dark">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<meta name="robots" content="index, follow">
<title>${esc(meta.title)} — THE SIGNAL Fieldnotes</title>
<meta name="description" content="${escAttr(meta.description)}">
<meta name="author" content="Keith">
<link rel="canonical" href="${url}">
<meta property="og:type" content="article">
<meta property="og:site_name" content="THE SIGNAL">
<meta property="og:title" content="${escAttr(meta.title)}">
<meta property="og:description" content="${escAttr(meta.description)}">
<meta property="og:url" content="${url}">
<meta property="og:image" content="${ogImage}">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="630">
<meta property="og:locale" content="en_US">
${date ? `<meta property="article:published_time" content="${date}">\n<meta property="article:section" content="${escAttr(section)}">` : ''}
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="${escAttr(meta.title)}">
<meta name="twitter:description" content="${escAttr(meta.description)}">
<meta name="twitter:image" content="${ogImage}">
<meta name="theme-color" content="#E8B86A">
${tags.length ? `<meta name="keywords" content="${escAttr(tags.join(', '))}">` : ''}
<link rel="icon" type="image/svg+xml" href="/assets/brand/favicon.svg">
<link rel="icon" type="image/png" sizes="32x32" href="/assets/brand/favicon-32.png">
<link rel="apple-touch-icon" sizes="180x180" href="/assets/brand/apple-touch-icon.png">
<link rel="manifest" href="/manifest.json">
<link rel="alternate" type="application/rss+xml" title="THE SIGNAL — Dispatches" href="/feed.xml">
<meta name="apple-mobile-web-app-capable" content="yes">
<meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">
<meta name="apple-mobile-web-app-title" content="THE SIGNAL">
<meta name="geo.region" content="US-OR">
<meta name="geo.placename" content="Canby, Oregon">
<meta name="geo.position" content="45.2640;-122.6918">
<meta name="ICBM" content="45.2640, -122.6918">
<script type="application/ld+json">
${jsonLd(article)}
</script>
<script type="application/ld+json">
${jsonLd(breadcrumb)}
</script>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,400;9..144,500;9..144,600;9..144,700&family=IBM+Plex+Sans:wght@400;500;600&family=JetBrains+Mono:wght@300;400;500&display=swap" rel="stylesheet">
<link rel="stylesheet" href="../base.css?v=${V}">
<link rel="stylesheet" href="../style.css?v=${V}">
<style>
  .fnplus-hero{max-width:760px;margin:0 auto;padding:56px 24px 8px}
  .fnplus-over{font-family:'JetBrains Mono',monospace;font-size:12px;letter-spacing:.2em;text-transform:uppercase;color:var(--active,#E8B86A);margin:0 0 18px}
  .fnplus-title{font-family:'Fraunces',Georgia,serif;font-weight:600;font-size:clamp(2rem,5vw,3rem);line-height:1.06;letter-spacing:-.01em;margin:0 0 18px;color:#F3EFE3}
  .fnplus-dek{font-size:1.15rem;line-height:1.6;color:var(--muted,#9AA2AE);margin:0 0 20px}
  .fnplus-meta{font-family:'JetBrains Mono',monospace;font-size:11px;letter-spacing:.12em;text-transform:uppercase;color:var(--faint,#9AA2AE);border-top:1px solid var(--rule,#232a36);padding-top:16px}
  .fnplus-body{max-width:760px;margin:0 auto;padding:24px 24px 40px;font-size:1.05rem;line-height:1.75;color:var(--text,#E8E4D8)}
  .fnplus-body h2{font-family:'Fraunces',Georgia,serif;font-weight:600;font-size:1.6rem;margin:36px 0 12px;color:#F0ECdf}
  .fnplus-body h3{font-family:'IBM Plex Sans',sans-serif;font-weight:600;font-size:1.2rem;margin:26px 0 8px}
  .fnplus-body p{margin:0 0 18px}
  .fnplus-body ul,.fnplus-body ol{margin:0 0 18px;padding-left:22px}
  .fnplus-body li{margin:0 0 8px}
  .fnplus-body blockquote{border-left:2px solid var(--active,#E8B86A);margin:22px 0;padding:2px 0 2px 20px;color:var(--muted,#9AA2AE)}
  .fnplus-body pre{background:var(--panel,#12161f);border:1px solid var(--rule,#232a36);border-radius:8px;padding:16px;overflow:auto;font-size:.9rem}
  .fnplus-body code{font-family:'JetBrains Mono',monospace;font-size:.92em}
  .fnplus-body a{color:var(--active,#E8B86A)}
  .fnplus-tags{display:flex;gap:8px;flex-wrap:wrap;margin-top:24px}
  .fnplus-tag{font-family:'JetBrains Mono',monospace;font-size:10px;letter-spacing:.1em;text-transform:uppercase;color:var(--faint,#9AA2AE);border:1px solid var(--rule,#232a36);border-radius:100px;padding:5px 11px}
</style>
</head>
<body>
  <a href="#main" class="skip-link">Skip to main content</a>
${header}
  <nav class="breadcrumb" aria-label="Breadcrumb">
    <a href="../">Home</a><span class="sep">›</span><a href="./">Fieldnotes</a><span class="sep">›</span><span class="current">${esc(meta.title)}</span>
  </nav>
  <main id="main">
    <header class="fnplus-hero">
      <p class="fnplus-over">${esc(section)}${readMins ? ` · ${readMins} min read` : ''}</p>
      <h1 class="fnplus-title">${esc(meta.title)}</h1>
      <p class="fnplus-dek">${esc(meta.description)}</p>
      <p class="fnplus-meta">1Commerce LLC · Canby, Oregon${date ? ` · ${date}` : ''}</p>
    </header>
    <article class="fnplus-body">
          ${markdown(body)}
      ${tags.length ? `<div class="fnplus-tags">${tags.map((t) => `<span class="fnplus-tag">${esc(t)}</span>`).join('')}</div>` : ''}
    </article>
  </main>
${footer}
  <script src="../app.js" defer></script>
</body>
</html>
`;

const outFile = path.join(ROOT, 'fieldnotes', `${slug}.html`);
await writeFile(outFile, page);
console.log(`Created fieldnotes/${slug}.html`);
console.log('Next: npm run index && npm run og && npm run blog   (wires it into search, its social card, and the /blog hub)');
