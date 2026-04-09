# The Signal - GitHub Copilot Instructions

## Project Overview

**The Signal** is a static news/systems atlas site hosted on Netlify. This is a vanilla HTML/CSS/JavaScript project with no build system or package manager. All deployments are automatic via Netlify when pushing to the `main` branch.

- **Repository**: `ksksrbiz-arch/The-signal`
- **Live Site**: https://signal01.netlify.app/
- **Hosting**: Netlify (auto-deploy from `main` branch)
- **Tech Stack**: Pure HTML/CSS/JS + Netlify Functions

## Architecture

### Site Structure

```
The-signal/
├── index.html              # Main homepage
├── about/                  # About section (separate HTML)
├── archive/                # Weekly archives (013.html, 014.html)
├── builds/                 # Verified builds showcase
├── fieldnotes/             # Article/blog posts
│   ├── ai-agents-vs-chatbots.html
│   ├── cathedral-principle.html
│   ├── cold-outreach-engine.html
│   └── ...more articles
├── news/                   # News aggregator page
├── functions/              # Netlify serverless functions
│   ├── send-email.js       # Contact form handler
│   ├── news.js             # RSS feed aggregator
│   └── _middleware.js      # Cloudflare Pages middleware
├── app.js                  # Core JavaScript (theme, nav, animations)
├── style.css               # Main stylesheet
├── base.css                # Base/reset styles
└── netlify.toml            # Netlify configuration
├── archive/
│   └── index.html          # Archive page
├── builds/
│   └── index.html          # Verified Builds page
├── fieldnotes/
│   └── index.html          # Fieldnotes+ page
└── news/
    └── index.html          # News aggregator page
```

### Key Architecture Patterns

1. **Single-Page Routing (Homepage Only)**
   - `index.html` contains multiple view sections (`#systems-view`, `#builds-view`, `#news-view`, `#docs-view`)
   - `app.js` implements "Switchboard Snap Routing" - client-side view switching without page reload
   - Buttons with `data-route` attributes trigger view changes
   - Pattern: hide/show sections with `display: none/block` and smooth scroll

2. **Mobile Navigation**
   - Overlay menu: `.mobile-nav` with `.active` class toggle
   - Scroll lock on mobile: set `body` position to `fixed` and restore scroll position on close
   - Close triggers: close button, link click, Escape key, click outside overlay
   - **Critical**: Use `.active` class, not `.open` (previous bug)

3. **Theme System**
   - Cookie-based persistence: `signal-theme=dark|light`
   - Button: `[data-theme-toggle]`
   - HTML attribute: `data-theme="dark|light"`
   - Defaults to system preference if no cookie set
   - CSS: `:root { --bg, --text, --active, ... }` with light/dark overrides

4. **Progressive Enhancement**
   - Scroll reveal animations using `IntersectionObserver`
   - Reading progress bar for article pages
   - Share system with platform-specific URL builders
   - Contact modal with form validation

### Netlify Functions

All functions are in `functions/` and deployed to `/.netlify/functions/<name>`:

- **`news.js`**: Aggregates RSS feeds from multiple sources (TechCrunch, The Verge, HackerNews, etc.) using the free RSS2JSON API
- **`send-email.js`**: Contact form handler - currently logs only, needs email service integration (SendGrid, Resend, AWS SES)
- **`_middleware.js`**: Runs on all requests - normalizes trailing slashes, blocks bots from `/api/*`, adds CORS headers

### CSS Architecture

Two-file system:

1. **`base.css`**: Modern CSS reset, typography defaults, focus states, accessibility
2. **`style.css`**: 
   - Color tokens in `:root` (ink/paper metaphor)
   - Component styles (cards, buttons, navigation, modals)
   - Responsive breakpoints (480px, 768px, 1024px)
   - Mobile touch target minimum: 44x44px
   - iOS Safari fixes: 16px font size on inputs, `100dvh`, no text scaling

### JavaScript Patterns

All code in `app.js` is vanilla JavaScript wrapped in IIFEs:

```javascript
(function(){
  // Feature implementation
  // No globals unless necessary
})();
```

