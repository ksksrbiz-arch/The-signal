# The Signal - React/Next.js Migration Plan

**Status**: Planning Phase  
**Mobile Fixes**: ✅ Complete  
**Next Step**: Framework Migration

---

## Executive Summary

This document outlines the complete migration strategy from vanilla HTML/CSS/JS to a modern React framework. We'll evaluate two primary options: **Next.js** and **.NET Blazor**, with detailed pros/cons for each.

---

## Option 1: Next.js + React + TypeScript (Recommended)

### Why Next.js?

Next.js is the most popular React framework, offering the best balance of:
- ✅ Performance (SSG for static pages)
- ✅ Developer experience
- ✅ Netlify compatibility (zero config)
- ✅ Ecosystem & community
- ✅ Future flexibility

### Architecture Overview

```
Technology Stack:
├── Framework: Next.js 14+ (App Router)
├── Language: TypeScript
├── Styling: Tailwind CSS + CSS Modules (hybrid)
├── UI Components: shadcn/ui (optional)
├── State: React Context + Zustand (if complex)
├── Forms: React Hook Form
├── Animations: Framer Motion
├── Package Manager: pnpm
└── Deployment: Netlify (unchanged)
```

### Project Structure

```
the-signal/
├── app/
│   ├── layout.tsx                 # Root layout (header, footer, theme provider)
│   ├── page.tsx                   # Home page
│   ├── about/
│   │   └── page.tsx
│   ├── archive/
│   │   └── page.tsx
│   ├── builds/
│   │   └── page.tsx
│   ├── fieldnotes/
│   │   └── page.tsx
│   ├── news/
│   │   └── page.tsx
│   └── api/
│       └── news/
│           └── route.ts           # NewsAPI integration
├── components/
│   ├── layout/
│   │   ├── Header.tsx
│   │   ├── Footer.tsx
│   │   └── MobileNav.tsx
│   ├── ui/                        # Reusable UI components
│   │   ├── Button.tsx
│   │   ├── Card.tsx
│   │   ├── Input.tsx
│   │   └── Badge.tsx
│   ├── features/                  # Feature-specific components
│   │   ├── DossierCard.tsx
│   │   ├── Hero.tsx
│   │   ├── SystemStats.tsx
│   │   ├── MarginLog.tsx
│   │   ├── SubscribeForm.tsx
│   │   ├── ThemeToggle.tsx
│   │   ├── ShareButtons.tsx
│   │   └── ReadingProgress.tsx
│   └── providers/
│       └── ThemeProvider.tsx
├── lib/
│   ├── hooks/
│   │   ├── useTheme.ts
│   │   ├── useScrollReveal.ts
│   │   ├── useReadingProgress.ts
│   │   └── useMobileNav.ts
│   ├── utils/
│   │   └── cn.ts                  # Tailwind class merge utility
│   └── types/
│       └── index.ts               # TypeScript interfaces
├── styles/
│   └── globals.css                # Global styles + Tailwind
├── public/
│   └── (static assets)
├── .env.local                     # Environment variables
├── next.config.js
├── tailwind.config.ts
├── tsconfig.json
└── package.json
```

### Migration Steps (Detailed)

#### **Phase 1: Setup (Day 1 - 2-3 hours)**

1. **Initialize Next.js Project**
   ```bash
   npx create-next-app@latest the-signal-react --typescript --tailwind --app --no-src-dir
   cd the-signal-react
   pnpm install
   ```

2. **Install Dependencies**
   ```bash
   pnpm add framer-motion react-hook-form zod zustand
   pnpm add -D @types/node
   ```

