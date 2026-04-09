/*
 * THE SIGNAL — Geo-Personalization Edge Function
 * Adds location-based personalization headers
 * Runs at the edge for minimal latency
 */

export default async (request, context) => {
  const response = await context.next();

  // Get geo location data from Netlify Edge
  const {
    city,
    country,
    subdivision,
    timezone,
    latitude,
    longitude,
  } = context.geo;

  // Clone the response to modify headers
  const newResponse = new Response(response.body, response);

  // Add geo headers for client-side use
  newResponse.headers.set('X-Geo-City', city || 'Unknown');
  newResponse.headers.set('X-Geo-Country', country?.name || 'Unknown');
  newResponse.headers.set('X-Geo-Timezone', timezone || 'UTC');

  // Add personalized greeting based on timezone
  const hour = new Date().toLocaleString('en-US', { 
    timeZone: timezone || 'UTC',
    hour: 'numeric',
    hour12: false 
  });

  let greeting = 'Hello';
  const currentHour = parseInt(hour);
  if (currentHour < 12) greeting = 'Good morning';
  else if (currentHour < 18) greeting = 'Good afternoon';
  else greeting = 'Good evening';

  newResponse.headers.set('X-Greeting', greeting);

  // Log for analytics (optional)
  console.log(`Request from ${city}, ${country?.name} at ${new Date().toISOString()}`);

  return newResponse;
};

export const config = {
  path: "/*",
  excludedPath: [
    "/api/*",
    "/.netlify/*",
    "/app.js",
    "/style.css",
    "/base.css"
  ]
};
