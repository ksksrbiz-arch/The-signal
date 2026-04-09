/*
 * THE SIGNAL — Performance Optimization Edge Function
 * Adds optimized caching headers and security headers
 * Implements smart content delivery strategies
 */

export default async (request, context) => {
  const url = new URL(request.url);
  const response = await context.next();

  // Clone response to modify
  const newResponse = new Response(response.body, response);

  // Add security headers
  newResponse.headers.set('X-Frame-Options', 'DENY');
  newResponse.headers.set('X-Content-Type-Options', 'nosniff');
  newResponse.headers.set('X-XSS-Protection', '1; mode=block');
  newResponse.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  newResponse.headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');

  // Add performance headers
  newResponse.headers.set('X-Powered-By', 'Netlify Edge Functions');

  // Smart caching based on content type
  const contentType = response.headers.get('Content-Type') || '';

  if (contentType.includes('text/html')) {
    // HTML pages: cache for 5 minutes
    newResponse.headers.set('Cache-Control', 'public, max-age=300, stale-while-revalidate=600');
  } else if (contentType.includes('application/javascript') || contentType.includes('text/css')) {
    // JS/CSS: cache for 1 year with immutable
    newResponse.headers.set('Cache-Control', 'public, max-age=31536000, immutable');
  } else if (contentType.includes('image/')) {
    // Images: cache for 1 week
    newResponse.headers.set('Cache-Control', 'public, max-age=604800');
  }

  // Add timing headers for performance monitoring
  newResponse.headers.set('X-Edge-Location', context.geo.city || 'Unknown');
  newResponse.headers.set('X-Served-By', 'Netlify Edge');

  return newResponse;
};

export const config = {
  path: "/*"
};