3. **Configure Tailwind with Design Tokens**
   ```typescript
   // tailwind.config.ts
   import type { Config } from 'tailwindcss'

   const config: Config = {
     darkMode: ['class', '[data-theme="dark"]'],
     content: [
       './pages/**/*.{js,ts,jsx,tsx,mdx}',
       './components/**/*.{js,ts,jsx,tsx,mdx}',
       './app/**/*.{js,ts,jsx,tsx,mdx}',
     ],
     theme: {
       extend: {
         colors: {
           bg: 'rgb(7, 10, 18)',
           bg2: 'rgb(5, 7, 13)',
           panel: 'rgb(11, 15, 26)',
           panel2: 'rgb(14, 20, 36)',
           rule: 'rgb(26, 35, 56)',
           rule2: 'rgb(36, 48, 74)',
           text: 'rgb(233, 237, 246)',
           muted: 'rgb(170, 180, 199)',
           faint: 'rgb(110, 120, 145)',
           active: 'rgb(34, 211, 197)',
           verified: 'rgb(199, 163, 90)',
           danger: 'rgb(224, 101, 101)',
         },
         fontFamily: {
           display: ['Fraunces', 'serif'],
           body: ['IBM Plex Sans', 'sans-serif'],
           mono: ['JetBrains Mono', 'monospace'],
         },
         borderRadius: {
           DEFAULT: '8px',
         },
       },
     },
     plugins: [],
   }
   export default config
   ```

4. **Setup Google Fonts**
   ```typescript
   // app/layout.tsx
   import { Fraunces, IBM_Plex_Sans, JetBrains_Mono } from 'next/font/google'

   const fraunces = Fraunces({
     subsets: ['latin'],
     variable: '--font-display',
     weight: ['400', '600', '700'],
   })

   const ibmPlexSans = IBM_Plex_Sans({
     subsets: ['latin'],
     variable: '--font-body',
     weight: ['400', '500', '600'],
   })

   const jetBrainsMono = JetBrains_Mono({
     subsets: ['latin'],
     variable: '--font-mono',
     weight: ['400', '600'],
   })
   ```

5. **Create Global Styles**
   ```css
   /* styles/globals.css */
   @tailwind base;
   @tailwind components;
   @tailwind utilities;

   @layer base {
     * {
       @apply box-border;
       -webkit-tap-highlight-color: theme('colors.active/15');
     }

     html {
       @apply scroll-smooth;
       -webkit-text-size-adjust: 100%;
     }

     body {
       @apply bg-bg text-text font-body text-[15px] leading-[1.45] overflow-x-hidden;
       -webkit-font-smoothing: antialiased;
       -moz-osx-font-smoothing: grayscale;
     }

     /* Blueprint grid background */
     body::before {
       content: '';
       @apply fixed inset-0 pointer-events-none z-0 opacity-[0.06];
       background-image: 
         repeating-linear-gradient(0deg, transparent, transparent 23px, theme('colors.rule') 23px, theme('colors.rule') 24px),
         repeating-linear-gradient(90deg, transparent, transparent 23px, theme('colors.rule') 23px, theme('colors.rule') 24px),
         radial-gradient(circle, theme('colors.active/2') 1px, transparent 1px);
       background-size: 24px 24px, 24px 24px, 50px 50px;
     }
   }

   @layer components {
     .section-label {
       @apply font-body text-xs font-semibold tracking-[0.15em] uppercase text-faint mb-2;
     }

     .dossier-card {
       @apply bg-panel border border-rule rounded-lg overflow-hidden transition-all duration-200;
       @apply hover:bg-panel2 hover:border-active hover:-translate-y-0.5;
       @apply active:bg-panel2 active:border-active;
     }
   }
   ```

---

#### **Phase 2: Core Components (Day 2 - 4-5 hours)**

