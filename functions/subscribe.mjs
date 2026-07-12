// The Signal — newsletter signup (self-hosted, no external service)
// ------------------------------------------------------------------
// Netlify Functions v2 (ESM). Captures subscribers into a Netlify Blobs store
// ("subscribers") that THE SIGNAL owns outright — no MailerLite, no third-party
// list. Delivery is pull-based: subscribers read issues on-site under /blog/issues/
// and via the RSS (/feed.xml) + JSON (/feed.json) feeds. Owning the stack instead
// of renting it — the same stance the dispatches preach.
//
//   POST /api/subscribe   { email }
//        → { ok:true, status:"confirmed"|"pending", message }
//
// Double opt-in is built in but off by default: set NEWSLETTER_DOUBLE_OPTIN=true
// to store new signups as "pending" with a confirm token (redeemed at
// /api/confirm). The confirm link is surfaced in the response and can be wired to
// any mailer later; with the flag off, signups are confirmed immediately so the
// flow works end-to-end with zero external dependencies.
//
// Serves at /api/subscribe via config.path (no netlify.toml redirect needed).

import { getStore } from '@netlify/blobs';

export const config = { path: '/api/subscribe' };

const SITE_ORIGIN = 'https://1commercesolutions.com';
const CORS = {
  'Access-Control-Allow-Origin': SITE_ORIGIN,
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
  Vary: 'Origin',
  'Content-Type': 'application/json',
  'Cache-Control': 'no-store',
};
const reply = (status, body) => new Response(JSON.stringify(body), { status, headers: CORS });

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Per-IP throttle (warm-instance best effort; ephemeral, not fleet-wide).
const WINDOW_MS = 60_000;
const MAX_HITS = 5;
const ipHits = new Map();
function throttled(ip) {
  const now = Date.now();
  const rec = ipHits.get(ip);
  if (!rec || now - rec.start >= WINDOW_MS) {
    ipHits.set(ip, { start: now, count: 1 });
    if (ipHits.size > 5000) for (const [k, v] of ipHits) if (now - v.start >= WINDOW_MS) ipHits.delete(k);
    return false;
  }
  rec.count += 1;
  return rec.count > MAX_HITS;
}

// Blobs keys stay conservative; real addresses only contain allowed chars.
const keyFor = (email) => 'sub:' + email.replace(/[^a-z0-9._@+-]/g, '_');
const token = () => (globalThis.crypto?.randomUUID?.() || String(Date.now()) + Math.random().toString(16).slice(2));

export default async (req, context) => {
  const method = req.method;
  if (method === 'OPTIONS') return new Response(null, { status: 204, headers: CORS });
  if (method !== 'POST') return reply(405, { ok: false, error: 'Method not allowed' });

  const ip = context?.ip || req.headers.get('x-nf-client-connection-ip') || 'unknown';
  if (throttled(ip)) return reply(429, { ok: false, error: 'Too many requests. Please slow down.' });

  let email = '';
  try {
    const parsed = await req.json();
    email = String(parsed?.email || '').trim().toLowerCase();
  } catch {
    return reply(400, { ok: false, error: 'Invalid request body.' });
  }
  if (!EMAIL_RE.test(email) || email.length > 254) {
    return reply(400, { ok: false, error: 'Please enter a valid email address.' });
  }

  const doubleOptIn = String(process.env.NEWSLETTER_DOUBLE_OPTIN || '').toLowerCase() === 'true';

  try {
    const store = getStore('subscribers');
    const key = keyFor(email);
    const existing = await store.get(key, { type: 'json' });

    if (existing && existing.status === 'confirmed') {
      return reply(200, { ok: true, status: 'confirmed', message: "You're already on the list." });
    }

    const nowIso = new Date().toISOString();
    if (doubleOptIn) {
      const t = (existing && existing.token) || token();
      await store.setJSON(key, {
        email, status: 'pending', token: t,
        createdAt: (existing && existing.createdAt) || nowIso, confirmedAt: null,
      });
      const confirmUrl = `${SITE_ORIGIN}/api/confirm?email=${encodeURIComponent(email)}&token=${t}`;
      return reply(200, { ok: true, status: 'pending', confirmUrl, message: 'Almost there — check your inbox to confirm.' });
    }

    await store.setJSON(key, { email, status: 'confirmed', token: null, createdAt: nowIso, confirmedAt: nowIso });
    return reply(200, { ok: true, status: 'confirmed', message: "You're on the list." });
  } catch (err) {
    console.error('subscribe.mjs error:', err && err.name, err && err.message);
    return reply(503, { ok: false, error: 'Signup is temporarily unavailable. Please try again shortly.' });
  }
};
