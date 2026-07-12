#!/usr/bin/env node
/**
 * build-index.mjs — THE SIGNAL unified content index
 * --------------------------------------------------
 * Crawls every published .html page and emits a single manifest,
 * `data/content-index.json`, describing every post across all three streams
 * (archive dispatches, fieldnotes, daily briefs) plus section landing pages.
 *
 * This is the keystone data artifact: it powers the search API, related-posts,
 * the /blog hub, OG-card generation, and the series system — so those features
 * never re-crawl the site or duplicate metadata.
 *
 * Dependency-free. Reuses the same walk + regex-extraction approach as
 * seo-agent.mjs. Run: `npm run index` (also part of `automation:daily`).
 */

import { readdir, readFile, writeFile, mkdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SITE_URL = 'https://1commercesolutions.com';
const DATA_DIR = path.join(ROOT, 'data');
const EXCLUDED_DIRS = new Set(['.git', '.github', '.claude', '.netlify', 'node_modules', 'noir-reel-engine', '_dev']);

// Streams that contain real posts (as opposed to tool/landing pages).
const POST_STREAMS = new Set(['archive', 'fieldnotes', 'daily']);

async function walk(dir) {
  const entries = await readdir(dir, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    if (entry.isDirectory()) {
      if (!EXCLUDED_DIRS.has(entry.name)) files.push(...(await walk(path.join(dir, entry.name))));
      continue;
    }
    if (entry.isFile() && entry.name.endsWith('.html') && entry.name !== '404.html') {
      files.push(path.join(dir, entry.name));
    }
  }
  return files;
}

const rel = (file) => path.relative(ROOT, file).replaceAll(path.sep, '/');

function urlFor(relative) {
  if (relative === 'index.html') return `${SITE_URL}/`;
  if (relative.endsWith('/index.html')) return `${SITE_URL}/${relative.replace(/index\.html$/, '')}`;
  return `${SITE_URL}/${relative}`;
}

const attr = (html, re) => html.match(re)?.[2]?.trim() || '';

function extract(html, relative) {
  const title =
    html.match(/"headline"\s*:\s*"([^"]+)"/i)?.[1]?.trim() ||
    attr(html, /<meta\s+property=["']og:title["']\s+content=(["'])(.*?)\1/i) ||
    html.match(/<title>([^<]+)<\/title>/i)?.[1]?.trim() ||
    '';
  const description =
    attr(html, /<meta\s+property=["']og:description["']\s+content=(["'])(.*?)\1/i) ||
    attr(html, /<meta\s+name=["']description["']\s+content=(["'])(.*?)\1/i);
  const date = html.match(/"datePublished"\s*:\s*"(\d{4}-\d{2}-\d{2})/i)?.[1] || '';
  const articleSection = html.match(/"articleSection"\s*:\s*"([^"]+)"/i)?.[1]?.trim() || '';
  const keywords = attr(html, /<meta\s+name=["']keywords["']\s+content=(["'])(.*?)\1/i);
  const ogImage = attr(html, /<meta\s+property=["']og:image["']\s+content=(["'])(.*?)\1/i);

  // reading time from the main/body text
  const bodyMatch = html.match(/<main[^>]*>([\s\S]*?)<\/main>/i) || html.match(/<body[^>]*>([\s\S]*?)<\/body>/i);
  const text = (bodyMatch ? bodyMatch[1] : html)
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&[a-z#0-9]+;/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  const words = text ? text.split(' ').length : 0;
  const readMins = Math.max(1, Math.round(words / 225));

  const segments = relative.split('/');
  const stream = segments.length > 1 ? segments[0] : 'home';
  const isIndex = relative === 'index.html' || relative.endsWith('/index.html');
  const kind = !isIndex && POST_STREAMS.has(stream) ? 'post' : isIndex ? 'index' : 'page';

  // archive dispatch number → its cover
  const archiveNum = relative.match(/^archive\/(\d{3})\.html$/)?.[1];
  const cover = archiveNum ? `/images/covers/${archiveNum}.svg` : '';

  const tags = keywords
    ? keywords.split(',').map((t) => t.trim()).filter(Boolean).slice(0, 8)
    : [];

  return {
    id: relative.replace(/\.html$/, ''),
    url: urlFor(relative),
    path: '/' + (isIndex ? relative.replace(/index\.html$/, '') : relative),
    stream,
    kind,
    type: articleSection || (stream === 'archive' ? 'Dispatch' : stream === 'fieldnotes' ? 'Fieldnote' : stream === 'daily' ? 'Daily' : 'Page'),
    title,
    description,
    date,
    tags,
    cover,
    ogImage,
    readMins,
  };
}

const files = await walk(ROOT);
const items = [];
for (const file of files) {
  const relative = rel(file);
  try {
    const html = await readFile(file, 'utf8');
    if (!/<title>/i.test(html)) continue;
    items.push(extract(html, relative));
  } catch {
    /* skip unreadable */
  }
}

// Posts first, newest-date first; then everything else by path.
items.sort((a, b) => {
  const ap = a.kind === 'post' ? 0 : 1;
  const bp = b.kind === 'post' ? 0 : 1;
  if (ap !== bp) return ap - bp;
  if (a.date && b.date && a.date !== b.date) return a.date < b.date ? 1 : -1;
  return a.path < b.path ? -1 : a.path > b.path ? 1 : 0;
});

const posts = items.filter((i) => i.kind === 'post');
const out = {
  generated: null, // stamped by the caller/commit, not here (keeps output deterministic)
  site: SITE_URL,
  counts: {
    total: items.length,
    posts: posts.length,
    archive: posts.filter((p) => p.stream === 'archive').length,
    fieldnotes: posts.filter((p) => p.stream === 'fieldnotes').length,
    daily: posts.filter((p) => p.stream === 'daily').length,
  },
  items,
};

await mkdir(DATA_DIR, { recursive: true });
await writeFile(path.join(DATA_DIR, 'content-index.json'), JSON.stringify(out, null, 2) + '\n');
console.log(`content-index.json: ${items.length} pages (${posts.length} posts — ${out.counts.archive} archive, ${out.counts.fieldnotes} fieldnotes, ${out.counts.daily} daily)`);
