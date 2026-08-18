import { mkdir, readdir, readFile, stat, writeFile } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SITE_URL = 'https://1commercesolutions.com';
const DATA_DIR = path.join(ROOT, 'data');
// Keep the crawl to real, publicly-served site pages. `.claude` holds agent
// worktrees (full repo copies) that would otherwise multiply every page into the
// sitemap; `noir-reel-engine` is a separate Python toolkit; `.netlify`/`_dev` are
// build/scratch dirs. Mirrors build-index.mjs's exclusion set.
const EXCLUDED_DIRS = new Set(['.git', '.github', '.claude', '.netlify', 'node_modules', 'noir-reel-engine', '_dev']);

function diagnosticMessage(error) {
  return String(error?.message || 'unknown error')
    .replace(/Bearer\s+[A-Za-z0-9._-]+/gi, 'Bearer [redacted]')
    .replace(/[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g, '[redacted-email]')
    .slice(0, 160);
}

function escapeXml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&apos;');
}

async function walk(dir) {
  const entries = await readdir(dir, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    if (entry.isDirectory()) {
      if (!EXCLUDED_DIRS.has(entry.name)) {
        files.push(...(await walk(path.join(dir, entry.name))));
      }
      continue;
    }
    if (entry.isFile() && entry.name.endsWith('.html') && entry.name !== '404.html') {
      files.push(path.join(dir, entry.name));
    }
  }
  return files;
}

function urlFor(file) {
  const relative = path.relative(ROOT, file).replaceAll(path.sep, '/');
  if (relative === 'index.html') return `${SITE_URL}/`;
  if (relative.endsWith('/index.html')) return `${SITE_URL}/${relative.replace(/index\.html$/, '')}`;
  return `${SITE_URL}/${relative}`;
}

function metadata(html) {
  return {
    title: html.match(/<title>([^<]+)<\/title>/i)?.[1]?.trim() || '',
    description: html.match(/<meta\s+name=["']description["']\s+content=(["'])(.*?)\1/i)?.[2]?.trim() || '',
    canonical: html.match(/<link\s+rel=["']canonical["']\s+href=(["'])(.*?)\1/i)?.[2]?.trim() || '',
    robots: html.match(/<meta\s+name=["']robots["']\s+content=(["'])(.*?)\1/i)?.[2]?.trim() || '',
    ogTitle: html.match(/<meta\s+property=["']og:title["']\s+content=(["'])(.*?)\1/i)?.[2]?.trim() || '',
    ogDescription: html.match(/<meta\s+property=["']og:description["']\s+content=(["'])(.*?)\1/i)?.[2]?.trim() || '',
    headline: html.match(/"headline"\s*:\s*"([^"]+)"/i)?.[1]?.trim() || '',
    datePublished: html.match(/"datePublished"\s*:\s*"(\d{4}-\d{2}-\d{2})/i)?.[1] || '',
  };
}

// RFC-822 date for RSS, anchored at noon UTC for stability.
const RFC822_DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const RFC822_MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
function rfc822(isoDate) {
  const d = new Date(`${isoDate}T12:00:00Z`);
  if (Number.isNaN(d.getTime())) return '';
  const day = RFC822_DAYS[d.getUTCDay()];
  const mon = RFC822_MONTHS[d.getUTCMonth()];
  const dd = String(d.getUTCDate()).padStart(2, '0');
  return `${day}, ${dd} ${mon} ${d.getUTCFullYear()} 12:00:00 +0000`;
}

// The feed syndicates real posts only: weekly dispatches (archive/NNN.html)
// and field notes (fieldnotes/*.html) — not index/landing pages.
function isFeedItem(relative) {
  return /^archive\/\d+\.html$/.test(relative) || (/^fieldnotes\/[^/]+\.html$/.test(relative) && relative !== 'fieldnotes/index.html');
}

function buildFeed(items) {
  const ordered = items
    .filter((item) => item.date)
    .sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0))
    .slice(0, 30);
  const lastBuild = ordered[0] ? rfc822(ordered[0].date) : rfc822(new Date().toISOString().slice(0, 10));
  const entries = ordered
    .map(
      (item) => `    <item>
      <title>${escapeXml(item.title)}</title>
      <link>${escapeXml(item.url)}</link>
      <guid isPermaLink="true">${escapeXml(item.url)}</guid>
      <pubDate>${rfc822(item.date)}</pubDate>
      <description>${escapeXml(item.description)}</description>
    </item>`,
    )
    .join('\n');
  return `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>THE SIGNAL — Weekly Dispatches</title>
    <link>${SITE_URL}/archive/</link>
    <description>Weekly transmissions and field notes from the front lines of 1Commerce LLC — proof-first commerce infrastructure, built in public from Canby, Oregon.</description>
    <language>en-us</language>
    <copyright>© ${new Date().getUTCFullYear()} 1Commerce LLC</copyright>
    <managingEditor>skdev@1commerce.online (Keith)</managingEditor>
    <lastBuildDate>${lastBuild}</lastBuildDate>
    <atom:link href="${SITE_URL}/feed.xml" rel="self" type="application/rss+xml" />
    <image><url>${SITE_URL}/og-image.png</url><title>THE SIGNAL</title><link>${SITE_URL}/archive/</link></image>
${entries}
  </channel>
</rss>
`;
}

