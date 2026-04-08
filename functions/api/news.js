/**
 * Secure NewsAPI Proxy Function
 * Handles all news aggregation requests with the API key stored securely in Cloudflare environment
 * 
 * Endpoint: /api/news?q=search&category=technology&sortBy=publishedAt&pageSize=50
 */

export async function onRequestGet(context) {
  try {
    const { request, env } = context;
    const url = new URL(request.url);

    // Extract query parameters from the request
    const searchQuery = url.searchParams.get("q") || "technology";
    const sortBy = url.searchParams.get("sortBy") || "publishedAt";
    const pageSize = Math.min(parseInt(url.searchParams.get("pageSize")) || 50, 100);
    const page = Math.max(parseInt(url.searchParams.get("page")) || 1, 1);

    // Validate API key exists
    if (!env.NEWSAPI_KEY) {
      return new Response(
        JSON.stringify({ error: "API key not configured" }),
        { 
          status: 500,
          headers: { "Content-Type": "application/json" }
        }
      );
    }

    // Build the NewsAPI request
    const newsApiUrl = new URL("https://newsapi.org/v2/everything");
    newsApiUrl.searchParams.set("q", searchQuery);
    newsApiUrl.searchParams.set("sortBy", sortBy);
    newsApiUrl.searchParams.set("pageSize", pageSize.toString());
    newsApiUrl.searchParams.set("page", page.toString());
    newsApiUrl.searchParams.set("language", "en");
    newsApiUrl.searchParams.set("apiKey", env.NEWSAPI_KEY);

    // Fetch from NewsAPI
    const newsResponse = await fetch(newsApiUrl.toString(), {
      method: "GET",
      headers: {
        "User-Agent": "Signal-News-Aggregator/1.0 (Cloudflare Pages)",
        "Accept": "application/json"
      }
    });

    // Handle NewsAPI errors
    if (!newsResponse.ok) {
      const errorData = await newsResponse.json();
      return new Response(
        JSON.stringify({
          error: errorData.message || "Failed to fetch news",
          status: newsResponse.status
        }),
        { 
          status: newsResponse.status,
          headers: { "Content-Type": "application/json" }
        }
      );
    }

    // Parse and validate response
    const newsData = await newsResponse.json();

    // Sanitize and enrich the response
    const sanitizedArticles = (newsData.articles || []).map(article => ({
      source: {
        id: article.source?.id || null,
        name: article.source?.name || "Unknown Source"
      },
      author: article.author || null,
      title: article.title || "Untitled",
      description: article.description || null,
      url: article.url || null,
      urlToImage: article.urlToImage || null,
      publishedAt: article.publishedAt || new Date().toISOString(),
      content: article.content || null
    }));

    // Return the sanitized response with caching headers
    return new Response(
      JSON.stringify({
        status: "ok",
        totalResults: newsData.totalResults || 0,
        articles: sanitizedArticles
      }),
      {
        status: 200,
        headers: {
          "Content-Type": "application/json",
          "Cache-Control": "public, max-age=300", // Cache for 5 minutes
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Methods": "GET, OPTIONS",
          "Access-Control-Allow-Headers": "Content-Type"
        }
      }
    );

  } catch (error) {
    console.error("News API Error:", error);
    return new Response(
      JSON.stringify({
        error: "Internal server error",
        message: error.message
      }),
      { 
        status: 500,
        headers: { "Content-Type": "application/json" }
      }
    );
  }
}

// Handle OPTIONS requests for CORS preflight
export async function onRequestOptions(context) {
  return new Response(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
      "Access-Control-Max-Age": "86400"
    }
  });
}
