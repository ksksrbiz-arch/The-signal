// The Signal — newsletter signup → MailerLite
// Writes subscribers into group "Signal — Newsletter Subscribers" (189284702373283740).
//
// Required Netlify env var: MAILERLITE_API_KEY (account 2192941)
// Front end POSTs JSON { "email": "..." } to /api/subscribe

const MAILERLITE_API = "https://connect.mailerlite.com/api";
const SIGNAL_GROUP_ID = "189284702373283740";

// State-changing endpoint: scope CORS to the production site origin rather than
// a wildcard so arbitrary third-party origins can't drive signups from a browser.
const SITE_ORIGIN = "https://1commercesolutions.com";

const CORS = {
  "Access-Control-Allow-Origin": SITE_ORIGIN,
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
  "Vary": "Origin",
  "Content-Type": "application/json",
};

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Best-effort in-memory per-IP throttle. Serverless instances are ephemeral and
// not shared across the fleet, so this is only a soft guard against rapid repeats
// hitting a single warm instance — not a durable rate limiter. Rejects an IP that
// exceeds MAX_HITS requests within WINDOW_MS.
const WINDOW_MS = 60 * 1000;
const MAX_HITS = 5;
const ipHits = new Map();

function clientIp(event) {
  const headers = (event && event.headers) || {};
  const raw = headers["x-nf-client-connection-ip"] ||
    headers["X-Nf-Client-Connection-Ip"] ||
    headers["x-forwarded-for"] ||
    headers["X-Forwarded-For"] ||
    "";
  return String(raw).split(",")[0].trim() || "unknown";
}

function isThrottled(ip) {
  const now = Date.now();
  const entry = ipHits.get(ip);
  if (!entry || now - entry.start >= WINDOW_MS) {
    ipHits.set(ip, { start: now, count: 1 });
    // Opportunistically prune stale entries so the map can't grow unbounded on a
    // long-lived warm instance.
    if (ipHits.size > 5000) {
      for (const [key, val] of ipHits) {
        if (now - val.start >= WINDOW_MS) ipHits.delete(key);
      }
    }
    return false;
  }
  entry.count += 1;
  return entry.count > MAX_HITS;
}

const json = (statusCode, body) => ({
  statusCode,
  headers: CORS,
  body: JSON.stringify(body),
});

exports.handler = async (event) => {
  if (event.httpMethod === "OPTIONS") {
    return { statusCode: 204, headers: CORS, body: "" };
  }

  if (event.httpMethod !== "POST") {
    return json(405, { ok: false, error: "Method not allowed" });
  }

  // Soft abuse guard: reject obviously abusive rapid repeats from the same IP on
  // a warm instance. Best-effort only (see isThrottled notes above).
  if (isThrottled(clientIp(event))) {
    return json(429, { ok: false, error: "Too many requests. Please slow down." });
  }

  const apiKey = process.env.MAILERLITE_API_KEY;
  if (!apiKey) {
    console.error("MAILERLITE_API_KEY is not set in the Netlify environment.");
    return json(500, { ok: false, error: "Email signup is temporarily unavailable." });
  }

  let email = "";
  try {
    const parsed = JSON.parse(event.body || "{}");
    email = String(parsed.email || "").trim().toLowerCase();
  } catch {
    return json(400, { ok: false, error: "Invalid request body." });
  }

  if (!EMAIL_RE.test(email)) {
    return json(400, { ok: false, error: "Please enter a valid email address." });
  }

  try {
    const res = await fetch(`${MAILERLITE_API}/subscribers`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({
        email,
        groups: [SIGNAL_GROUP_ID],
        status: "active",
      }),
    });

    if (res.ok) {
      return json(200, { ok: true, message: "You're on the list." });
    }

    const detail = await res.text();
    console.error(`MailerLite ${res.status}: ${detail}`);

    if (res.status === 422) {
      return json(502, { ok: false, error: "Signup rejected by mail provider. We're on it." });
    }
    return json(502, { ok: false, error: "Couldn't reach the mail provider. Try again shortly." });
  } catch (err) {
    console.error("subscribe.js network error:", err);
    return json(502, { ok: false, error: "Network error. Please try again." });
  }
};
