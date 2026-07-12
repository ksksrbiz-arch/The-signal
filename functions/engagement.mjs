// The Signal — post engagement (reactions + views)
// -------------------------------------------------
// Netlify Functions v2 (ESM). The v2 runtime auto-configures Netlify Blobs,
// which the classic v1 handler style did not receive. Serves at /api/engagement
// via config.path (no netlify.toml redirect needed).
//
//   GET  /api/engagement?id=/archive/020.html
//        → { ok, id, reactions:{signal,cathedral,filed,noise}, views }
//   POST /api/engagement   { id, type:"view" }
//   POST /api/engagement   { id, type:"react", reaction:"signal|cathedral|filed|noise" }
//        → the updated counts
//
// Degrades gracefully (200 with zeros) if the Blobs runtime is ever absent, so
// the client UI never errors.

import { getStore } from '@netlify/blobs';

export const config = { path: '/api/engagement' };

const REACTIONS = ['signal', 'cathedral', 'filed', 'noise'];

const SITE_ORIGIN = 'https://1commercesolutions.com';
const CORS = {
  'Access-Control-Allow-Origin': SITE_ORIGIN,
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
  Vary: 'Origin',
  'Content-Type': 'application/json',
  'Cache-Control': 'no-store',
};
const reply = (status, body) => new Response(JSON.stringify(body), { status, headers: CORS });

// Per-IP throttle (warm-instance best effort).
const WINDOW_MS = 60_000;
const MAX_HITS = 40;
const ipHits = new Map();
function throttled(ip) {
  const now = Date.now();
  const rec = ipHits.get(ip);
  if (!rec || now - rec.start > WINDOW_MS) {
    ipHits.set(ip, { start: now, count: 1 });
    return false;
  }
  rec.count += 1;
  return rec.count > MAX_HITS;
}

// Only real on-site article paths are trackable ids.
const ID_RE = /^\/[A-Za-z0-9/_-]*(?:\.html)?$/;
function normalizeId(raw) {
  if (typeof raw !== 'string') return '';
  let id = raw.split('#')[0].split('?')[0].trim();
  if (!id) return '';
  if (!id.startsWith('/')) id = '/' + id;
  if (id === '/' || id.length > 200 || !ID_RE.test(id)) return '';
  return id;
}
const keyFor = (id) => 'page:' + id.replace(/\//g, '_');
const emptyCounts = () => ({ reactions: Object.fromEntries(REACTIONS.map((r) => [r, 0])), views: 0 });

async function readCounts(store, id) {
  const data = (await store.get(keyFor(id), { type: 'json' })) || {};
  const base = emptyCounts();
  if (data.reactions) for (const r of REACTIONS) base.reactions[r] = Number(data.reactions[r]) || 0;
  base.views = Number(data.views) || 0;
  return base;
}

function degrade(where, id, err) {
  console.error(`engagement ${where} degraded:`, err && err.name, err && err.message);
  return reply(200, { ok: false, degraded: true, id, ...emptyCounts() });
}

export default async (req, context) => {
  const method = req.method;
  if (method === 'OPTIONS') return new Response(null, { status: 204, headers: CORS });
  if (method !== 'GET' && method !== 'POST') return reply(405, { ok: false, error: 'Method not allowed' });

  const ip = context?.ip || req.headers.get('x-nf-client-connection-ip') || 'unknown';
  if (throttled(ip)) return reply(429, { ok: false, error: 'Slow down' });

  // ---- GET: read counts ----
  if (method === 'GET') {
    const id = normalizeId(new URL(req.url).searchParams.get('id') || '');
    if (!id) return reply(400, { ok: false, error: 'Invalid id' });
    try {
      const counts = await readCounts(getStore('engagement'), id);
      return reply(200, { ok: true, id, ...counts });
    } catch (err) {
      return degrade('GET', id, err);
    }
  }

  // ---- POST: increment ----
  let body;
  try {
    body = await req.json();
  } catch {
    return reply(400, { ok: false, error: 'Invalid JSON' });
  }
  const id = normalizeId(body?.id);
  if (!id) return reply(400, { ok: false, error: 'Invalid id' });
  const type = body.type;
  if (type !== 'view' && type !== 'react') return reply(400, { ok: false, error: 'Invalid type' });
  if (type === 'react' && !REACTIONS.includes(body.reaction)) return reply(400, { ok: false, error: 'Invalid reaction' });

  try {
    const store = getStore('engagement');
    const counts = await readCounts(store, id);
    if (type === 'view') counts.views += 1;
    else counts.reactions[body.reaction] += 1;
    await store.setJSON(keyFor(id), counts);
    return reply(200, { ok: true, id, ...counts });
  } catch (err) {
    return degrade('POST', id, err);
  }
};
