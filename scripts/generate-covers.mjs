#!/usr/bin/env node
/**
 * generate-covers.mjs — THE SIGNAL generative cover-art system
 * ------------------------------------------------------------
 * Deterministic, dependency-free SVG cover generator. Each dispatch (and any
 * decorative media slot) gets a unique, on-brand cover derived purely from its
 * identity (issue number + title) — same input always produces the same art, so
 * covers are stable across rebuilds and future posts get art with zero manual
 * design work.
 *
 * Design language: the site's "dossier" aesthetic — dark ink field, mono
 * labels, an amber accent, and a technical/instrument feel. The secondary
 * accent is chosen by dispatch TYPE so the archive reads as one categorized
 * system (dispatch = amber, build = green, strategy = rust, system = steel).
 * The MOTIF is chosen by a seed hash of the title, so no two covers repeat.
 *
 * Output: images/covers/<slug>.svg (1200×675, OG-friendly 16:9).
 *
 * Usage:  node scripts/generate-covers.mjs
 *   Add/rename entries in POSTS below, re-run, and reference the emitted SVG as
 *   a plain <img src="images/covers/NNN.svg">. No build step, no runtime JS.
 */

import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const OUT_DIR = join(ROOT, 'images', 'covers');

const W = 1200;
const H = 675;

/* ----------------------------- palette ----------------------------- */
// Base ink field is shared; the accent is keyed to dispatch type.
const INK = '#0B0E14';
const PANEL = '#12161F';
const LINE = '#232A36';
const LINE_SOFT = '#1A2029';
const STROKE = '#33405280'; // brighter mid-tone for motif structure (readable on the gradient)
const BONE = '#E8E4D8';
const BONE_DIM = '#9AA2AE';

const ACCENTS = {
  dispatch: { key: '#E8B86A', label: 'DISPATCH' }, // amber
  build:    { key: '#4FB477', label: 'BUILD UPDATE' }, // green
  strategy: { key: '#C77B54', label: 'STRATEGY' }, // rust
  system:   { key: '#6E8BB0', label: 'SYSTEM' }, // steel
};

