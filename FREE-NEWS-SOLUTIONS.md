# 🆓 Free News Aggregator Solutions

## Problem with Current Setup
- NewsAPI: Rate limited to 100 requests/day on free tier
- Needs a better, truly free solution

---

## ✅ RECOMMENDED: RSS Feed Aggregator (100% Free)

### Option 1: RSS2JSON API (Best Choice)
**Why**: Simple, free, no rate limits, no API key needed

**Implementation**:
```javascript
// Replace in functions/api/news.js or create new function

const RSS_FEEDS = [
  'https://techcrunch.com/feed/',
  'https://www.theverge.com/rss/index.xml',
  'https://news.ycombinator.com/rss',
  'https://www.producthunt.com/feed',
  'https://github.blog/feed/',
  'https://aws.amazon.com/blogs/aws/feed/',
  'https://www.wired.com/feed/rss',
  'https://arstechnica.com/feed/',
];

exports.handler = async (event, context) => {
  try {
    const allArticles = [];

    // Fetch from multiple RSS feeds
    for (const feedUrl of RSS_FEEDS) {
      const rss2jsonUrl = `https://api.rss2json.com/v1/api.json?rss_url=${encodeURIComponent(feedUrl)}&count=10`;

      const response = await fetch(rss2jsonUrl);
      const data = await response.json();

      if (data.status === 'ok' && data.items) {
        data.items.forEach(item => {
          allArticles.push({
            title: item.title,
            description: item.description?.substring(0, 200) + '...' || '',
            url: item.link,
            source: data.feed.title,
            publishedAt: item.pubDate,
            author: item.author || data.feed.title,
          });
        });
      }
    }

    // Sort by date
    allArticles.sort((a, b) => new Date(b.publishedAt) - new Date(a.publishedAt));

    // Return top 50
    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
      body: JSON.stringify({
        status: 'ok',
        totalResults: allArticles.length,
        articles: allArticles.slice(0, 50),
      }),
    };
  } catch (error) {
    console.error('RSS aggregation error:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Failed to fetch news' }),
    };
  }
};
```

**Pros**:
- ✅ 100% Free forever
- ✅ No API key needed
- ✅ No rate limits
- ✅ Supports any RSS feed
- ✅ Easy to add/remove sources

**Cons**:
- ❌ Limited to RSS-enabled sources
- ❌ No search/filtering (unless you build it)

---

### Option 2: The Guardian API (Free Tier)
**API Key**: Free with registration
**Rate Limit**: 1,000 requests/day (10x better than NewsAPI)

```javascript
const GUARDIAN_API_KEY = process.env.GUARDIAN_API_KEY;

exports.handler = async (event, context) => {
  const query = event.queryStringParameters?.q || 'technology';
  const url = `https://content.guardianapis.com/search?q=${query}&api-key=${GUARDIAN_API_KEY}&show-fields=thumbnail,trailText`;

  try {
    const response = await fetch(url);
    const data = await response.json();

    const articles = data.response.results.map(article => ({
      title: article.webTitle,
      description: article.fields?.trailText || '',
      url: article.webUrl,
      source: 'The Guardian',
      publishedAt: article.webPublicationDate,
      urlToImage: article.fields?.thumbnail,
    }));

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
      body: JSON.stringify({ status: 'ok', totalResults: articles.length, articles }),
    };
  } catch (error) {
    return { statusCode: 500, body: JSON.stringify({ error: error.message }) };
  }
};
```

**Sign up**: https://open-platform.theguardian.com/access/

---

### Option 3: Hybrid Approach (Recommended)
Combine RSS feeds + The Guardian for best coverage:

```javascript
const GUARDIAN_API_KEY = process.env.GUARDIAN_API_KEY;
const RSS_FEEDS = [
  'https://techcrunch.com/feed/',
  'https://www.theverge.com/rss/index.xml',
  'https://news.ycombinator.com/rss',
];

