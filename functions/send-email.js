/* ============================================================
   THE SIGNAL — Email Contact Function
   Netlify Serverless Function for direct email contact
   ============================================================ */

exports.handler = async (event, context) => {
  // Only allow POST requests
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      body: JSON.stringify({ error: 'Method not allowed' })
    };
  }

  try {
    // Parse request body
    const data = JSON.parse(event.body);
    const { name, email, message } = data;

    // Validate inputs
    if (!name || !email || !message) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'Missing required fields' })
      };
    }

    // Email validation regex
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'Invalid email address' })
      };
    }

    // In a production environment, you would integrate with an email service here
    // Options: SendGrid, AWS SES, Mailgun, Resend, etc.
    // For now, we'll log and return success

    console.log('Email contact request:', {
      from: email,
      name: name,
      message: message.substring(0, 100) + '...',
      timestamp: new Date().toISOString()
    });

    // TODO: Integrate with email service
    // Example with SendGrid:
    // const sgMail = require('@sendgrid/mail');
    // sgMail.setApiKey(process.env.SENDGRID_API_KEY);
    // const msg = {
    //   to: 'skdev@1commerce.online',
    //   from: 'noreply@signal01.netlify.app',
    //   replyTo: email,
    //   subject: `Signal Contact from ${name}`,
    //   text: message,
    //   html: `<p><strong>From:</strong> ${name} (${email})</p><p>${message}</p>`
    // };
    // await sgMail.send(msg);

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      },
      body: JSON.stringify({
        success: true,
        message: 'Message received! Keith will respond within 24-48 hours.'
      })
    };

  } catch (error) {
    console.error('Email function error:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ 
        error: 'Failed to send email. Please try again or email directly at skdev@1commerce.online' 
      })
    };
  }
};
