# CLAUDE.md - AI Assistant Guide for The-signal

## Project Overview

**The-signal** is a static site hosted on Netlify. It serves a PDF document via an HTML landing page with an embedded viewer, auto-deployed from the git repository.

- **Repository**: `ksksrbiz-arch/The-signal`
- **Hosting**: Netlify (auto-deploys on push)
- **Primary branch**: `main`

## Repository Structure

```
The-signal/
├── index.html        # HTML landing page with embedded PDF viewer
├── the-signal.pdf    # The PDF document
├── 404.html          # Custom 404 error page
├── netlify.toml      # Netlify configuration (headers, redirects, caching)
├── _redirects        # Backup redirect rules for Netlify
├── CLAUDE.md         # This file - AI assistant guidance
└── .git/             # Git metadata
```

### Key Files

| File | Description |
|------|-------------|
| `index.html` | HTML landing page with embedded PDF viewer, fallback chain, and download links |
| `the-signal.pdf` | The PDF document served by the site |
| `404.html` | Custom error page for missing routes |
| `netlify.toml` | Netlify config: security headers, caching rules, redirect aliases |
| `_redirects` | Backup redirects (`/pdf`, `/download`) and catch-all 404 rule |

## Tech Stack

- **No build system** - purely static file serving
- **No package manager** - no `package.json`, `requirements.txt`, or similar
- **No frameworks or libraries** - raw static content
- **Netlify** - hosting and deployment platform

## Development Workflow

### Deployment

All deployments are automatic via Netlify:
1. Push changes to the `main` branch
2. Netlify detects the push and deploys automatically
3. No build step is required - files are served as-is

### Branching

- `main` - production branch, auto-deployed by Netlify
- `master` - legacy branch (exists but `main` is the primary)
- Feature branches follow the pattern `claude/<description>` or standard naming

### Commits

- The repository was initialized by `netlify[bot]`
- Use clear, descriptive commit messages
- Keep commits focused on a single change

## Important Notes

- **`the-signal.pdf` is binary**: Do not attempt to edit it as text. Replace the file to update the PDF.
- **`index.html` is the HTML wrapper**: It embeds the PDF with a fallback chain (`<object>` -> `<embed>` -> `<iframe>` -> download link).
- **Netlify config**: `netlify.toml` manages security headers, caching, and redirects. `_redirects` is a backup.
- **No CI/CD pipeline**: There are no GitHub Actions, test suites, or linting configurations.
- **No environment variables or secrets**: The project has no `.env` files or configuration requirements.

## Common Tasks

### Adding new pages or content
Place static files in the repository root. Netlify will serve them directly.

### Modifying the PDF
Replace `the-signal.pdf` with an updated PDF file. The filename must remain `the-signal.pdf` for the embedded viewer to work.

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
Netlify detects the push and deploys within seconds — no build step required.

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

1. **Keep it simple** - this is a minimal static site; avoid introducing unnecessary complexity
2. **Do not add build tools** unless explicitly requested
3. **Binary files** - `the-signal.pdf` is a binary PDF; do not read/edit it as text
4. **Test locally** - changes can be previewed by opening files directly in a browser or using a simple HTTP server
5. **Push to `main`** for production deployments via Netlify