exports.handler = async (event, context) => {
  try {
    const articles = [];

    // 1. Fetch from RSS feeds (free)
    for (const feedUrl of RSS_FEEDS) {
      const rss2jsonUrl = `https://api.rss2json.com/v1/api.json?rss_url=${encodeURIComponent(feedUrl)}&count=5`;
      const response = await fetch(rss2jsonUrl);
      const data = await response.json();

      if (data.status === 'ok' && data.items) {
        data.items.forEach(item => {
          articles.push({
            title: item.title,
            description: item.description?.substring(0, 200) + '...' || '',
            url: item.link,
            source: data.feed.title,
            publishedAt: item.pubDate,
          });
        });
      }
    }

    // 2. Fetch from Guardian API (backup)
    if (GUARDIAN_API_KEY) {
      const guardianUrl = `https://content.guardianapis.com/search?section=technology&api-key=${GUARDIAN_API_KEY}&show-fields=thumbnail,trailText&page-size=10`;
      const guardianResponse = await fetch(guardianUrl);
      const guardianData = await guardianResponse.json();

      if (guardianData.response?.results) {
        guardianData.response.results.forEach(article => {
          articles.push({
            title: article.webTitle,
            description: article.fields?.trailText || '',
            url: article.webUrl,
            source: 'The Guardian',
            publishedAt: article.webPublicationDate,
            urlToImage: article.fields?.thumbnail,
          });
        });
      }
    }

    // Sort and deduplicate
    articles.sort((a, b) => new Date(b.publishedAt) - new Date(a.publishedAt));
    const uniqueArticles = articles.filter((article, index, self) =>
      index === self.findIndex((a) => a.url === article.url)
    );

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
      body: JSON.stringify({
        status: 'ok',
        totalResults: uniqueArticles.length,
        articles: uniqueArticles.slice(0, 50),
      }),
    };
  } catch (error) {
    console.error('News aggregation error:', error);
    return { statusCode: 500, body: JSON.stringify({ error: 'Failed to fetch news' }) };
  }
};
```

---

## 🎯 IMPLEMENTATION STEPS

### Step 1: Choose Your Approach
I recommend **Option 3 (Hybrid)** for best results.

### Step 2: Update the Function

Replace `functions/api/news.js` with the hybrid approach above.

### Step 3: Add Guardian API Key (Optional)
If using Guardian API:
1. Sign up: https://open-platform.theguardian.com/access/
2. Get your API key
3. Add to Netlify: `GUARDIAN_API_KEY`

### Step 4: Test Locally
```bash
# If you have Netlify CLI
netlify dev

# Then visit
http://localhost:8888/.netlify/functions/news
```

### Step 5: Deploy
```bash
git add functions/api/news.js
git commit -m "feat: switch to free RSS aggregator"
git push origin main
```

---

## 📰 Recommended RSS Feeds (Free Forever)

### Technology
- TechCrunch: `https://techcrunch.com/feed/`
- The Verge: `https://www.theverge.com/rss/index.xml`
- Ars Technica: `https://arstechnica.com/feed/`
- Wired: `https://www.wired.com/feed/rss`

### Developer News
- Hacker News: `https://news.ycombinator.com/rss`
- GitHub Blog: `https://github.blog/feed/`
- Dev.to: `https://dev.to/feed`

### Business/Startups
- Product Hunt: `https://www.producthunt.com/feed`
- YC News: `https://news.ycombinator.com/rss`
- Indie Hackers: `https://www.indiehackers.com/feed`

### Cloud/Infrastructure
- AWS Blog: `https://aws.amazon.com/blogs/aws/feed/`
- Azure Blog: `https://azure.microsoft.com/en-us/blog/feed/`
- Google Cloud: `https://cloudblog.withgoogle.com/rss/`

---

## 🔄 Alternative Free APIs

### Option 4: GNews API
- Free tier: 100 requests/day
- Sign up: https://gnews.io/
- Similar to NewsAPI but with more generous limits

### Option 5: Currents API
- Free tier: 600 requests/day (6x better!)
- Sign up: https://currentsapi.services/en
- Great for news aggregation

### Option 6: Scraped News (Custom)
Build your own scraper with Puppeteer/Playwright (100% free but more work)

---

## 💰 Cost Comparison

| Service | Free Tier | Rate Limit | API Key |
|---------|-----------|------------|---------|
| **RSS2JSON** | ✅ Unlimited | ✅ No limit | ❌ Not needed |
| **The Guardian** | ✅ Yes | 1,000/day | ✅ Required |
| **Currents API** | ✅ Yes | 600/day | ✅ Required |
| **NewsAPI** | ⚠️ Limited | 100/day | ✅ Required |
| **GNews** | ⚠️ Limited | 100/day | ✅ Required |

---

## 🎯 MY RECOMMENDATION

**Use RSS2JSON (Option 1)** for the simplest, truly free solution.

Why:
- ✅ No API key = no rate limits = no costs
- ✅ Works with any RSS feed
- ✅ Easy to customize sources
- ✅ No signup/registration
- ✅ Perfect for your use case

**Add The Guardian API (Option 3)** if you want more variety and professional content.

---

## 🚀 Ready-to-Use Implementation

I can create the updated `functions/api/news.js` file for you right now. Just let me know which approach you prefer:

A) RSS2JSON only (simplest, 100% free)
B) Hybrid RSS + Guardian (best coverage)
C) Guardian API only (professional news)

Which would you like me to implement?
