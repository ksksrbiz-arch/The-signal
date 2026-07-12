// The Signal — search & discovery API
// ------------------------------------
// Netlify Functions v2 (ESM). Serves at /api/search from the build-time content
// index (data/content-index.json, bundled via netlify.toml included_files).
//
//   GET /api/search?q=<query>        → ranked post matches
//   GET /api/search?related=<id|url> → posts related to one post (shared tags/stream)
//   GET /api/search                  → the most recent posts (empty query)
//
// Read-only, on-origin, no storage. The index is loaded once per cold start.

import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const config = { path: '/api/search' };

const CORS = {
  'Access-Control-Allow-Origin': 'https://1commercesolutions.com',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
  Vary: 'Origin',
  'Content-Type': 'application/json',
  'Cache-Control': 'public, max-age=300',
};
const reply = (status, body) => new Response(JSON.stringify(body), { status, headers: CORS });

// Load the bundled content index once. Try a few candidate locations because the
// function's working directory varies between local run and the Netlify bundle.
let INDEX = null;
function loadIndex() {
  if (INDEX) return INDEX;
  const here = path.dirname(fileURLToPath(import.meta.url));
  const candidates = [
    path.join(process.cwd(), 'data', 'content-index.json'),
    path.join(here, '..', 'data', 'content-index.json'),
    path.join(here, '..', '..', 'data', 'content-index.json'),
  ];
  for (const p of candidates) {
    try {
      const parsed = JSON.parse(readFileSync(p, 'utf8'));
      INDEX = Array.isArray(parsed.items) ? parsed.items : [];
      return INDEX;
    } catch {
      /* try next */
    }
  }
  INDEX = [];
  return INDEX;
}

const slim = (it) => ({
  title: it.title,
  url: it.url,
  path: it.path,
  stream: it.stream,
  type: it.type,
  date: it.date,
  description: it.description,
  readMins: it.readMins,
});

const norm = (s) => (s || '').toLowerCase();

function rank(items, q) {
  const terms = norm(q).split(/\s+/).filter(Boolean);
  if (!terms.length) return [];
  const scored = [];
  for (const it of items) {
    const title = norm(it.title);
    const desc = norm(it.description);
    const tags = norm((it.tags || []).join(' '));
    const type = norm(it.type);
    let score = 0;
    for (const t of terms) {
      if (title.includes(t)) score += title.startsWith(t) ? 12 : 8;
      if (tags.includes(t)) score += 5;
      if (type.includes(t)) score += 3;
      if (desc.includes(t)) score += 2;
    }
    if (score > 0) score += (it.kind === 'post' ? 2 : 0); // favour posts
    if (score > 0) scored.push({ it, score });
  }
  scored.sort((a, b) => b.score - a.score || (a.it.date < b.it.date ? 1 : -1));
  return scored.map((s) => s.it);
}

function related(items, ref) {
  const target = items.find((it) => it.id === ref || it.path === ref || it.url === ref || it.url.endsWith(ref));
  if (!target) return [];
  const tset = new Set((target.tags || []).map(norm));
  const scored = [];
  for (const it of items) {
    if (it === target || it.kind !== 'post') continue;
    let score = 0;
    for (const tag of it.tags || []) if (tset.has(norm(tag))) score += 4;
    if (it.stream === target.stream) score += 3;
    if (it.type === target.type) score += 2;
    if (score > 0) scored.push({ it, score });
  }
  scored.sort((a, b) => b.score - a.score || (a.it.date < b.it.date ? 1 : -1));
  return scored.map((s) => s.it);
}

export default async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: CORS });
  if (req.method !== 'GET') return reply(405, { ok: false, error: 'Method not allowed' });

  const params = new URL(req.url).searchParams;
  const items = loadIndex();
  const posts = items.filter((it) => it.kind === 'post');

  const relatedTo = params.get('related');
  if (relatedTo) {
    return reply(200, { ok: true, mode: 'related', results: related(items, relatedTo).slice(0, 4).map(slim) });
  }

  const q = (params.get('q') || '').trim().slice(0, 80);
  const limit = Math.min(Math.max(parseInt(params.get('limit'), 10) || 8, 1), 20);
  if (!q) {
    // empty query → most recent posts
    const recent = posts.slice().sort((a, b) => (a.date < b.date ? 1 : -1)).slice(0, limit).map(slim);
    return reply(200, { ok: true, mode: 'recent', results: recent });
  }
  return reply(200, { ok: true, mode: 'query', q, results: rank(items, q).slice(0, limit).map(slim) });
};