1. **Create Root Layout**
   ```typescript
   // app/layout.tsx
   import type { Metadata } from 'next'
   import { Fraunces, IBM_Plex_Sans, JetBrains_Mono } from 'next/font/google'
   import './globals.css'
   import { ThemeProvider } from '@/components/providers/ThemeProvider'
   import { Header } from '@/components/layout/Header'
   import { Footer } from '@/components/layout/Footer'

   export const metadata: Metadata = {
     title: 'THE SIGNAL — Systems Atlas. Proof-First. No Placeholders.',
     description: 'Systems atlas from 1Commerce LLC. Proof-first infrastructure, financial intelligence for gig workers, and the Cathedral Framework.',
   }

   export default function RootLayout({
     children,
   }: {
     children: React.ReactNode
   }) {
     return (
       <html lang="en" suppressHydrationWarning>
         <body className={`${fraunces.variable} ${ibmPlexSans.variable} ${jetBrainsMono.variable}`}>
           <ThemeProvider>
             <Header />
             <main className="max-w-[1200px] mx-auto px-4 py-12 md:px-6 md:py-16">
               {children}
             </main>
             <Footer />
           </ThemeProvider>
         </body>
       </html>
     )
   }
   ```

2. **Create Header Component**
   ```typescript
   // components/layout/Header.tsx
   'use client'

   import { useState } from 'react'
   import Link from 'next/link'
   import { ThemeToggle } from '@/components/features/ThemeToggle'
   import { MobileNav } from './MobileNav'
   import { LogoIcon } from '@/components/ui/LogoIcon'

   export function Header() {
     const [mobileNavOpen, setMobileNavOpen] = useState(false)

     return (
       <>
         <header className="sticky top-0 z-50 bg-panel border-b border-rule px-4 py-4 md:px-6">
           <div className="max-w-[1200px] mx-auto flex items-center justify-between">
             <Link href="/" className="flex items-center gap-3 text-text hover:text-active transition-colors">
               <LogoIcon className="w-7 h-7 text-verified" />
               <span className="font-mono text-xs font-semibold tracking-[0.15em] uppercase">
                 THE SIGNAL
               </span>
             </Link>

             <div className="flex items-center gap-6">
               {/* Desktop Nav */}
               <nav className="hidden md:block">
                 <ul className="flex gap-6">
                   <li><Link href="/" className="nav-link">Home</Link></li>
                   <li><Link href="/archive" className="nav-link">Archive</Link></li>
                   <li><Link href="/fieldnotes" className="nav-link">Fieldnotes+</Link></li>
                   <li><Link href="/builds" className="nav-link">Verified Builds</Link></li>
                   <li><Link href="/news" className="nav-link">News Aggregator</Link></li>
                   <li><Link href="/about" className="nav-link">About</Link></li>
                 </ul>
               </nav>

               {/* Mobile Toggle */}
               <button
                 onClick={() => setMobileNavOpen(true)}
                 className="md:hidden min-w-[44px] min-h-[44px] flex items-center justify-center text-text"
                 aria-label="Open menu"
               >
                 <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                   <path d="M3 12h18M3 6h18M3 18h18"/>
                 </svg>
               </button>

               <ThemeToggle />
             </div>
           </div>
         </header>

         <MobileNav isOpen={mobileNavOpen} onClose={() => setMobileNavOpen(false)} />
       </>
     )
   }
   ```