function priorityFor(url) {
  if (url === `${SITE_URL}/`) return '1.0';
  if (url.endsWith('/archive/') || url.endsWith('/fieldnotes/') || url.endsWith('/news/') || url.endsWith('/daily/') || url.endsWith('/blog/')) return '0.9';
  if (url.endsWith('/blog/series/') || url.endsWith('/blog/issues/')) return '0.8';
  if (url.includes('/archive/') || url.includes('/fieldnotes/') || url.includes('/daily/') || url.includes('/blog/')) return '0.7';
  return '0.6';
}

function changefreqFor(url) {
  if (url.endsWith('/news/') || url.includes('/daily/')) return 'daily';
  if (url === `${SITE_URL}/` || url.endsWith('/archive/') || url.endsWith('/fieldnotes/') || url.endsWith('/blog/')) return 'weekly';
  if (url.endsWith('/blog/series/') || url.endsWith('/blog/issues/')) return 'weekly';
  return 'monthly';
}

async function lastModifiedDate(file) {
  const relative = path.relative(ROOT, file);
  try {
    const date = execFileSync('git', ['log', '-1', '--format=%cs', '--', relative], {
      cwd: ROOT,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe'],
    }).trim();
    if (/^\d{4}-\d{2}-\d{2}$/.test(date)) return date;
  } catch (error) {
    console.warn(`Using filesystem modification time for ${relative}. ${diagnosticMessage(error)}`);
  }

  const stats = await stat(file);
  return stats.mtime.toISOString().slice(0, 10);
}

async function main() {
  await mkdir(DATA_DIR, { recursive: true });
  const files = (await walk(ROOT)).sort();
  const pages = [];
  const feedItems = [];
  const issues = [];
  const noindexed = [];

  for (const file of files) {
    const html = await readFile(file, 'utf8');
    const url = urlFor(file);
    const meta = metadata(html);
    const relative = path.relative(ROOT, file).replaceAll(path.sep, '/');

    if (!meta.title) issues.push({ file: relative, issue: 'Missing <title>' });
    if (!meta.description) issues.push({ file: relative, issue: 'Missing meta description' });
    if (!meta.canonical) issues.push({ file: relative, issue: 'Missing canonical link' });
    if (meta.canonical && meta.canonical !== url) issues.push({ file: relative, issue: `Canonical does not match expected URL: ${url}` });
    if (!meta.ogTitle) issues.push({ file: relative, issue: 'Missing og:title' });
    if (!meta.ogDescription) issues.push({ file: relative, issue: 'Missing og:description' });

    const lastmod = await lastModifiedDate(file);

    // A noindex page must never appear in the sitemap — submitting a URL we ask
    // Google to drop sends contradictory signals. Dated /daily/ briefs are the
    // main case. Such pages are still audited above and still feed the RSS/JSON
    // feeds below, so this only gates sitemap inclusion.
    const indexable = !/noindex/i.test(meta.robots);
    if (!indexable) noindexed.push(relative);

    if (indexable) pages.push({
      file: relative,
      url,
      lastmod,
      changefreq: changefreqFor(url),
      priority: priorityFor(url),
      title: meta.title,
      description: meta.description,
    });

    if (isFeedItem(relative)) {
      feedItems.push({
        url,
        title: meta.headline || meta.ogTitle || meta.title,
        description: meta.ogDescription || meta.description,
        date: meta.datePublished || lastmod,
      });
    }
  }

  const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${pages
  .map(
    (page) => `  <url>
    <loc>${escapeXml(page.url)}</loc>
    <lastmod>${page.lastmod}</lastmod>
    <changefreq>${page.changefreq}</changefreq>
    <priority>${page.priority}</priority>
  </url>`,
  )
  .join('\n\n')}
</urlset>
`;

  await writeFile(path.join(ROOT, 'sitemap.xml'), sitemap);
  await writeFile(path.join(ROOT, 'feed.xml'), buildFeed(feedItems));
  await writeFile(
    path.join(DATA_DIR, 'seo-report.json'),
    `${JSON.stringify(
      {
        generatedAt: process.env.SIGNAL_DATE || new Date().toISOString().slice(0, 10),
        pagesScanned: pages.length,
        noindexedExcluded: noindexed.length,
        issuesFound: issues.length,
        issues,
        noindexed,
        pages,
      },
      null,
      2,
    )}\n`,
  );

  console.log(`SEO agent scanned ${pages.length} pages, wrote ${Math.min(feedItems.length, 30)} feed items, excluded ${noindexed.length} noindex pages from the sitemap, and found ${issues.length} metadata issues.`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
