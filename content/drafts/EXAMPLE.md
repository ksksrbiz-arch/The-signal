---
title: Your Post Title Here
slug: your-post-slug
description: One or two sentences used for the meta description, OG/Twitter card, and search snippet.
date: 2026-07-12
tags: Tag One, Tag Two, Tag Three
section: Fieldnote
---

Write the post in **Markdown**. The first paragraph sets the tone.

## A section heading

Supports `inline code`, [links](https://1commercesolutions.com), **bold**, *italic*,
bullet and numbered lists, > blockquotes, `---` rules, and ``` code fences.

- Point one
- Point two

> A pull quote lands with the amber rule treatment.

Then run:

    npm run new-post -- content/drafts/EXAMPLE.md
    npm run index && npm run og && npm run blog

…which creates `fieldnotes/<slug>.html` and wires it into search, its social
card, and the /blog hub automatically.
