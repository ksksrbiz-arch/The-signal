# 🔍 COMPREHENSIVE SITE AUDIT & TODO

**Date**: January 2025  
**Status**: Multiple issues found - Action required

---

## 🚨 CRITICAL ISSUES

### 1. **Cloudflare Functions in Netlify Project**
**Problem**: `functions/_middleware.js` is Cloudflare Pages code, not Netlify  
**Impact**: ❌ Functions may fail or not run  
**Priority**: 🔴 HIGH

**Fix Required**:
- [ ] Remove `functions/_middleware.js` (Cloudflare-specific)
- [ ] Verify `functions/news.js` works on Netlify
- [ ] Verify `functions/send-email.js` works on Netlify
- [ ] Test function endpoints

---

### 2. **Mobile Readability Issues**
**Problem**: Text too small, contrast issues, cramped layouts  
**Impact**: ❌ Poor mobile UX, hard to read  
**Priority**: 🔴 HIGH

**Specific Issues**:
- [ ] Body text: 15px (too small for mobile - should be 16-18px)
- [ ] Secondary text: 12px (way too small)
- [ ] Button text: 11-14px (accessibility issue)
- [ ] Line height needs improvement
- [ ] Contrast ratios not checked

---

### 3. **Inconsistent Typography**
**Problem**: Mix of px, rem, clamp values across site  
**Impact**: ⚠️ Inconsistent experience  
**Priority**: 🟡 MEDIUM

**Fix Required**:
- [ ] Standardize on rem units for scalability
- [ ] Create consistent type scale
- [ ] Remove px-based font sizes
- [ ] Add proper fluid typography

---

## 📊 FULL SITE AUDIT

### A. PAGES AUDIT

#### ✅ Homepage (`index.html`)
- ✅ Has new footer
- ✅ Contact modal works
- ✅ Mobile nav works
- ⚠️ Text readability needs improvement
- ⚠️ Some sections cramped on mobile

#### ✅ About (`about/index.html`)
- ✅ Has new footer
- ✅ Contact modal works
- ✅ Mobile responsive
- ⚠️ Text readability needs improvement

#### ✅ Archive (`archive/index.html`)
- ✅ Has new footer
- ✅ Contact modal works
- ⚠️ Mobile layout needs testing
- ⚠️ Card sizes may be cramped

#### ✅ Builds (`builds/index.html`)
- ✅ Has new footer
- ✅ Contact modal works
- ⚠️ Embedded iframes may not work on mobile
- ⚠️ Preview cards need mobile optimization

#### ⚠️ Fieldnotes (`fieldnotes/index.html`)
- ✅ Has new footer
- ✅ Mobile responsive added
- ❌ Still hard to read (text too small)
- ❌ Document cards cramped
- ❌ Filter buttons too small
- ❌ Tags barely visible (9-11px)

#### ✅ News (`news/index.html`)
- ✅ Has new footer
- ✅ Contact modal works
- ⚠️ News grid needs mobile testing
- ⚠️ Article cards may overflow

---

### B. FUNCTIONS AUDIT

#### ❌ `functions/_middleware.js`
**Status**: 🔴 CRITICAL - Cloudflare code  
**Issues**:
- Cloudflare Pages syntax (`export async function onRequest`)
- Won't work on Netlify
- Blocking API requests unnecessarily
- CORS handling incorrect for Netlify

**Action**: DELETE THIS FILE

---

#### ⚠️ `functions/news.js`
**Status**: 🟡 NEEDS TESTING  
**Issues**:
- Uses `fetch` (check Netlify Node version)
- No error handling for failed RSS feeds
- Should use `node-fetch` or native fetch

**Fix Required**:
```javascript
// Add at top if Node < 18
// const fetch = require('node-fetch');

// Better error handling needed
```

---

#### ⚠️ `functions/send-email.js`
**Status**: 🟡 INCOMPLETE  
**Issues**:
- Logs only, doesn't send email
- No email service integrated
- No rate limiting
- No spam protection

**To Complete**:
- [ ] Choose email service (Resend/SendGrid)
- [ ] Add API key to Netlify env vars
- [ ] Implement actual email sending
- [ ] Add rate limiting
- [ ] Add honeypot for spam

---

### C. CSS AUDIT

