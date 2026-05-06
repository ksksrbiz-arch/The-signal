import { mkdir, readdir, readFile, stat, writeFile } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SITE_URL = 'https://1commercesolutions.com';
const DATA_DIR = path.join(ROOT, 'data');
const EXCLUDED_DIRS = new Set(['.git', '.github', 'node_modules']);

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
    description: html.match(/<meta\s+name=["']description["']\s+content=["']([^"']+)["']/i)?.[1]?.trim() || '',
    canonical: html.match(/<link\s+rel=["']canonical["']\s+href=["']([^"']+)["']/i)?.[1]?.trim() || '',
    ogTitle: html.match(/<meta\s+property=["']og:title["']\s+content=["']([^"']+)["']/i)?.[1]?.trim() || '',
    ogDescription: html.match(/<meta\s+property=["']og:description["']\s+content=["']([^"']+)["']/i)?.[1]?.trim() || '',
  };
}

function priorityFor(url) {
  if (url === `${SITE_URL}/`) return '1.0';
  if (url.endsWith('/archive/') || url.endsWith('/fieldnotes/') || url.endsWith('/news/') || url.endsWith('/daily/')) return '0.9';
  if (url.includes('/archive/') || url.includes('/fieldnotes/') || url.includes('/daily/')) return '0.7';
  return '0.6';
}

function changefreqFor(url) {
  if (url.endsWith('/news/') || url.includes('/daily/')) return 'daily';
  if (url === `${SITE_URL}/` || url.endsWith('/archive/') || url.endsWith('/fieldnotes/')) return 'weekly';
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
  const issues = [];

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

    pages.push({
      file: relative,
      url,
      lastmod: await lastModifiedDate(file),
      changefreq: changefreqFor(url),
      priority: priorityFor(url),
      title: meta.title,
      description: meta.description,
    });
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
  await writeFile(
    path.join(DATA_DIR, 'seo-report.json'),
    `${JSON.stringify(
      {
        generatedAt: process.env.SIGNAL_DATE || new Date().toISOString().slice(0, 10),
        pagesScanned: pages.length,
        issuesFound: issues.length,
        issues,
        pages,
      },
      null,
      2,
    )}\n`,
  );

  console.log(`SEO agent scanned ${pages.length} pages and found ${issues.length} metadata issues.`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