Features implemented:
- Theme toggle with cookie persistence
- Mobile navigation with scroll lock
- Switchboard routing (view switching)
- Scroll reveal animations
- Reading progress bar
- Share system
- Contact form modal

## Development Workflow

### No Build Process

**Important**: There is no `npm run build`, `npm run dev`, or any build step. You edit files and push to Git. That's it.

### Local Preview

To test locally:
```bash
# Option 1: Python HTTP server
python3 -m http.server 8080

# Option 2: Node.js http-server (if installed globally)
npx http-server -p 8080

# Then open http://localhost:8080
```

### Deployment

Automatic via Netlify:
```bash
git add .
git commit -m "feat: description of change"
git push origin main
```

Netlify detects the push and deploys within 2-3 minutes. No build command needed.

**Deploy Status**: https://app.netlify.com/sites/signal01/deploys

### Branch Strategy

- `main` - production branch (auto-deploys)
- `master` - legacy branch (deprecated, use `main`)
- Feature branches: `feature/<name>` or `claude/<name>`

## Key Conventions

### 1. Mobile-First Responsive Design

Three breakpoint tiers:
```css
/* Mobile: Default (< 480px) */
/* Tablet: 480px - 768px */
/* Desktop: 768px+ */
/* Wide: 1024px+ */
```

**Touch targets**: Minimum 44x44px for all interactive elements (WCAG AAA)

**iOS Safari considerations**:
- Input font-size must be 16px minimum (prevents auto-zoom)
- Use `100dvh` not `100vh` (accounts for Safari UI chrome)
- Prevent text scaling: `-webkit-text-size-adjust: none` on landscape

### 2. CSS Class Naming

Pattern: Semantic, component-based naming (not BEM):
- `.site-header`, `.mobile-nav`, `.switchboard-button`
- State classes: `.active`, `.visible`, `.loading`
- Utility patterns avoided (no Tailwind-style classes)

### 3. Accessibility Standards

- Semantic HTML (headers, nav, article, main, footer)
- ARIA labels on icon-only buttons
- Focus-visible outline: 2px solid primary color
- Keyboard navigation support (Escape to close modals)
- `prefers-reduced-motion` respected

### 4. Color System Philosophy