3. **Create Mobile Navigation**
   ```typescript
   // components/layout/MobileNav.tsx
   'use client'

   import { useEffect } from 'react'
   import Link from 'next/link'
   import { usePathname } from 'next/navigation'

   interface MobileNavProps {
     isOpen: boolean
     onClose: () => void
   }

   export function MobileNav({ isOpen, onClose }: MobileNavProps) {
     const pathname = usePathname()

     useEffect(() => {
       if (isOpen) {
         const scrollY = window.scrollY
         document.body.style.position = 'fixed'
         document.body.style.top = `-${scrollY}px`
         document.body.style.width = '100%'
         document.body.style.overflow = 'hidden'

         return () => {
           document.body.style.position = ''
           document.body.style.top = ''
           document.body.style.width = ''
           document.body.style.overflow = ''
           window.scrollTo(0, scrollY)
         }
       }
     }, [isOpen])

     useEffect(() => {
       const handleEscape = (e: KeyboardEvent) => {
         if (e.key === 'Escape' && isOpen) onClose()
       }
       document.addEventListener('keydown', handleEscape)
       return () => document.removeEventListener('keydown', handleEscape)
     }, [isOpen, onClose])

     if (!isOpen) return null

     const links = [
       { href: '/', label: 'Home' },
       { href: '/archive', label: 'Archive' },
       { href: '/fieldnotes', label: 'Fieldnotes+' },
       { href: '/builds', label: 'Verified Builds' },
       { href: '/news', label: 'News Aggregator' },
       { href: '/about', label: 'About' },
     ]

     return (
       <div
         className="fixed inset-0 z-[200] bg-panel flex flex-col p-4 gap-4 overflow-y-auto"
         style={{ height: '100dvh' }}
         onClick={(e) => e.target === e.currentTarget && onClose()}
       >
         <button
           onClick={onClose}
           className="self-end min-w-[44px] min-h-[44px] flex items-center justify-center text-text"
           aria-label="Close menu"
         >
           <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
             <path d="M18 6L6 18M6 6l12 12"/>
           </svg>
         </button>

         {links.map((link) => (
           <Link
             key={link.href}
             href={link.href}
             onClick={onClose}
             className={`
               flex items-center min-h-[44px] py-4 border-b border-rule text-base
               ${pathname === link.href ? 'text-active' : 'text-muted'}
               hover:text-active transition-colors
             `}
           >
             {link.label}
           </Link>
         ))}
       </div>
     )
   }
   ```

4. **Create Theme Provider**
   ```typescript
   // components/providers/ThemeProvider.tsx
   'use client'

   import { createContext, useContext, useEffect, useState } from 'react'

   type Theme = 'light' | 'dark'

   interface ThemeContextValue {
     theme: Theme
     setTheme: (theme: Theme) => void
     toggleTheme: () => void
   }

   const ThemeContext = createContext<ThemeContextValue | undefined>(undefined)

   export function ThemeProvider({ children }: { children: React.ReactNode }) {
     const [theme, setThemeState] = useState<Theme>('dark')

     useEffect(() => {
       // Load theme from cookie
       const stored = document.cookie
         .split('; ')
         .find(row => row.startsWith('signal-theme='))
         ?.split('=')[1] as Theme | undefined

       const initialTheme = stored || 
         (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light')

       setThemeState(initialTheme)
       document.documentElement.setAttribute('data-theme', initialTheme)
     }, [])

     const setTheme = (newTheme: Theme) => {
       setThemeState(newTheme)
       document.documentElement.setAttribute('data-theme', newTheme)
       document.cookie = `signal-theme=${newTheme};path=/;max-age=31536000`
     }

     const toggleTheme = () => {
       setTheme(theme === 'dark' ? 'light' : 'dark')
     }

     return (
       <ThemeContext.Provider value={{ theme, setTheme, toggleTheme }}>
         {children}
       </ThemeContext.Provider>
     )
   }

   export function useTheme() {
     const context = useContext(ThemeContext)
     if (!context) throw new Error('useTheme must be used within ThemeProvider')
     return context
   }
   ```

5. **Create Theme Toggle**
   ```typescript
   // components/features/ThemeToggle.tsx
   'use client'

   import { useTheme } from '@/components/providers/ThemeProvider'

   export function ThemeToggle() {
     const { theme, toggleTheme } = useTheme()

     return (
       <button
         onClick={toggleTheme}
         className="min-w-[44px] min-h-[44px] flex items-center justify-center text-muted hover:text-text transition-colors"
         aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
       >
         {theme === 'dark' ? (
           <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
             <circle cx="12" cy="12" r="5"/>
             <path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"/>
           </svg>
         ) : (
           <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
             <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>
           </svg>
         )}
       </button>
     )
   }
   ```

---

#### **Phase 3: Feature Components (Day 3 - 4-5 hours)**

