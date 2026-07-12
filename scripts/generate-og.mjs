#!/usr/bin/env node
/**
 * generate-og.mjs — branded per-post Open Graph social cards
 * ----------------------------------------------------------
 * Reads the content index (data/content-index.json) and, for each targeted post,
 * renders a deterministic on-brand 1200×630 social card and wires the post's
 * og:image / twitter:image / JSON-LD image to it — replacing the generic
 * og-image.png so every link unfurls with its own card.
 *
 * Cards are SVG (branded dossier look, same palette as generate-covers.mjs),
 * rasterized to PNG via the pre-installed headless Chromium (scrapers don't
 * render SVG OG images reliably).
 *
 * Scope: fieldnotes (archive already has per-issue covers; daily can be added by
 * extending STREAMS). Idempotent — re-run any time. `npm run og`.
 */

import { readFile, writeFile, mkdir, readdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { execFile } from 'node:child_process';
import path from 'node:path';
import os from 'node:os';
import { fileURLToPath } from 'node:url';
import { promisify } from 'node:util';

const execFileP = promisify(execFile);
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OG_DIR = path.join(ROOT, 'images', 'og');
const SITE = 'https://1commercesolutions.com';
const CHROMIUM = process.env.CHROMIUM_BIN || '/opt/pw-browsers/chromium';

// which streams get cards from this run
const STREAMS = new Set(['fieldnotes']);

const INK = '#0B0E14', PANEL = '#12161F', LINE = '#232A36', LINE_SOFT = '#1A2029';
const BONE = '#E8E4D8', BONE_DIM = '#9AA2AE', GOLD = '#E8B86A';

const esc = (s) => String(s || '').replace(/[&<>]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]));

// naive word-wrap into <=maxLines lines of <=maxChars, ellipsizing overflow
function wrap(title, maxChars = 24, maxLines = 4) {
  const words = String(title).split(/\s+/);
  const lines = [];
  let cur = '';
  for (const w of words) {
    if ((cur + ' ' + w).trim().length <= maxChars) cur = (cur + ' ' + w).trim();
    else {
      if (cur) lines.push(cur);
      cur = w;
      if (lines.length === maxLines - 1) break;
    }
  }
  if (cur && lines.length < maxLines) lines.push(cur);
  if (lines.length === maxLines) {
    const used = lines.join(' ').split(/\s+/).length;
    if (used < words.length) lines[maxLines - 1] = lines[maxLines - 1].replace(/[.,;:]?$/, '') + '…';
  }
  return lines.slice(0, maxLines);
}

function cardSvg({ kicker, title, meta }) {
  const mono = "'JetBrains Mono', ui-monospace, monospace";
  const serif = "Georgia, 'Times New Roman', serif";
  const lines = wrap(title);
  const startY = 300 - (lines.length - 1) * 34;
  const titleTspans = lines
    .map((l, i) => `<tspan x="70" y="${startY + i * 68}">${esc(l)}</tspan>`)
    .join('');
  const ticks = [
    [40, 40, 40, 74], [40, 40, 74, 40],
    [1160, 40, 1160, 74], [1160, 40, 1126, 40],
    [40, 590, 40, 556], [40, 590, 74, 590],
    [1160, 590, 1160, 556], [1160, 590, 1126, 590],
  ].map(([x1, y1, x2, y2]) => `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${BONE_DIM}" stroke-width="1.5" opacity="0.5"/>`).join('');
  return `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630">
<defs>
  <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${PANEL}"/><stop offset="1" stop-color="${INK}"/></linearGradient>
  <radialGradient id="glow" cx="0.8" cy="0.1" r="0.9"><stop offset="0" stop-color="${GOLD}" stop-opacity="0.14"/><stop offset="0.6" stop-color="${GOLD}" stop-opacity="0"/></radialGradient>
  <pattern id="grid" width="48" height="48" patternUnits="userSpaceOnUse"><path d="M48 0H0V48" fill="none" stroke="${LINE_SOFT}" stroke-width="1"/></pattern>
</defs>
<rect width="1200" height="630" fill="url(#bg)"/>
<rect width="1200" height="630" fill="url(#grid)" opacity="0.6"/>
<rect width="1200" height="630" fill="url(#glow)"/>
<rect x="0.5" y="0.5" width="1199" height="629" fill="none" stroke="${LINE}" stroke-width="1"/>
${ticks}
<text x="70" y="96" font-family="${mono}" font-size="21" letter-spacing="7" fill="${BONE_DIM}">THE SIGNAL</text>
<text x="1130" y="96" text-anchor="end" font-family="${mono}" font-size="16" letter-spacing="4" fill="${GOLD}">${esc(kicker)}</text>
<line x1="70" y1="130" x2="1130" y2="130" stroke="${LINE}" stroke-width="1"/>
<text font-family="${serif}" font-size="58" font-weight="600" fill="#F3EFE3">${titleTspans}</text>
<line x1="70" y1="540" x2="1130" y2="540" stroke="${GOLD}" stroke-width="1.5" opacity="0.5"/>
<text x="70" y="578" font-family="${mono}" font-size="17" letter-spacing="3" fill="${BONE_DIM}">${esc(meta)}</text>
<text x="1130" y="578" text-anchor="end" font-family="${mono}" font-size="15" letter-spacing="3" fill="${BONE_DIM}">1COMMERCESOLUTIONS.COM</text>
</svg>`;
}

async function rasterize(svg, outPng) {
  const tmp = path.join(os.tmpdir(), 'og-' + Math.abs(hashStr(outPng)) + '.svg');
  await writeFile(tmp, svg);
  await execFileP(CHROMIUM, [
    '--headless', '--no-sandbox', '--disable-gpu', '--hide-scrollbars',
    '--force-device-scale-factor=1', '--window-size=1200,630',
    '--default-background-color=00000000',
    '--screenshot=' + outPng, 'file://' + tmp,
  ]);
}
function hashStr(s) { let h = 0; for (let i = 0; i < s.length; i++) h = (Math.imul(31, h) + s.charCodeAt(i)) | 0; return h; }

const prettyDate = (iso) => {
  if (!iso) return '';
  const [y, m, d] = iso.split('-').map(Number);
  const M = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'][m - 1] || '';
  return `${M} ${d}, ${y}`;
};

// ---- run ----
const index = JSON.parse(await readFile(path.join(ROOT, 'data', 'content-index.json'), 'utf8'));
const targets = index.items.filter((it) => it.kind === 'post' && STREAMS.has(it.stream));
await mkdir(OG_DIR, { recursive: true });

let made = 0, wired = 0;
for (const it of targets) {
  const base = it.id.split('/').pop(); // e.g. cathedral-principle
  const outPng = path.join(OG_DIR, base + '.png');
  const kicker = (it.type || it.stream).toUpperCase();
  const meta = [prettyDate(it.date), it.readMins ? it.readMins + ' MIN READ' : '']
    .filter(Boolean).join('  ·  ');
  await rasterize(cardSvg({ kicker, title: it.title, meta }), outPng);
  made++;

  // wire the post's head to its card
  const file = path.join(ROOT, it.id + '.html');
  if (existsSync(file)) {
    let html = await readFile(file, 'utf8');
    const cardUrl = `${SITE}/images/og/${base}.png`;
    const before = html;
    html = html.replaceAll(`${SITE}/og-image.png`, cardUrl);
    if (html !== before) {
      await writeFile(file, html);
      wired++;
    }
  }
}
console.log(`OG cards: generated ${made} PNG(s) → images/og/, wired og:image on ${wired} page(s).`);
