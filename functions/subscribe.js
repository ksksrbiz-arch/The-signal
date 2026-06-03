// The Signal — newsletter signup → MailerLite
// Writes subscribers into group "Signal — Newsletter Subscribers" (189284702373283740).
//
// Required Netlify env var: MAILERLITE_API_KEY (account 2192941)
// Front end POSTs JSON { "email": "..." } to /api/subscribe

const MAILERLITE_API = "https://connect.mailerlite.com/api";
const SIGNAL_GROUP_ID = "189284702373283740";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
  "Content-Type": "application/json",
};

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

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