"Ink on blueprint paper" aesthetic:
- Dark mode default (navy/teal)
- Light mode available (inverted)
- No bright whites or pure blacks
- Muted, operator-grade palette
- Accent: `--active` (teal #22D3C5), `--verified` (brass #C7A35A)

### 5. File Modification Safety

**Binary files**: `index.html` in `about/`, `archive/`, `builds/`, `fieldnotes/`, `news/` directories may contain binary PDFs despite `.html` extension. Always check before editing.

**Root `index.html`**: This is the actual HTML homepage - safe to edit as text.

### 6. Serverless Function Patterns

Functions use Netlify Functions API (AWS Lambda under the hood):

```javascript
exports.handler = async (event, context) => {
  // event.httpMethod, event.body, event.headers
  return {
    statusCode: 200,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ data: "response" })
  };
};
```

**Important**: Functions folder is `functions/` not `netlify/functions/` (configured in netlify.toml)

### 7. No Package Manager

There is no `package.json`, `node_modules/`, or dependency management. External libraries (if needed) are loaded via CDN in HTML.

Exception: Netlify Functions can have dependencies via `functions/package.json` if needed.

## Testing

No automated test suite exists. Testing is manual:

### Desktop Testing Checklist
- [ ] Theme toggle works (light/dark)
- [ ] All navigation links work
- [ ] Contact modal opens/closes
- [ ] Switchboard routing (if on homepage)
- [ ] Forms validate properly

### Mobile Testing Checklist (Critical)
- [ ] Hamburger menu opens/closes
- [ ] No horizontal scroll
- [ ] Touch targets are tappable (44x44px min)
- [ ] iOS Safari: no auto-zoom on input focus
- [ ] Scroll position restores after modal close
- [ ] Click outside modal closes it

### Cross-Browser Testing
- Chrome (desktop + mobile)
- Safari (desktop + iOS)
- Firefox
- Edge

### Lighthouse Audit Targets
- Performance: 90+
- Accessibility: 95+
- Best Practices: 90+
- SEO: 100

## Common Tasks

### Adding a New Page

1. Create a new directory with `index.html`:
   ```bash
   mkdir newpage
   # Create newpage/index.html
   ```

2. Add navigation link in all page headers:
   ```html
   <a href="./newpage/">New Page</a>
   ```

3. Add to mobile nav in each page:
   ```html
   <div class="mobile-nav">
     <a href="./newpage/">New Page</a>
   </div>
   ```

### Modifying Styles

1. **Base styles** (reset, typography, accessibility) → `base.css`
2. **Theme colors, component styles** → `style.css`
3. **Test on mobile** after any responsive changes

### Adding a Netlify Function

1. Create `functions/new-function.js`:
   ```javascript
   exports.handler = async (event, context) => {
     return {
       statusCode: 200,
       body: JSON.stringify({ message: "Hello" })
     };
   };
   ```

2. Access at `/.netlify/functions/new-function`

3. Test locally with Netlify CLI (optional):
   ```bash
   netlify dev
   ```

### Debugging Mobile Issues

1. Use Chrome DevTools device toolbar
2. Check console for JavaScript errors
3. Verify CSS classes match (`active` not `open`)
4. Test on real devices if possible
5. Check Netlify function logs: https://app.netlify.com/sites/signal01/functions

## Important Notes

### DO NOT Add

- ❌ Build tools (webpack, vite, parcel)
- ❌ Package managers (npm, yarn, pnpm) unless for Netlify Functions
- ❌ Frameworks (React, Vue, Svelte) - this is intentionally vanilla
- ❌ CSS preprocessors (Sass, Less) - use plain CSS
- ❌ TypeScript - use vanilla JavaScript
- ❌ Linters/formatters unless explicitly requested

**Philosophy**: This is a minimal static site. Simplicity is intentional. Don't over-engineer.

### Future Migration Consideration

The project maintainer is considering migrating to Next.js + TypeScript in the future. See `FRAMEWORK-MIGRATION-PLAN.md` for details. Until that decision is made, maintain the vanilla architecture.

### Contact & Email Setup

The contact form (`send-email.js`) is deployed but only logs submissions. To enable actual email sending:

1. Choose email service: SendGrid, Resend, or AWS SES
2. Add API key to Netlify environment variables
3. Uncomment email code in `functions/send-email.js`
4. Test thoroughly before deploying

Target email: skdev@1commerce.online

## Documentation Files

Reference these for context:

- **`CLAUDE.md`**: Original AI assistant guide (outdated structure info)
- **`PROJECT-STATUS.md`**: Current project status and migration decisions
- **`AUDIT-REPORT.md`**: Comprehensive 48-page website audit
- **`MOBILE-FIXES-COMPLETE.md`**: Mobile optimization changes
- **`FRAMEWORK-MIGRATION-PLAN.md`**: Next.js/Blazor migration analysis
- **`QUICK-REFERENCE.md`**: Quick links and testing checklists

## AI Assistant Best Practices

1. **Respect the vanilla architecture** - Don't suggest adding frameworks unless explicitly asked
2. **Test on mobile** - Mobile navigation has been buggy in the past
3. **No assumptions** - What looks like HTML might be a PDF binary
4. **Push to `main`** - This deploys to production automatically
5. **Keep it simple** - Avoid introducing complexity to a minimal site
6. **Check Netlify logs** - Function errors won't show in browser console

## Quick Commands Reference

```bash
# View git status and recent changes
git status
git log --oneline -5

# Deploy to production
git add .
git commit -m "feat: description"
git push origin main

# Check deployment status
# Visit: https://app.netlify.com/sites/signal01/deploys

# Local preview
python3 -m http.server 8080
# or
npx http-server -p 8080
```

---

**Maintained by**: Keith - 1Commerce LLC  
**Last Updated**: January 2025  
**Deploy Status**: [![Netlify Status](https://api.netlify.com/api/v1/badges/31c4764b-f9c4-4531-93ca-b367db629132/deploy-status)](https://app.netlify.com/projects/signal01/deploys)
