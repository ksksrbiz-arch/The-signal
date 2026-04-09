# 🚨 URGENT: Netlify Next.js Plugin Conflict

## ❌ The Problem

Netlify has the **Next.js plugin enabled** in your site settings, but **The Signal is NOT a Next.js site** - it's a static HTML/CSS/JS site!

The Next.js plugin is trying to build it as a Next.js app and failing.

---

## ✅ The Solution - Disable Next.js Plugin

### Option 1: Disable in Netlify UI (EASIEST - Do This)

1. **Go to Netlify Dashboard**:
   👉 https://app.netlify.com/sites/signal01/configuration/plugins

2. **Find "@netlify/plugin-nextjs"** in the Installed Plugins list

3. **Click the plugin** → Click "Remove" or "Disable"

4. **Confirm removal**

5. **Trigger a new deploy**:
   - Go to: https://app.netlify.com/sites/signal01/deploys
   - Click "Trigger deploy" → "Deploy site"

6. **Watch it succeed!** ✅

---

### Option 2: Alternative - Remove All Auto-Installed Plugins

If you see other plugins you don't need:

1. Go to: https://app.netlify.com/sites/signal01/configuration/plugins
2. Remove these if present:
   - ❌ @netlify/plugin-nextjs (definitely remove)
   - ⚠️ @netlify/plugin-lighthouse (optional, keep if you want)
   - Any other plugins you didn't intentionally add

---

## 📋 Quick Steps (Copy/Paste)

```
1. Visit: https://app.netlify.com/sites/signal01/configuration/plugins
2. Find: @netlify/plugin-nextjs
3. Click: Remove/Disable
4. Deploy: Trigger new deploy
5. Success! ✅
```

---

## 🔍 Why This Happened

Netlify **auto-detects** project types and installs plugins automatically. It likely saw:
- Some JavaScript files
- A `functions/` directory
- Thought it might be Next.js

But The Signal is just:
- ✅ Static HTML files
- ✅ CSS stylesheets  
- ✅ Vanilla JavaScript
- ✅ Netlify Functions (serverless)
- ❌ NOT Next.js
- ❌ NOT React
- ❌ NO build process needed

---

## 🎯 Correct Configuration

Your site should have:

**Build Settings** (in Netlify UI):
```
Build command:       (leave empty)
Publish directory:   .
Functions directory: functions
```

**Installed Plugins**:
```
- None required (remove @netlify/plugin-nextjs)
- Optional: @netlify/plugin-lighthouse (for performance monitoring)
```

---

## 🔧 If You Can't Access Netlify UI

If you need to fix this via `netlify.toml` only:

```toml
# netlify.toml
[build]
  publish = "."
  functions = "functions"

# Explicitly tell Netlify: NO build process
[build.processing]
  skip_processing = false
```

But **the plugin must be removed from the UI** - you can't override UI-installed plugins via netlify.toml.

---

## ✅ After Fixing

Once you remove the plugin and redeploy, you should see:

**Build Log** (successful):
```
✓ Checking functions...
✓ Functions packaged
✓ Deploy is live!
```

**What will work**:
- ✅ Site loads at https://signal01.netlify.app/
- ✅ Mobile navigation works
- ✅ Contact form modal opens
- ✅ Netlify badge appears
- ✅ Functions available at /.netlify/functions/send-email

---

## 🚨 DO NOT

- ❌ Don't set publish to `.next` (that's for Next.js)
- ❌ Don't add a build command (static site doesn't need it)
- ❌ Don't install Next.js dependencies
- ❌ Don't try to make it a Next.js site (you already have a working static site!)

---

## 📞 Summary

**Problem**: Next.js plugin enabled for non-Next.js site  
**Solution**: Remove plugin from Netlify UI  
**Time**: 2 minutes  
**Link**: https://app.netlify.com/sites/signal01/configuration/plugins

**After removing the plugin and redeploying, everything will work!** 🎉

---

## 🎯 Step-by-Step Video Guide

If you need visual help:
1. Log into Netlify: https://app.netlify.com
2. Click your site: **signal01**
3. Click **Plugins** in left sidebar
4. Find **@netlify/plugin-nextjs**
5. Click the **...** menu → **Remove**
6. Go to **Deploys**
7. Click **Trigger deploy** → **Deploy site**
8. ✅ Done!

---

Let me know once you've removed the plugin and I'll help you verify the deployment!