#### ❌ Typography Scale - FAILING
**Current Issues**:
```css
Body: 15px           ❌ Too small (should be 16-18px)
Headings: 48/32/20px ❌ Not scalable
Small: 12px          ❌ Way too small
Tiny: 11px           ❌ Illegible on mobile
Tags: 9-11px         ❌ WCAG fail
```

**Recommended Scale**:
```css
--text-xs: 0.75rem    /* 12px */
--text-sm: 0.875rem   /* 14px */
--text-base: 1rem     /* 16px */
--text-lg: 1.125rem   /* 18px */
--text-xl: 1.25rem    /* 20px */
--text-2xl: 1.5rem    /* 24px */
--text-3xl: 1.875rem  /* 30px */
--text-4xl: 2.25rem   /* 36px */
--text-5xl: 3rem      /* 48px */
```

---

#### ⚠️ Color Contrast - NOT CHECKED
**Issues**:
- No contrast ratio verification
- May fail WCAG AA (4.5:1 for normal text)
- Muted colors may be too light

**Action Required**:
- [ ] Check all text/background combinations
- [ ] Ensure 4.5:1 ratio for body text
- [ ] Ensure 3:1 ratio for large text
- [ ] Test in DevTools accessibility panel

---

#### ⚠️ Mobile-Specific Issues
**Problems Found**:
- Touch targets sometimes < 44px
- Horizontal scrolling on some pages
- Cards too cramped
- Poor use of viewport space
- Text wrapping issues

---

### D. JAVASCRIPT AUDIT

#### ✅ `app.js` - WORKING
- ✅ Theme toggle works
- ✅ Mobile nav works
- ✅ Contact form modal works
- ✅ Scroll reveal works

#### ⚠️ News Page JS
**Issues**:
- Hardcoded API endpoint
- No loading states
- No error UI
- No retry mechanism

---

### E. NETLIFY CONFIGURATION

#### ✅ `netlify.toml` - GOOD
```toml
[build]
  publish = "."
  functions = "functions"  ✅

[[headers]]
  Security headers configured ✅
```

#### ❌ Edge Functions - REMOVED
- Previously failed
- Removed successfully
- Not needed for static site

---

## 📋 COMPREHENSIVE TODO LIST

### 🔴 CRITICAL (Do First)

#### 1. Fix Functions
- [ ] **DELETE** `functions/_middleware.js` (Cloudflare code)
- [ ] Test `functions/news.js` endpoint
- [ ] Test `functions/send-email.js` endpoint
- [ ] Add proper error handling to both
- [ ] Verify they work on Netlify

#### 2. Fix Mobile Readability
- [ ] Increase base font size to 16px minimum
- [ ] Increase body text to 16-18px on mobile
- [ ] Increase all text to meet WCAG minimums
- [ ] Fix fieldnotes tags (currently 9-11px)
- [ ] Improve line-height for readability
- [ ] Add more breathing room/padding

#### 3. Fix Typography System
- [ ] Convert all px to rem
- [ ] Create consistent type scale
- [ ] Add CSS custom properties for sizes
- [ ] Apply across all pages
- [ ] Test on all breakpoints

---

### 🟡 HIGH PRIORITY (This Week)

#### 4. Mobile UX Improvements
- [ ] Audit all pages on real mobile devices
- [ ] Fix horizontal scroll issues
- [ ] Ensure all touch targets ≥ 44px
- [ ] Add more padding on mobile
- [ ] Test form inputs (no zoom on focus)
- [ ] Improve card layouts

#### 5. Contrast & Accessibility
- [ ] Run contrast checker on all text
- [ ] Fix any WCAG AA failures
- [ ] Test with screen reader
- [ ] Add skip-to-content links
- [ ] Improve focus indicators
- [ ] Add aria-labels where missing

#### 6. News Page Fixes
- [ ] Test news aggregator function
- [ ] Add loading spinner
- [ ] Add error states
- [ ] Improve card layout on mobile
- [ ] Add retry button on error
- [ ] Cache handling

---

### 🟢 MEDIUM PRIORITY (Next Week)

#### 7. Complete Contact Form
- [ ] Choose email service (Resend recommended)
- [ ] Add API key to Netlify
- [ ] Implement actual email sending
- [ ] Add rate limiting (max 5/hour per IP)
- [ ] Add honeypot spam protection
- [ ] Add email confirmation
- [ ] Test thoroughly

#### 8. Fieldnotes Page Polish
- [ ] Increase all font sizes
- [ ] Better mobile card layout
- [ ] Improve filter button sizes
- [ ] Better document preview
- [ ] Add search functionality
- [ ] Improve loading states

