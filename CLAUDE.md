# CLAUDE.md - AI Assistant Guide for The-signal

## Project Overview

**The-signal** is a static SPA hosted on Netlify. It features a dark gothic cathedral aesthetic with a blog system, user authentication (Supabase), newsletter signup, and the original PDF document — all auto-deployed from the git repository.

- **Repository**: `ksksrbiz-arch/The-signal`
- **Hosting**: Netlify (auto-deploys on push)
- **Primary branch**: `main`

## Repository Structure

```
The-signal/
├── index.html          # Main SPA shell (header, footer, app mount point)
├── app.js              # Application logic (auth, blog, newsletter, posts)
├── router.js           # Hash-based SPA router
├── pages.js            # Page renderers (home, blog, write, auth, post detail)
├── supabase-config.js  # Supabase client configuration
├── base.css            # CSS reset and design tokens
├── style.css           # Component and page styles
├── the-signal.pdf      # The original PDF document
├── og-image.svg        # Open Graph social sharing image
├── robots.txt          # Search engine crawling rules
├── 404.html            # Custom 404 error page
├── netlify.toml        # Netlify config (headers, redirects, plugins, caching)
├── _redirects          # Redirect rules (PDF aliases + SPA catch-all)
├── CLAUDE.md           # This file - AI assistant guidance
└── .git/               # Git metadata
```

### Key Files

| File | Description |
|------|-------------|
| `index.html` | SPA shell with meta tags, structured data (JSON-LD), font/script loading |
| `app.js` | Core app logic: auth flows, blog CRUD, newsletter, theme toggle |
| `router.js` | Hash-based client-side router (`#/`, `#/blog`, `#/write`, `#/auth`, `#/post/:id`) |
| `pages.js` | Page rendering functions for each route |
| `supabase-config.js` | Supabase project URL and anon key |
| `base.css` / `style.css` | Design system: dark/light themes, gothic cathedral aesthetic |
| `the-signal.pdf` | The original PDF document (binary) |
| `404.html` | Custom error page for missing routes |
| `netlify.toml` | Build config, plugins (checklinks, sitemap), security headers, caching |
| `_redirects` | PDF convenience routes (`/pdf`, `/download`) + SPA fallback |

## Tech Stack

- **No build system** - purely static file serving (Netlify runs plugins only)
- **No package manager** - no `package.json`, `requirements.txt`, or similar
- **Supabase** - backend for auth, blog posts, and user data (loaded via CDN)
- **Netlify** - hosting, deployment, plugins (checklinks, sitemap)
- **Hash-based SPA routing** - all routes handled client-side via `#/` fragments

## Development Workflow

### Deployment

All deployments are automatic via Netlify:
1. Push changes to the `main` branch
2. Netlify detects the push and deploys automatically
3. Netlify runs plugins (checklinks, sitemap) but no custom build step

### Branching

- `main` - production branch, auto-deployed by Netlify
- `master` - legacy branch (exists but `main` is the primary)
- Feature branches follow the pattern `claude/<description>` or standard naming

### Commits

- Use clear, descriptive commit messages
- Keep commits focused on a single change

## Important Notes

- **`the-signal.pdf` is binary**: Do not attempt to edit it as text. Replace the file to update the PDF.
- **`index.html` is the SPA shell**: It loads CSS, fonts, Supabase SDK, and contains structured data. App logic is in `app.js`, `router.js`, and `pages.js`.
- **Supabase config**: `supabase-config.js` contains the project URL and anon key. Do not commit service role keys.
- **Netlify config**: `netlify.toml` manages security headers, caching, plugins, and redirects. `_redirects` provides fallback rules.
- **SPA routing**: Uses hash fragments (`#/blog`, `#/write`, etc.). The `_redirects` catch-all (`/* /index.html 200`) ensures all paths serve the SPA shell.
- **No CI/CD pipeline**: There are no GitHub Actions or test suites beyond Netlify's built-in plugins.

## Common Tasks

### Adding new pages or content
Add a route in `router.js`, a renderer in `pages.js`, and update nav links in `index.html`.

### Modifying the PDF
Replace `the-signal.pdf` with an updated PDF file. The filename must remain `the-signal.pdf` for download links to work.

### Modifying styles
Edit `base.css` for design tokens/resets or `style.css` for component styles. Both support `[data-theme="dark"]` and `[data-theme="light"]`.

## Terminal Setup (GitHub Codespaces)

This project is designed to be worked on from **GitHub Codespaces**, where the terminal is available directly in the browser.

### Authentication

Codespaces injects `GITHUB_TOKEN` automatically — no SSH key or personal access token setup is needed for push/pull operations.

If a push prompts for credentials, set the remote URL explicitly:

```bash
git remote set-url origin https://<YOUR_GITHUB_USERNAME>:<YOUR_TOKEN>@github.com/ksksrbiz-arch/The-signal.git
```

### Common Terminal Commands

**Deploy to production** (push to `main`):
```bash
git push origin main
```
Netlify detects the push and deploys within seconds.

**Create and push a release tag**:
```bash
git tag v1.0
git push origin v1.0
```
After pushing, visit `github.com/ksksrbiz-arch/The-signal/releases` to convert the tag into a formal GitHub Release with a title and description.

**Check deployment status**: Visit the Netlify dashboard or the repository's Deployments tab on GitHub.

### Local Preview

To preview the site locally without deploying:
```bash
python3 -m http.server 8080
```
Then open `http://localhost:8080` in the browser.

## Conventions for AI Assistants

1. **Keep it simple** - avoid introducing unnecessary complexity or build tools
2. **Do not add build tools** unless explicitly requested
3. **Binary files** - `the-signal.pdf` is a binary PDF; do not read/edit it as text
4. **Test locally** - changes can be previewed by opening files directly in a browser or using a simple HTTP server
5. **Push to `main`** for production deployments via Netlify
6. **SPA routes** - new pages are added via `router.js` and `pages.js`, not as separate HTML files