/* --------------------------- seeded PRNG --------------------------- */
// xfnv1a string hash → mulberry32 PRNG. Pure, deterministic.
function hash(str) {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}
function mulberry32(a) {
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const f2 = (n) => Math.round(n * 100) / 100; // trim float noise in output

/* ------------------------------ motifs ----------------------------- */
// Each motif returns SVG markup for the mid-ground. rnd() is the seeded PRNG;
// `a` is the accent hex. Motifs stay inside the 1200×675 field and lean on
// LINE/BONE_DIM for structure with sparse accent highlights.

function motifWaves(rnd, a) {
  const layers = 5;
  let out = '';
  for (let i = 0; i < layers; i++) {
    const amp = 26 + rnd() * 60;
    const phase = rnd() * Math.PI * 2;
    const freq = 1.4 + rnd() * 1.8;
    const yBase = 150 + i * 95;
    const pts = [];
    for (let x = -20; x <= W + 20; x += 28) {
      const y = yBase + Math.sin((x / W) * Math.PI * 2 * freq + phase) * amp;
      pts.push(`${f2(x)},${f2(y)}`);
    }
    const accent = i === layers - 2;
    out += `<polyline points="${pts.join(' ')}" fill="none" stroke="${accent ? a : STROKE}" stroke-width="${accent ? 2.4 : 1.4}" opacity="${accent ? 0.95 : 0.85}"/>`;
  }
  return out;
}

function motifNodes(rnd, a) {
  const n = 26 + Math.floor(rnd() * 8);
  const nodes = [];
  for (let i = 0; i < n; i++) nodes.push([80 + rnd() * (W - 160), 80 + rnd() * (H - 200)]);
  let edges = '';
  for (let i = 0; i < nodes.length; i++) {
    for (let j = i + 1; j < nodes.length; j++) {
      const dx = nodes[i][0] - nodes[j][0];
      const dy = nodes[i][1] - nodes[j][1];
      if (Math.hypot(dx, dy) < 250) {
        edges += `<line x1="${f2(nodes[i][0])}" y1="${f2(nodes[i][1])}" x2="${f2(nodes[j][0])}" y2="${f2(nodes[j][1])}" stroke="${STROKE}" stroke-width="1" opacity="0.8"/>`;
      }
    }
  }
  const hot = Math.floor(rnd() * nodes.length);
  let dots = '';
  nodes.forEach(([x, y], i) => {
    const on = i === hot;
    dots += `<circle cx="${f2(x)}" cy="${f2(y)}" r="${on ? 6 : 2.6 + rnd() * 2}" fill="${on ? a : BONE_DIM}" opacity="${on ? 1 : 0.8}"/>`;
    if (on) dots += `<circle cx="${f2(x)}" cy="${f2(y)}" r="14" fill="none" stroke="${a}" stroke-width="1.4" opacity="0.7"/>`;
  });
  return edges + dots;
}

function motifRadar(rnd, a) {
  const cx = 360 + rnd() * 480;
  const cy = 300 + rnd() * 120;
  let out = '';
  for (let r = 60; r <= 420; r += 60) {
    out += `<circle cx="${f2(cx)}" cy="${f2(cy)}" r="${r}" fill="none" stroke="${STROKE}" stroke-width="1" opacity="0.8"/>`;
  }
  out += `<line x1="${f2(cx - 460)}" y1="${f2(cy)}" x2="${f2(cx + 460)}" y2="${f2(cy)}" stroke="${STROKE}" stroke-width="1" opacity="0.7"/>`;
  out += `<line x1="${f2(cx)}" y1="${f2(cy - 340)}" x2="${f2(cx)}" y2="${f2(cy + 340)}" stroke="${STROKE}" stroke-width="1" opacity="0.7"/>`;
  const ang = rnd() * Math.PI * 2;
  const sweep = 0.5 + rnd() * 0.5;
  const x1 = cx + Math.cos(ang) * 420;
  const y1 = cy + Math.sin(ang) * 420;
  const x2 = cx + Math.cos(ang + sweep) * 420;
  const y2 = cy + Math.sin(ang + sweep) * 420;
  out += `<path d="M${f2(cx)},${f2(cy)} L${f2(x1)},${f2(y1)} A420,420 0 0,1 ${f2(x2)},${f2(y2)} Z" fill="${a}" opacity="0.10"/>`;
  out += `<line x1="${f2(cx)}" y1="${f2(cy)}" x2="${f2(x1)}" y2="${f2(y1)}" stroke="${a}" stroke-width="1.8" opacity="0.8"/>`;
  out += `<circle cx="${f2(cx)}" cy="${f2(cy)}" r="4" fill="${a}"/>`;
  return out;
}

function motifBars(rnd, a) {
  const count = 34;
  const gap = (W - 120) / count;
  const base = 540;
  let out = '';
  for (let i = 0; i < count; i++) {
    const h = 20 + rnd() * 300;
    const x = 60 + i * gap;
    const hot = rnd() > 0.82;
    out += `<rect x="${f2(x)}" y="${f2(base - h)}" width="${f2(gap * 0.55)}" height="${f2(h)}" fill="${hot ? a : STROKE}" opacity="${hot ? 0.85 : 0.8}"/>`;
  }
  out += `<line x1="40" y1="${base}" x2="${W - 40}" y2="${base}" stroke="${STROKE}" stroke-width="1.2" opacity="0.9"/>`;
  return out;
}

function motifOrbits(rnd, a) {
  const cx = 380 + rnd() * 440;
  const cy = 300 + rnd() * 100;
  let out = '';
  const rings = 3 + Math.floor(rnd() * 2);
  for (let i = 0; i < rings; i++) {
    const rx = 120 + i * 90 + rnd() * 30;
    const ry = rx * (0.42 + rnd() * 0.2);
    const rot = f2(rnd() * 180);
    out += `<ellipse cx="${f2(cx)}" cy="${f2(cy)}" rx="${f2(rx)}" ry="${f2(ry)}" fill="none" stroke="${STROKE}" stroke-width="1" opacity="0.8" transform="rotate(${rot} ${f2(cx)} ${f2(cy)})"/>`;
    const t = rnd() * Math.PI * 2;
    const px = cx + Math.cos(t) * rx;
    const py = cy + Math.sin(t) * ry;
    const cos = Math.cos((rot * Math.PI) / 180);
    const sin = Math.sin((rot * Math.PI) / 180);
    const dx = px - cx, dy = py - cy;
    const rxp = cx + dx * cos - dy * sin;
    const ryp = cy + dx * sin + dy * cos;
    out += `<circle cx="${f2(rxp)}" cy="${f2(ryp)}" r="${i === 0 ? 5.5 : 3.6}" fill="${i === 0 ? a : BONE_DIM}" opacity="0.9"/>`;
  }
  out += `<circle cx="${f2(cx)}" cy="${f2(cy)}" r="7" fill="${a}"/>`;
  out += `<circle cx="${f2(cx)}" cy="${f2(cy)}" r="18" fill="none" stroke="${a}" stroke-width="1.2" opacity="0.4"/>`;
  return out;
}

function motifStrata(rnd, a) {
  let out = '';
  const layers = 7 + Math.floor(rnd() * 3);
  const cx = W / 2 + (rnd() - 0.5) * 200;
  const cy = H / 2 + (rnd() - 0.5) * 80;
  for (let i = layers; i >= 0; i--) {
    const w = 120 + i * (70 + rnd() * 18);
    const h = w * 0.5;
    const hot = i === Math.floor(rnd() * layers);
    out += `<rect x="${f2(cx - w / 2)}" y="${f2(cy - h / 2)}" width="${f2(w)}" height="${f2(h)}" rx="10" fill="none" stroke="${hot ? a : STROKE}" stroke-width="${hot ? 2 : 1.1}" opacity="${hot ? 0.9 : 0.8}"/>`;
  }
  return out;
}

const MOTIFS = [motifWaves, motifNodes, motifRadar, motifBars, motifOrbits, motifStrata];

/* --------------------------- compositor ---------------------------- */
export function buildCover({ seed, kicker, big, type }) {
  const accent = ACCENTS[type] || ACCENTS.dispatch;
  const a = accent.key;
  const rnd = mulberry32(hash(seed));
  const motif = MOTIFS[hash(seed + '::motif') % MOTIFS.length];
  const mono = "'JetBrains Mono', ui-monospace, 'SFMono-Regular', Menlo, monospace";

  const ticks = [
    [40, 40, 40, 74], [40, 40, 74, 40],
    [W - 40, 40, W - 40, 74], [W - 40, 40, W - 74, 40],
    [40, H - 40, 40, H - 74], [40, H - 40, 74, H - 40],
    [W - 40, H - 40, W - 40, H - 74], [W - 40, H - 40, W - 74, H - 40],
  ].map(([x1, y1, x2, y2]) => `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${BONE_DIM}" stroke-width="1.4" opacity="0.55"/>`).join('');

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" role="img">
<defs>
  <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
    <stop offset="0" stop-color="${PANEL}"/>
    <stop offset="1" stop-color="${INK}"/>
  </linearGradient>
  <radialGradient id="glow" cx="0.78" cy="0.14" r="0.9">
    <stop offset="0" stop-color="${a}" stop-opacity="0.16"/>
    <stop offset="0.6" stop-color="${a}" stop-opacity="0"/>
  </radialGradient>
  <pattern id="grid" width="48" height="48" patternUnits="userSpaceOnUse">
    <path d="M48 0H0V48" fill="none" stroke="${LINE_SOFT}" stroke-width="1"/>
  </pattern>
</defs>
<rect width="${W}" height="${H}" fill="url(#bg)"/>
<rect width="${W}" height="${H}" fill="url(#grid)" opacity="0.6"/>
<rect width="${W}" height="${H}" fill="url(#glow)"/>
<g>${motif(rnd, a)}</g>
<rect x="0.5" y="0.5" width="${W - 1}" height="${H - 1}" fill="none" stroke="${LINE}" stroke-width="1"/>
${ticks}
<text x="60" y="86" font-family="${mono}" font-size="19" letter-spacing="6" fill="${BONE_DIM}">THE SIGNAL</text>
<text x="${W - 60}" y="86" text-anchor="end" font-family="${mono}" font-size="15" letter-spacing="4" fill="${BONE_DIM}">${kicker}</text>
<text x="60" y="${H - 132}" font-family="${mono}" font-size="15" letter-spacing="5" fill="${a}">${accent.label}</text>
<line x1="60" y1="${H - 114}" x2="${W - 60}" y2="${H - 114}" stroke="${a}" stroke-width="1.4" opacity="0.5"/>
<text x="58" y="${H - 42}" font-family="${mono}" font-size="80" font-weight="700" letter-spacing="-2" fill="${BONE}">${big}</text>
</svg>
`;
}

/* ------------------------------ posts ------------------------------ */
// The archive registry. `big` is the watermark (issue number); `type` keys the
// accent. Add a row here + re-run to mint a new cover for a future dispatch.
const POSTS = [
  { n: '021', type: 'build',    title: 'A desk built to disprove its own edge' },
  { n: '020', type: 'dispatch', title: 'The Signal Went Quiet' },
  { n: '019', type: 'dispatch', title: 'Built For The Machines' },
  { n: '018', type: 'dispatch', title: 'Cathedral Principle in Action' },
  { n: '017', type: 'build',    title: 'The Build Log' },
  { n: '016', type: 'build',    title: 'Steam to Silicon' },
  { n: '015', type: 'system',   title: 'The Ecosystem Era' },
  { n: '014', type: 'dispatch', title: 'The Signal Expands' },
  { n: '013', type: 'dispatch', title: 'The Cathedral Holds' },
  { n: '012', type: 'strategy', title: "The Operator's Edge" },
  { n: '011', type: 'dispatch', title: 'The Revenue Architecture' },
  { n: '010', type: 'strategy', title: 'Shopify or Die' },
  { n: '009', type: 'system',   title: 'The Gig Intelligence Stack' },
  { n: '008', type: 'build',    title: 'Cathedral Framework V2' },
  { n: '007', type: 'dispatch', title: 'The Solo Operator Manifesto' },
  { n: '006', type: 'system',   title: 'API-First or API-Dependent' },
  { n: '005', type: 'build',    title: 'The Proof Stack' },
  { n: '004', type: 'strategy', title: 'Zero Placeholders' },
  { n: '003', type: 'dispatch', title: 'The First Stone' },
  { n: '002', type: 'dispatch', title: 'Why I Build in Public' },
  { n: '001', type: 'dispatch', title: 'Signal Initiated' },
];

/* ------------------------------ emit ------------------------------- */
// Dispatches minted by scripts/archive-agent.mjs record themselves in
// data/archive-state.json. Merging them here means a plain `npm run covers`
// still regenerates every cover, including auto-published ones.
function generatedPosts() {
  try {
    const state = JSON.parse(readFileSync(join(ROOT, 'data', 'archive-state.json'), 'utf8'));
    return (state.published || []).map((entry) => ({
      n: entry.number,
      type: entry.coverType || 'dispatch',
      title: entry.title,
    }));
  } catch {
    return [];
  }
}

// Only emit when run directly — archive-agent.mjs imports buildCover from here
// and must not trigger a full cover rebuild as an import side effect.
function emitAll() {
  const seen = new Set(POSTS.map((p) => p.n));
  const allPosts = [...generatedPosts().filter((p) => !seen.has(p.n)), ...POSTS];

  mkdirSync(OUT_DIR, { recursive: true });
  let count = 0;
  for (const p of allPosts) {
    const svg = buildCover({
      seed: `signal-${p.n}-${p.title}`,
      kicker: `TRANSMISSION №${p.n}`,
      big: `№${p.n}`,
      type: p.type,
    });
    writeFileSync(join(OUT_DIR, `${p.n}.svg`), svg);
    count++;
  }
  console.log(`Generated ${count} covers → images/covers/`);
}

if (process.argv[1] && resolve(process.argv[1]) === resolve(fileURLToPath(import.meta.url))) {
  emitAll();
}
