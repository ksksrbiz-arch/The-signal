/* ============================================================
   THE SIGNAL — Email Contact Function
   Netlify Serverless Function for direct email contact

   SETUP: Set SENDGRID_API_KEY in Netlify dashboard →
   Site settings → Environment variables. The function auto-detects
   the key and switches from logging-only to actual email delivery.

   Free tier: 100 emails/day at https://sendgrid.com
   ============================================================ */

exports.handler = async (event, context) => {
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers: corsHeaders(), body: '' };
  }

  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, headers: corsHeaders(), body: JSON.stringify({ error: 'Method not allowed' }) };
  }

  try {
    const data = JSON.parse(event.body);
    const { name, email, message } = data;

    if (!name || !email || !message) {
      return { statusCode: 400, headers: corsHeaders(), body: JSON.stringify({ error: 'Missing required fields: name, email, message' }) };
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return { statusCode: 400, headers: corsHeaders(), body: JSON.stringify({ error: 'Invalid email address' }) };
    }

    const apiKey = process.env.SENDGRID_API_KEY;

    if (apiKey) {
      // SendGrid is configured — send real email
      const sgMail = require('@sendgrid/mail');
      sgMail.setApiKey(apiKey);
      await sgMail.send({
        to: 'skdev@1commerce.online',
        from: process.env.SENDGRID_FROM_EMAIL || 'noreply@1commercesolutions.com',
        replyTo: email,
        subject: `Signal Contact from ${name}`,
        text: `From: ${name} (${email})\n\n${message}`,
        html: `<p><strong>From:</strong> ${name} (<a href="mailto:${email}">${email}</a>)</p><p>${message.replace(/\n/g, '<br>')}</p>`,
      });
      console.log('Email sent via SendGrid to skdev@1commerce.online from', email);
    } else {
      // No API key — log only (function still returns success since the
      // message IS received; it's just not forwarded via email yet).
      console.warn('SENDGRID_API_KEY not set — contact message logged but NOT emailed.');
      console.warn('Set this env var in Netlify dashboard to enable email delivery.');
      console.log('Contact request:', { name, email, message: message.substring(0, 200), timestamp: new Date().toISOString() });
    }

    return {
      statusCode: 200,
      headers: corsHeaders(),
      body: JSON.stringify({
        success: true,
        message: 'Message received! Keith will respond within 24-48 hours.',
      }),
    };
  } catch (error) {
    console.error('Email function error:', error);
    return {
      statusCode: 500,
      headers: corsHeaders(),
      body: JSON.stringify({
        error: 'Failed to process your message. Please email directly at skdev@1commerce.online',
      }),
    };
  }
};

function corsHeaders() {
  return {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
  };
}