1. **DossierCard Component**
   ```typescript
   // components/features/DossierCard.tsx
   import Link from 'next/link'

   interface DossierCardProps {
     number: string
     title: string
     status: 'Live' | 'Development' | 'Planning'
     purpose: string
     proof: string
     footer: string
     href: string
   }

   export function DossierCard({
     number,
     title,
     status,
     purpose,
     proof,
     footer,
     href,
   }: DossierCardProps) {
     return (
       <Link
         href={href}
         target="_blank"
         rel="noopener noreferrer"
         className="dossier-card group"
       >
         <div className="p-6 border-b border-rule flex items-start justify-between">
           <div>
             <div className="font-mono text-xs font-semibold tracking-[0.15em] uppercase text-faint">
               {number}
             </div>
             <h3 className="font-display text-xl font-semibold text-text mt-1">
               {title}
             </h3>
           </div>
           <span
             className={`
               px-3 py-1 text-[11px] font-semibold tracking-[0.1em] uppercase rounded
               border transition-colors
               ${status === 'Live'
                 ? 'bg-active text-bg border-active'
                 : 'bg-transparent text-verified border-rule2'
               }
             `}
           >
             {status}
           </span>
         </div>

         <div className="p-6 grid gap-4">
           <div>
             <div className="text-xs font-semibold uppercase tracking-wide text-faint mb-1">
               Purpose
             </div>
             <div className="text-muted text-sm leading-relaxed">
               {purpose}
             </div>
           </div>
           <div>
             <div className="text-xs font-semibold uppercase tracking-wide text-faint mb-1">
               Proof
             </div>
             <div className="text-muted text-sm leading-relaxed">
               {proof}
             </div>
           </div>
         </div>

         <div className="p-6 border-t border-rule font-mono text-xs text-faint italic">
           {footer}
         </div>
       </Link>
     )
   }
   ```

2. **Hero Component**
   ```typescript
   // components/features/Hero.tsx
   import { SystemStats } from './SystemStats'

   export function Hero() {
     return (
       <section className="grid md:grid-cols-2 gap-6 mb-12 pb-8 border-b border-rule">
         <div>
           <h1 className="font-display text-4xl md:text-5xl font-bold leading-tight mb-4">
             Systems Atlas
           </h1>
           <p className="text-muted max-w-[60ch]">
             Proof-first. No placeholders. The infrastructure behind 1Commerce LLC, built with operator precision.
           </p>
         </div>
         <SystemStats />
       </section>
     )
   }
   ```

3. **SubscribeForm Component**
   ```typescript
   // components/features/SubscribeForm.tsx
   'use client'

   import { useState } from 'react'

   export function SubscribeForm() {
     const [email, setEmail] = useState('')

     return (
       <form
         action="https://assets.mailerlite.com/jsonp/887036/forms/131950373498498498/subscribe"
         method="POST"
         className="flex flex-col md:flex-row gap-3"
       >
         <input
           type="email"
           name="fields[email]"
           placeholder="your@email.com"
           required
           aria-label="Email address"
           value={email}
           onChange={(e) => setEmail(e.target.value)}
           className="flex-1 px-4 py-3 bg-panel border border-rule rounded text-text font-body text-base focus:outline-none focus:border-active transition-colors"
         />
         <button
           type="submit"
           className="px-6 py-3 bg-active text-bg font-semibold rounded hover:bg-[#1fb8af] transition-colors whitespace-nowrap md:w-auto w-full"
         >
           Subscribe
         </button>
       </form>
     )
   }
   ```

---

#### **Phase 4: Pages (Day 4 - 3-4 hours)**

