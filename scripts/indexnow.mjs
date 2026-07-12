#!/usr/bin/env node
/**
 * indexnow.mjs — instant search-engine pings via IndexNow
 * -------------------------------------------------------
 * IndexNow (indexnow.org) lets a site notify Bing, Yandex, Seznam, and other
 * participating engines the moment content changes — no account, no OAuth. One
 * POST to a single endpoint fans out to every engine. (Google does not
 * participate; the sitemap in Search Console covers Google.)
 *
 * Ownership is proven by hosting a key file at the site root:
 *   https://1commercesolutions.com/<key>.txt   (contents = the key)
 *
 * Usage:
 *   npm run indexnow                 # submit every URL in sitemap.xml
 *   npm run indexnow -- <url> [url]  # submit only the given URL(s)
 *
 * Exits 0 on success (or on a no-op), non-zero only on an unexpected error, so
 * it is safe to chain in CI.
 */

import { readFile, readdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const HOST = '1commercesolutions.com';
const SITE = `https://${HOST}`;
const ENDPOINT = 'https://api.indexnow.org/indexnow';
const KEY_RE = /^[a-f0-9]{8,128}\.txt$/;

// Discover the hosted key file (the 8–128 hex-char .txt at repo root).
async function findKey() {
  const entries = await readdir(ROOT, { withFileTypes: true });
  const file = entries.find((e) => e.isFile() && KEY_RE.test(e.name));
  if (!file) throw new Error('No IndexNow key file (<hex>.txt) found at repo root.');
  const key = (await readFile(path.join(ROOT, file.name), 'utf8')).trim();
  if (`${key}.txt` !== file.name) {
    throw new Error(`Key file ${file.name} contents (${key}) must match its filename.`);
  }
  return { key, keyLocation: `${SITE}/${file.name}` };
}

async function sitemapUrls() {
  const xml = await readFile(path.join(ROOT, 'sitemap.xml'), 'utf8');
  return [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1].trim());
}

const { key, keyLocation } = await findKey();
const argUrls = process.argv.slice(2).filter(Boolean);
const urlList = (argUrls.length ? argUrls : await sitemapUrls())
  .filter((u) => u.startsWith(SITE)); // IndexNow requires same-host URLs

if (!urlList.length) {
  console.log('IndexNow: no URLs to submit.');
  process.exit(0);
}

const body = { host: HOST, key, keyLocation, urlList };
const res = await fetch(ENDPOINT, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json; charset=utf-8', Accept: 'application/json' },
  body: JSON.stringify(body),
});

// IndexNow status codes: 200/202 accepted, 400 bad request, 403 key not
// validated (key file not reachable yet), 422 host/URL mismatch, 429 too many.
const detail = await res.text().catch(() => '');
if (res.status === 200 || res.status === 202) {
  console.log(`IndexNow: submitted ${urlList.length} URL(s) — ${res.status} accepted.`);
} else {
  console.warn(`IndexNow: ${res.status} ${detail || '(no body)'} — submitted ${urlList.length} URL(s).`);
  if (res.status === 403) {
    console.warn(`  → 403 means ${keyLocation} is not reachable yet. Re-run after the key file deploys.`);
  }
}
