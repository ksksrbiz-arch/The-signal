// The Signal — double opt-in confirmation endpoint (self-hosted)
// --------------------------------------------------------------
// Netlify Functions v2 (ESM). Redeems the token minted by /api/subscribe when
// NEWSLETTER_DOUBLE_OPTIN is enabled, flipping a subscriber from "pending" to
// "confirmed" in the Netlify Blobs "subscribers" store, then best-effort
// mirrors them into Resend (see functions/lib/resend-contacts.mjs) so
// functions/send-signal.js can reach them. Returns a small branded HTML page
// so the confirmation link is clickable straight from an inbox.
//
//   GET /api/confirm?email=<addr>&token=<token>
//
// Serves at /api/confirm via config.path (no netlify.toml redirect needed).

import { getStore } from '@netlify/blobs';
import { syncConfirmedContact } from './lib/resend-contacts.mjs';

export const config = { path: '/api/confirm' };

const SITE_ORIGIN = 'https://1commercesolutions.com';
const keyFor = (email) => 'sub:' + email.replace(/[^a-z0-9._@+-]/g, '_');
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function page(title, body, status = 200) {
  const html = `<!DOCTYPE html>
<html lang="en" data-theme="dark">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<meta name="robots" content="noindex">
<title>${title} — THE SIGNAL</title>
<link rel="icon" type="image/svg+xml" href="/assets/brand/favicon.svg">
<style>
:root{color-scheme:dark}
body{margin:0;min-height:100vh;display:grid;place-items:center;background:#0B0E13;color:#E7EAF0;
  font-family:"IBM Plex Sans",system-ui,sans-serif;text-align:center;padding:24px}
.card{max-width:440px;border:1px solid #232a36;border-radius:14px;padding:40px 34px;background:#11151d}
.kick{font-family:"JetBrains Mono",ui-monospace,monospace;font-size:12px;letter-spacing:.18em;
  text-transform:uppercase;color:#E8B86A;margin:0 0 14px}
h1{font-family:"Fraunces",Georgia,serif;font-size:26px;margin:0 0 12px;font-weight:600}
p{color:#9AA2AE;line-height:1.6;margin:0 0 24px}
a.btn{display:inline-block;text-decoration:none;border:1px solid #E8B86A;color:#E8B86A;
  border-radius:8px;padding:11px 22px;font-size:14px}
</style>
</head>
<body>
  <div class="card">
    <p class="kick">◆ The Signal</p>
    ${body}
    <a class="btn" href="${SITE_ORIGIN}/">Back to the site</a>
  </div>
</body>
</html>`;
  return new Response(html, { status, headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' } });
}

export default async (req) => {
  if (req.method !== 'GET') return page('Not allowed', '<h1>Method not allowed</h1><p>Use the confirmation link from your inbox.</p>', 405);

  const url = new URL(req.url);
  const email = String(url.searchParams.get('email') || '').trim().toLowerCase();
  const tok = String(url.searchParams.get('token') || '').trim();

  if (!EMAIL_RE.test(email) || !tok) {
    return page('Invalid link', '<h1>That link looks off</h1><p>The confirmation link is missing or malformed. Try subscribing again.</p>', 400);
  }

  try {
    const store = getStore('subscribers');
    const key = keyFor(email);
    const rec = await store.get(key, { type: 'json' });

    if (!rec) return page('Not found', '<h1>No pending signup</h1><p>We couldn’t find that subscription. Try subscribing again.</p>', 404);
    if (rec.status === 'confirmed') return page('Confirmed', '<h1>You’re already confirmed</h1><p>Your spot on the list is set. Watch for the next dispatch.</p>');
    if (rec.token !== tok) return page('Invalid link', '<h1>That link looks off</h1><p>The token didn’t match. Try subscribing again to get a fresh link.</p>', 400);

    await store.setJSON(key, { ...rec, status: 'confirmed', token: null, confirmedAt: new Date().toISOString() });
    await syncConfirmedContact(email);
    return page('Confirmed', '<h1>You’re on the list</h1><p>Confirmation received. One dispatch per week, no noise.</p>');
  } catch (err) {
    console.error('confirm.mjs error:', err && err.name, err && err.message);
    return page('Unavailable', '<h1>Something went wrong</h1><p>Confirmation is temporarily unavailable. Please try the link again shortly.</p>', 503);
  }
};
