# CLAUDE.md - AI Assistant Guide for The-signal

## Project Overview

**The-signal** is a static site hosted on Netlify. It serves a single PDF document (`index.html`) that is auto-deployed from the git repository.

- **Repository**: `ksksrbiz-arch/The-signal`
- **Hosting**: Netlify (auto-deploys on push)
- **Primary branch**: `main`

## Repository Structure

```
The-signal/
├── index.html    # PDF document served as the site's main content
├── CLAUDE.md     # This file - AI assistant guidance
└── .git/         # Git metadata
```

### Key Files

| File | Description |
|------|-------------|
| `index.html` | A PDF file (despite the `.html` extension). This is the sole content of the site. |

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

- **`index.html` is a PDF**: Despite the filename, this is a binary PDF file, not an HTML document. Do not attempt to edit it as text.
- **No CI/CD pipeline**: There are no GitHub Actions, test suites, or linting configurations.
- **No environment variables or secrets**: The project has no `.env` files or configuration requirements.
- **Minimal repository**: This is an extremely simple, single-file project. Do not over-engineer changes.

## Common Tasks

### Adding new pages or content
Place static files in the repository root. Netlify will serve them directly.

### Modifying the PDF
Replace `index.html` with an updated PDF file. The file must remain named `index.html` for the site to work correctly.

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
3. **Binary files** - be aware that `index.html` is a binary PDF; do not read/edit it as text
4. **Test locally** - changes can be previewed by opening files directly in a browser or using a simple HTTP server
5. **Push to `main`** for production deployments via Netlify
