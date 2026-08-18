#!/usr/bin/env node
/**
 * archive-publish.mjs — one command that publishes a dispatch end to end.
 *
 * GitHub Actions is unavailable on this repo right now, so the live publisher is
 * a Claude routine (see CLAUDE.md, "Publishing without GitHub Actions"). Keeping
 * the whole sequence here rather than in the routine's prompt means the routine
 * stays a one-liner and the logic is versioned, reviewable, and testable.
 *
 * Sequence: gates -> generate -> rebuild derived files -> commit -> push -> ping.
 *
 * Exit codes:
 *   0  published, or nothing to publish (a refused draft is a normal quiet day)
 *   1  something actually broke and needs a human
 *
 * A refused draft exits 0 on purpose: the agent declining to publish filler is
 * the system working, and it should not read as a failure in the routine log.
 *
 * Env: GROQ_API_KEY and/or GEMINI_API_KEY (required to generate anything).
 *      SIGNAL_DATE, ARCHIVE_TOPIC_ID, DRY_RUN=1 are passed through to the agent.
 */

import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SITE_URL = 'https://1commercesolutions.com';
const DRY_RUN = process.env.DRY_RUN === '1';

function run(command, args, { allowFailure = false, quiet = false } = {}) {
  try {
    const output = execFileSync(command, args, {
      cwd: ROOT,
      encoding: 'utf8',
      stdio: quiet ? ['ignore', 'pipe', 'pipe'] : ['ignore', 'inherit', 'inherit'],
    });
    return { ok: true, output: output || '' };
  } catch (error) {
    if (allowFailure) return { ok: false, output: `${error.stdout || ''}${error.stderr || ''}` };
    throw error;
  }
}

function git(args, options) {
  return run('git', args, options);
}

function step(label) {
  console.log(`\n── ${label}`);
}

function main() {
  if (!process.env.GROQ_API_KEY && !process.env.GEMINI_API_KEY) {
    console.error(
      'archive-publish: neither GROQ_API_KEY nor GEMINI_API_KEY is set in this environment.\n' +
        '  These must be present where this command runs. Netlify environment variables do NOT\n' +
        '  apply here — they only reach Netlify builds and functions, not this process.',
    );
    process.exit(1);
  }

  step('Verifying agent gates');
  run('npm', ['run', 'test:archive']);

  step('Generating dispatch');
  const generated = run('npm', ['run', 'archive:agent'], { allowFailure: true });
  if (!generated.ok) {
    console.log(
      '\narchive-publish: nothing published this run. A quality gate refused the draft, or no\n' +
        'provider was reachable. This is the intended behaviour on a bad day — a quiet day costs\n' +
        'nothing, a thin page costs the whole site. Exiting 0.',
    );
    return;
  }

  if (DRY_RUN) {
    console.log('\narchive-publish: DRY_RUN set — stopping before rebuild and commit.');
    return;
  }

  step('Rebuilding covers, indexes, feeds, and sitemap');
  for (const script of ['covers', 'index', 'blog', 'series', 'issue', 'seo:agent']) {
    run('npm', ['run', script]);
  }

  step('Committing');
  const status = git(['status', '--porcelain'], { quiet: true }).output.trim();
  if (!status) {
    console.log('archive-publish: no file changes to commit.');
    return;
  }

  const state = JSON.parse(readFileSync(path.join(ROOT, 'data', 'archive-state.json'), 'utf8'));
  const latest = state.published?.[0];
  if (!latest) {
    console.error('archive-publish: archive-state.json has no published entry — refusing to commit.');
    process.exit(1);
  }

  git(['config', 'user.name', 'signal-archive-agent']);
  git(['config', 'user.email', 'skdev@1commercesolutions.com']);
  git(['add', 'archive', 'data', 'images/covers', 'blog', 'sitemap.xml', 'feed.xml', 'feed.json']);
  git(['commit', '-m', `Publish archive transmission №${latest.number}: ${latest.title}`]);

  step('Pushing to main');
  let pushed = false;
  for (let attempt = 1; attempt <= 4; attempt += 1) {
    if (git(['push', 'origin', 'HEAD:main'], { allowFailure: true }).ok) {
      pushed = true;
      break;
    }
    console.log(`  push attempt ${attempt} failed; rebasing on origin/main and retrying`);
    git(['fetch', 'origin', 'main'], { allowFailure: true });
    git(['rebase', 'origin/main'], { allowFailure: true });
  }

  if (!pushed) {
    console.error(
      'archive-publish: could not push to main after 4 attempts. The dispatch is committed\n' +
        'locally but not published. Check branch protection and the push credentials.',
    );
    process.exit(1);
  }

  console.log(`\narchive-publish: published archive/${latest.number}.html — "${latest.title}"`);

  // Best-effort crawl notification; never fails the run.
  step('Pinging IndexNow');
  const page = `${SITE_URL}/archive/${latest.number}.html`;
  const ping = run('npm', ['run', 'indexnow', '--', page, `${SITE_URL}/archive/`, `${SITE_URL}/blog/`], {
    allowFailure: true,
  });
  if (!ping.ok) console.log('  IndexNow ping failed — discovery is best-effort, continuing.');
}

try {
  main();
} catch (error) {
  console.error(`archive-publish failed: ${error?.message || error}`);
  process.exit(1);
}
