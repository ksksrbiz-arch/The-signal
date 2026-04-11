/* ============================================================
   THE SIGNAL — Free News Aggregator
   RSS2JSON + Multi-source aggregation (100% Free, No API Key)
   ============================================================ */

const FEED_TIMEOUT_MS = 4000;

// RSS Feeds to aggregate (add/remove as needed)
const RSS_FEEDS = [
  'https://techcrunch.com/feed/',
  'https://www.theverge.com/rss/index.xml',
  'https://news.ycombinator.com/rss',
  'https://www.producthunt.com/feed',
  'https://github.blog/feed/',
  'https://arstechnica.com/feed/',
  'https://www.wired.com/feed/rss',
  'https://aws.amazon.com/blogs/aws/feed/',
];

// Fetch a single RSS feed via RSS2JSON with a per-feed timeout.
// Returns an array of mapped articles, or [] on failure.
async function fetchFeed(feedUrl) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FEED_TIMEOUT_MS);
  try {
    const rss2jsonUrl = `https://api.rss2json.com/v1/api.json?rss_url=${encodeURIComponent(feedUrl)}&count=10`;
    const response = await fetch(rss2jsonUrl, { signal: controller.signal });
    const data = await response.json();

    if (data.status !== 'ok') {
      console.warn(`Feed ${feedUrl} returned status=${data.status} message=${data.message || 'none'}`);
      return [];
    }

    return (data.items || []).map(item => {
      const cleanDescription = item.description
        ? item.description.replace(/<[^>]*>/g, '').substring(0, 200) + '...'
        : '';
      return {
        title: item.title,
        description: cleanDescription,
        url: item.link,
        source: {
          name: data.feed.title || extractDomain(feedUrl),
        },
        publishedAt: item.pubDate,
        author: item.author || data.feed.title,
        urlToImage: item.thumbnail || item.enclosure?.link || null,
      };
    });
  } catch (err) {
    console.error(`Error fetching feed ${feedUrl}: ${err.name} ${err.message}`);
    return [];
  } finally {
    clearTimeout(timer);
  }
}

exports.handler = async (event, context) => {
  try {
    // Fetch all feeds in parallel; per-feed failures are isolated.
    const results = await Promise.allSettled(RSS_FEEDS.map(fetchFeed));
    const allArticles = results.flatMap(r => r.status === 'fulfilled' ? r.value : []);

    // Sort by date (newest first)
    allArticles.sort((a, b) => new Date(b.publishedAt) - new Date(a.publishedAt));

    // Remove duplicates based on URL
    const uniqueArticles = allArticles.filter((article, index, self) =>
      index === self.findIndex((a) => a.url === article.url)
    );

    // Return top 50 articles
    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Cache-Control': 'public, max-age=600', // Cache for 10 minutes
      },
      body: JSON.stringify({
        status: 'ok',
        totalResults: uniqueArticles.length,
        articles: uniqueArticles.slice(0, 50),
      }),
    };

  } catch (error) {
    console.error('News aggregation error:', error);
    return {
      statusCode: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
      body: JSON.stringify({
        status: 'error',
        message: 'Failed to fetch news. Please try again later.',
      }),
    };
  }
};

// Helper function to extract domain name
function extractDomain(url) {
  try {
    const domain = new URL(url).hostname.replace('www.', '');
    return domain.split('.')[0].charAt(0).toUpperCase() + domain.split('.')[0].slice(1);
  } catch {
    return 'Unknown Source';
  }
}
