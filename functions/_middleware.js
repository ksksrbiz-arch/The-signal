/**
 * Cloudflare Pages Functions Middleware
 * Handles global request processing, bot filtering, and routing normalization
 */

export async function onRequest(context) {
  const url = new URL(context.request.url);
  const userAgent = context.request.headers.get("User-Agent") || "";

  // Normalize trailing slashes (redirect /path/ to /path)
  if (url.pathname !== "/" && url.pathname.endsWith("/")) {
    return Response.redirect(url.origin + url.pathname.slice(0, -1), 301);
  }

  // Block obvious bots and suspicious requests from API endpoints
  if (url.pathname.startsWith("/api/")) {
    // Allow legitimate browsers and API clients
    const isBot = !userAgent || 
                  userAgent.includes("curl") || 
                  userAgent.includes("python-requests") ||
                  userAgent.includes("wget") ||
                  userAgent.includes("scrapy");
    
    if (isBot) {
      return new Response(JSON.stringify({ error: "Forbidden" }), { 
        status: 403,
        headers: { "Content-Type": "application/json" }
      });
    }

    // Add CORS headers for API responses
    const response = await context.next();
    response.headers.set("Access-Control-Allow-Origin", "*");
    response.headers.set("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
    response.headers.set("Access-Control-Allow-Headers", "Content-Type");
    return response;
  }

  // Continue to next handler
  return context.next();
}
