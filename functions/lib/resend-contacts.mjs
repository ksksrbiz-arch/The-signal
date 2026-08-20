// THE SIGNAL — best-effort mirror of confirmed subscribers into Resend.
// ------------------------------------------------------------------
// Netlify Blobs (see subscribe.mjs / confirm.mjs) stays the source of truth
// for the self-hosted signup flow. This helper additionally creates/updates
// a Resend contact in the "The Signal — Newsletter" segment so the daily
// dispatch (functions/send-signal.js) actually reaches people who sign up
// through the site.
//
// Deliberately never throws: a missing key or a Resend outage must not
// block someone signing up or confirming.
//
// Uses a SEPARATE key from functions/send-signal.js on purpose: that
// function's RESEND_API_KEY is sending-only (scoped to the sending domain),
// which Resend does not permit for contact management. RESEND_CONTACTS_API_KEY
// should be a full-access key, since Resend has no narrower "contacts" scope.

const RESEND_API = 'https://api.resend.com';

export async function syncConfirmedContact(email) {
  const apiKey = process.env.RESEND_CONTACTS_API_KEY;
  const segmentId = process.env.RESEND_SIGNAL_SEGMENT_ID;
  if (!apiKey || !segmentId) return;

  try {
    const res = await fetch(RESEND_API + '/contacts', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Bearer ' + apiKey,
      },
      body: JSON.stringify({
        email,
        unsubscribed: false,
        segments: [{ id: segmentId }],
      }),
    });
    if (!res.ok) {
      const detail = await res.text().catch(() => '');
      console.warn('resend-contacts: sync failed', res.status, detail);
    }
  } catch (err) {
    console.warn('resend-contacts: sync error', err && err.message);
  }
}