1. **Home Page**
   ```typescript
   // app/page.tsx
   import { Hero } from '@/components/features/Hero'
   import { DossierCard } from '@/components/features/DossierCard'
   import { MarginLog } from '@/components/features/MarginLog'
   import { SubscribeSection } from '@/components/features/SubscribeSection'

   const coreSystems = [
     {
       number: 'Signal',
       title: 'The Signal',
       status: 'Live' as const,
       purpose: 'Weekly transmission platform. Ambient credibility engine and newsletter dispatch system.',
       proof: 'HTML/CSS, JavaScript, Netlify. 257 lines of semantic markup.',
       footer: 'Last shipped: April 2026',
       href: 'https://signal01.netlify.app/',
     },
     // ... more systems
   ]

   export default function HomePage() {
     return (
       <>
         <Hero />

         <section className="mb-12">
           <div className="section-label">01 / Core Systems</div>
           <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
             {coreSystems.map((system) => (
               <DossierCard key={system.title} {...system} />
             ))}
           </div>
         </section>

         <MarginLog />
         <SubscribeSection />
       </>
     )
   }
   ```

---

#### **Phase 5: Testing & Deployment (Day 5 - 2-3 hours)**

1. **Test Locally**
   ```bash
   pnpm dev
   # Visit http://localhost:3000
   # Test all pages and features
   ```

2. **Build for Production**
   ```bash
   pnpm build
   pnpm start
   # Test production build locally
   ```

3. **Configure Netlify**
   ```toml
   # netlify.toml
   [build]
     command = "pnpm build"
     publish = ".next"

   [[plugins]]
     package = "@netlify/plugin-nextjs"
   ```

4. **Deploy**
   ```bash
   git add .
   git commit -m "feat: migrate to Next.js"
   git push origin main
   ```

---

### Pros of Next.js Approach

✅ **Developer Experience**
- Hot reload, TypeScript support, great tooling
- Huge community, tons of examples/tutorials
- Easy to hire developers familiar with React/Next.js

✅ **Performance**
- SSG for static pages (current use case)
- Automatic code splitting
- Image optimization built-in
- Fast page transitions

✅ **Scalability**
- Can add SSR/ISR later if needed
- Easy to add API routes
- Database integration straightforward

✅ **Deployment**
- Zero-config Netlify support
- Works with current Netlify Functions
- Preview deployments automatic

✅ **Ecosystem**
- Massive npm ecosystem
- UI libraries (shadcn, Radix, Headless UI)
- Form libraries (React Hook Form)
- Animation libraries (Framer Motion)

### Cons of Next.js Approach

❌ **Bundle Size**
- React is ~70KB gzipped (vs 0KB for vanilla)
- Full page hydration (can optimize with React Server Components)

❌ **Complexity**
- Build process required
- More moving parts
- Steeper learning curve for non-React devs

❌ **JavaScript Required**
- Site won't work without JS (unlike current vanilla version)

---

## Option 2: .NET Blazor (Alternative)

### Why Blazor?

If you prefer the .NET ecosystem, Blazor is a solid choice:
- ✅ C# throughout (no JavaScript)
- ✅ Strong typing with C#
- ✅ Great for .NET developers
- ✅ Server or WebAssembly modes

### Architecture Overview

```
Technology Stack:
├── Framework: Blazor WebAssembly or Server
├── Language: C#
├── Styling: Tailwind CSS via CDN or MudBlazor
├── State: Blazor State Management
├── Deployment: Azure Static Web Apps or Netlify (with adapter)
```

### Project Structure

```
TheSignal/
├── Pages/
│   ├── Index.razor            # Home page
│   ├── About.razor
│   ├── Archive.razor
│   └── ...
├── Shared/
│   ├── MainLayout.razor       # Layout with header/footer
│   ├── Header.razor
│   ├── Footer.razor
│   └── MobileNav.razor
├── Components/
│   ├── DossierCard.razor
│   ├── Hero.razor
│   ├── SystemStats.razor
│   └── ...
├── Services/
│   └── NewsApiService.cs
├── wwwroot/
│   ├── css/
│   │   └── app.css
│   └── index.html
├── Program.cs
└── TheSignal.csproj
```

### Example Component

