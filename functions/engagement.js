// The Signal — post engagement (reactions + views)
// -------------------------------------------------
// On-origin API at /api/engagement, backed by Netlify Blobs (store "engagement").
//   GET  /api/engagement?id=/archive/020.html
//        → { ok, id, reactions:{signal,cathedral,filed,noise}, views }
//   POST /api/engagement   { id, type:"view" }
//   POST /api/engagement   { id, type:"react", reaction:"signal|cathedral|filed|noise" }
//        → the updated counts
//
// Degrades gracefully: if the Blobs runtime is unavailable (e.g. local `node`),
// GET returns zeroed counts and POST returns { ok:false, degraded:true } with a
// 200 so the client UI never errors.

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

const json = (statusCode, body) => ({ statusCode, headers: CORS, body: JSON.stringify(body) });

// Per-IP throttle (warm-instance best effort — same pattern as subscribe.js).
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
const clientIp = (event) =>
  event.headers?.['x-nf-client-connection-ip'] ||
  (event.headers?.['x-forwarded-for'] || '').split(',')[0].trim() ||
  'unknown';

// Only real on-site article paths are trackable ids.
const ID_RE = /^\/[A-Za-z0-9/_-]*(?:\.html)?$/;
function normalizeId(raw) {
  if (typeof raw !== 'string') return '';
  let id = raw.split('#')[0].split('?')[0].trim();
  if (!id) return '';
  if (!id.startsWith('/')) id = '/' + id;
  if (id === '/' || id.length > 200 || !ID_RE.test(id)) return ''; // root isn't a trackable post
  return id;
}
const keyFor = (id) => 'page:' + id.replace(/\//g, '_');
const emptyCounts = () => ({ reactions: Object.fromEntries(REACTIONS.map((r) => [r, 0])), views: 0 });

async function loadStore() {
  // Lazy import so the file still `require`s in a plain node smoke test.
  const { getStore } = require('@netlify/blobs');
  return getStore('engagement');
}

async function readCounts(store, id) {
  const data = (await store.get(keyFor(id), { type: 'json' })) || {};
  const base = emptyCounts();
  if (data.reactions) for (const r of REACTIONS) base.reactions[r] = Number(data.reactions[r]) || 0;
  base.views = Number(data.views) || 0;
  return base;
}

exports.handler = async (event) => {
  const method = event.httpMethod;
  if (method === 'OPTIONS') return { statusCode: 204, headers: CORS, body: '' };
  if (method !== 'GET' && method !== 'POST') return json(405, { ok: false, error: 'Method not allowed' });
  if (throttled(clientIp(event))) return json(429, { ok: false, error: 'Slow down' });

  // ---- GET: read counts ----
  if (method === 'GET') {
    const id = normalizeId(event.queryStringParameters?.id || '');
    if (!id) return json(400, { ok: false, error: 'Invalid id' });
    try {
      const store = await loadStore();
      const counts = await readCounts(store, id);
      return json(200, { ok: true, id, ...counts });
    } catch (err) {
      console.error('engagement GET degraded:', err && err.name, err && err.message);
      return json(200, { ok: false, degraded: true, reason: String((err && err.name) || 'err') + ': ' + String((err && err.message) || '').slice(0, 100), id, ...emptyCounts() });
    }
  }

  // ---- POST: increment ----
  let body;
  try {
    body = JSON.parse(event.body || '{}');
  } catch {
    return json(400, { ok: false, error: 'Invalid JSON' });
  }
  const id = normalizeId(body.id);
  if (!id) return json(400, { ok: false, error: 'Invalid id' });
  const type = body.type;
  if (type !== 'view' && type !== 'react') return json(400, { ok: false, error: 'Invalid type' });
  if (type === 'react' && !REACTIONS.includes(body.reaction)) {
    return json(400, { ok: false, error: 'Invalid reaction' });
  }

  try {
    const store = await loadStore();
    const counts = await readCounts(store, id);
    if (type === 'view') counts.views += 1;
    else counts.reactions[body.reaction] += 1;
    await store.setJSON(keyFor(id), counts);
    return json(200, { ok: true, id, ...counts });
  } catch (err) {
    console.error('engagement POST degraded:', err && err.name, err && err.message);
    return json(200, { ok: false, degraded: true, reason: String((err && err.name) || 'err') + ': ' + String((err && err.message) || '').slice(0, 100), id, ...emptyCounts() });
  }
};
