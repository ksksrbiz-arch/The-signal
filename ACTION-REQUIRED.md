# 🎯 Action Required - Remove Next.js Plugin from Netlify

## ⚡ QUICK FIX (2 minutes)

### 1. Go Here:
👉 **https://app.netlify.com/sites/signal01/configuration/plugins**

### 2. Remove This Plugin:
❌ **@netlify/plugin-nextjs**

### 3. Redeploy:
👉 **https://app.netlify.com/sites/signal01/deploys**  
Click: **Trigger deploy** → **Deploy site**

### 4. Done! ✅

---

## 📸 Visual Guide

```
Netlify Dashboard
└── Your Site (signal01)
    └── Plugins (left sidebar)
        └── Installed Plugins
            └── @netlify/plugin-nextjs
                └── [Remove Button] ← Click this
```

---

## ❓ Why?

**Your site is**:
- ✅ Static HTML/CSS/JS
- ✅ Netlify Functions
- ✅ No build process needed

**NOT**:
- ❌ Next.js
- ❌ React
- ❌ Any framework that needs building

Netlify auto-installed the Next.js plugin by mistake. Just remove it!

---

## ✅ After Removal

Your deployment will succeed and you'll have:
- ✅ Working site at https://signal01.netlify.app/
- ✅ Contact form functional
- ✅ Netlify badge visible
- ✅ All mobile fixes active

---

**Remove the plugin now and redeploy!** 🚀

Full documentation: `NETLIFY-PLUGIN-FIX.md`
