/*
 * THE SIGNAL — Smart News Cache Edge Function
 * Intelligent caching for news aggregator
 * Updates cache based on user location and time
 */

export default async (request, context) => {
  const url = new URL(request.url);

  // Only run for news endpoint
  if (!url.pathname.includes('/news')) {
    return context.next();
  }

  const { country, city, timezone } = context.geo;

  // Create cache key based on location
  const cacheKey = `news-${country?.code || 'global'}-${new Date().getHours()}`;

  // Try to get from cache
  const cache = caches.default;
  const cacheUrl = new URL(request.url);
  cacheUrl.searchParams.set('_cache_key', cacheKey);

  let cachedResponse = await cache.match(cacheUrl);

  if (cachedResponse) {
    // Serve from cache with header indicating it
    const response = new Response(cachedResponse.body, cachedResponse);
    response.headers.set('X-Cache', 'HIT');
    response.headers.set('X-Cache-Key', cacheKey);
    response.headers.set('X-Edge-Location', city || 'Unknown');
    return response;
  }

  // Not in cache, fetch fresh
  const response = await context.next();

  // Clone for caching
  const cacheResponse = response.clone();

  // Cache for 10 minutes
  const headers = new Headers(cacheResponse.headers);
  headers.set('Cache-Control', 'public, max-age=600');
  headers.set('X-Cache', 'MISS');
  headers.set('X-Edge-Location', city || 'Unknown');

  const finalResponse = new Response(cacheResponse.body, {
    status: cacheResponse.status,
    statusText: cacheResponse.statusText,
    headers
  });

  // Store in cache
  context.waitUntil(cache.put(cacheUrl, finalResponse.clone()));

  return finalResponse;
};

export const config = {
  path: "/news/*"
};
