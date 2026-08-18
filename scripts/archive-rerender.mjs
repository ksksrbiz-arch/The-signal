#!/usr/bin/env node
/**
 * archive-rerender.mjs — replay stored drafts through the current renderer.
 *
 * Dispatch pages are rendered once at publish time, so a change to the template
 * or the design would otherwise only ever reach dispatches published after it.
 * Every published draft is kept in data/dispatches/, and this replays them, so
 * a design improvement applies to the whole archive rather than splitting it
 * into a before and an after.
 *
 * Only dispatches with a stored draft are re-rendered. Hand-written dispatches
 * (001–021) have no stored source and are deliberately left untouched — their
 * bespoke layouts are the point, and clobbering them with the generated
 * template would destroy real work.
 *
 * Usage: npm run archive:rerender [--dry-run]
 */

import { readdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

import { ARCHIVE_DIR, ROOT, existingNumbers, renderPage } from './archive-pipeline.mjs';

const DRY_RUN = process.argv.includes('--dry-run');
const DRAFTS_DIR = path.join(ROOT, 'data', 'dispatches');

async function main() {
  let files;
  try {
    files = (await readdir(DRAFTS_DIR)).filter((f) => /^\d{3}\.json$/.test(f)).sort();
  } catch {
    console.log('archive-rerender: no stored drafts yet — nothing to do.');
    return;
  }

  if (!files.length) {
    console.log('archive-rerender: no stored drafts yet — nothing to do.');
    return;
  }

  const numbers = await existingNumbers();
  let rendered = 0;

  for (const file of files) {
    const draft = JSON.parse(await readFile(path.join(DRAFTS_DIR, file), 'utf8'));
    const number = draft.number || file.replace('.json', '');
    const index = numbers.indexOf(number);
    const prev = index > 0 ? numbers[index - 1] : null;

    const html = renderPage(draft, { number, date: draft.date, prev });
    const target = path.join(ARCHIVE_DIR, `${number}.html`);

    if (DRY_RUN) {
      const current = await readFile(target, 'utf8').catch(() => '');
      console.log(`  ${number}: ${current === html ? 'unchanged' : 'would change'} (${html.length} bytes)`);
    } else {
      await writeFile(target, html);
      console.log(`  ${number}: re-rendered`);
    }
    rendered += 1;
  }

  console.log(`\narchive-rerender: ${DRY_RUN ? 'checked' : 're-rendered'} ${rendered} dispatch(es).`);
  if (!DRY_RUN) console.log('Run `npm run seo:agent` if metadata changed, then commit.');
}

main().catch((error) => {
  console.error(`archive-rerender failed: ${error?.message || error}`);
  process.exit(1);
});