```csharp
// Components/DossierCard.razor
<a href="@Href" target="_blank" class="dossier-card">
    <div class="dossier-header">
        <div>
            <div class="dossier-number">@Number</div>
            <h3 class="dossier-title">@Title</h3>
        </div>
        <span class="status-chip @(Status == "Live" ? "active" : "")">
            @Status
        </span>
    </div>

    <div class="dossier-body">
        <div class="dossier-section">
            <div class="dossier-section-label">Purpose</div>
            <div class="dossier-section-content">@Purpose</div>
        </div>
        <div class="dossier-section">
            <div class="dossier-section-label">Proof</div>
            <div class="dossier-section-content">@Proof</div>
        </div>
    </div>

    <div class="dossier-footer">@Footer</div>
</a>

@code {
    [Parameter] public string Number { get; set; } = "";
    [Parameter] public string Title { get; set; } = "";
    [Parameter] public string Status { get; set; } = "";
    [Parameter] public string Purpose { get; set; } = "";
    [Parameter] public string Proof { get; set; } = "";
    [Parameter] public string Footer { get; set; } = "";
    [Parameter] public string Href { get; set; } = "";
}
```

### Pros of Blazor Approach

✅ **C# Throughout**
- No JavaScript (unless you want it)
- Strong typing end-to-end
- Great for .NET developers

✅ **Component Model**
- Similar to React, but with C#
- Razor syntax familiar to MVC developers

✅ **Integration**
- Easy to integrate with .NET backend
- Entity Framework, SignalR, etc.

### Cons of Blazor Approach

❌ **Deployment Complexity**
- Netlify doesn't natively support Blazor
- Need Azure Static Web Apps or custom adapter
- Larger download size (WebAssembly runtime)

❌ **Ecosystem**
- Smaller ecosystem vs React
- Fewer UI component libraries
- Less community content/examples

❌ **Performance**
- WebAssembly download size larger
- Slower initial load vs Next.js SSG
- Server mode requires always-on server

❌ **Learning Curve**
- If team doesn't know C#, steeper learning curve
- Less documentation for static site use cases

---

## Recommendation: Next.js

**Go with Next.js** unless you have strong .NET requirements or team expertise.

### Why?
1. **Better for static sites** - Your site is content-focused, Next.js SSG is perfect
2. **Netlify native support** - Zero config, works out of the box
3. **Easier hiring** - More React devs than Blazor devs
4. **Larger ecosystem** - More libraries, components, examples
5. **Better performance** - SSG + code splitting = fast load times
6. **Mobile-first** - React ecosystem has better mobile tooling

---

## Timeline

### Next.js Migration
- **Fast Track (Full-Time)**: 5-7 days
- **Part-Time**: 2-3 weeks
- **Conservative**: 3-4 weeks (with testing)

### Blazor Migration
- **Fast Track (Full-Time)**: 7-10 days
- **Part-Time**: 3-4 weeks
- **Conservative**: 4-6 weeks (with deployment setup)

---

## Cost Analysis

### Next.js
```
Developer time: 5-7 days @ $100-150/hr = $4,000-8,400
Hosting: Netlify (free tier likely sufficient)
Domain: Current domain (no change)
Total: $4,000-8,400 one-time
```

### Blazor
```
Developer time: 7-10 days @ $100-150/hr = $5,600-12,000
Hosting: Azure Static Web Apps ($9-50/month)
Domain: Current domain (no change)
Total: $5,600-12,000 one-time + $100-600/year
```

---

## Next Steps - Decision Time

### To proceed with Next.js:
1. ✅ Confirm migration approach
2. Create new branch: `feature/nextjs-migration`
3. Initialize Next.js project
4. Start Phase 1: Setup

### To proceed with Blazor:
1. ✅ Confirm migration approach
2. Create new branch: `feature/blazor-migration`
3. Initialize Blazor project
4. Start Phase 1: Setup

### To stay with vanilla:
- Your mobile fixes are complete
- Site works perfectly now
- Can always migrate later

---

**What would you like to do?**