#### 9. Builds Page Mobile
- [ ] Fix iframe responsiveness
- [ ] Add mobile-friendly previews
- [ ] Better card layouts
- [ ] Test all links
- [ ] Improve descriptions

---

### 🔵 LOW PRIORITY (Future)

#### 10. Performance Optimization
- [ ] Add lazy loading for images
- [ ] Optimize CSS (remove unused)
- [ ] Minify JavaScript
- [ ] Add service worker
- [ ] Implement caching strategies
- [ ] Run Lighthouse audit

#### 11. Enhanced Features
- [ ] Add search across all content
- [ ] Add filtering by tags
- [ ] Add sorting options
- [ ] Add pagination
- [ ] Add related content
- [ ] Add bookmarking

#### 12. Analytics & Monitoring
- [ ] Add Netlify Analytics
- [ ] Add error tracking
- [ ] Monitor function usage
- [ ] Track form submissions
- [ ] Monitor performance metrics

---

## 🎯 QUICK WINS (1-2 hours)

### Immediate Fixes You Can Deploy Now:

1. **Delete Cloudflare Middleware**
```bash
rm functions/_middleware.js
git add functions/_middleware.js
git commit -m "fix: remove Cloudflare middleware"
git push
```

2. **Increase Base Font Size**
```css
/* In style.css, change: */
body {
  font-size: 16px;  /* was 15px */
}
```

3. **Fix Fieldnotes Text Sizes**
```css
/* In fieldnotes/index.html <style> */
.fnplus-doc-tag {
  font-size: 11px;  /* was 9px */
}
.fnplus-filter-btn {
  font-size: 12px;  /* was 10px */
}
```

4. **Add Better Mobile Padding**
```css
@media (max-width: 768px) {
  body {
    font-size: 17px;  /* iOS comfort size */
  }
  main {
    padding: 24px 20px;  /* more breathing room */
  }
}
```

---

## 📊 TESTING CHECKLIST

### Before Marking Complete:

#### Desktop Testing
- [ ] Chrome (latest)
- [ ] Firefox (latest)
- [ ] Safari (latest)
- [ ] Edge (latest)

#### Mobile Testing (Real Devices)
- [ ] iPhone (Safari) - various sizes
- [ ] Android (Chrome) - various sizes
- [ ] iPad (Safari)
- [ ] Android Tablet (Chrome)

#### Accessibility Testing
- [ ] Keyboard navigation works
- [ ] Screen reader compatible
- [ ] Color contrast passes
- [ ] Touch targets adequate
- [ ] Forms accessible
- [ ] Focus indicators visible

#### Function Testing
- [ ] News aggregator loads
- [ ] Contact form submits
- [ ] No console errors
- [ ] API responses correct
- [ ] Error handling works

---

## 🎯 RECOMMENDED APPROACH

### Week 1: Critical Fixes
**Days 1-2**: Functions
- Remove middleware
- Fix news.js
- Test endpoints

**Days 3-5**: Typography & Readability
- Increase font sizes
- Fix contrast issues
- Test on mobile

**Day 6-7**: Mobile UX
- Fix cramped layouts
- Test all pages
- Deploy fixes

### Week 2: High Priority
**Days 1-3**: Accessibility
- Contrast fixes
- Touch targets
- Screen reader testing

**Days 4-5**: News Page
- Loading states
- Error handling
- Mobile optimization

**Days 6-7**: Testing & Polish
- Test everything
- Fix bugs
- Deploy

### Week 3: Medium Priority
**Complete contact form**
**Polish fieldnotes**
**Final testing**

---

## 📝 NOTES

### Current State:
✅ All pages have updated footer  
✅ Contact modal everywhere  
✅ Free news aggregator  
✅ Mobile navigation works  
⚠️ Functions need testing/fixing  
❌ Mobile readability poor  
❌ Typography inconsistent  

### After Fixes:
✅ Working functions  
✅ Readable on all devices  
✅ Consistent typography  
✅ WCAG AA compliant  
✅ Professional UX  
✅ Production-ready  

---

## 🚀 LET'S START

**What should we fix first?**

A) Remove Cloudflare middleware + fix functions (30 min)
B) Fix typography & readability (1-2 hours)
C) Fix fieldnotes mobile (1 hour)
D) Do all critical fixes in sequence (3-4 hours)

**Your call! What's the priority?** 🎯
