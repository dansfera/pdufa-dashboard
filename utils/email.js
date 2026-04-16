/**
 * Email utility for sending contact form notifications.
 * Requires env vars:
 *   SMTP_HOST     - SMTP server host (e.g. smtp.gmail.com)
 *   SMTP_PORT     - SMTP port (default: 587)
 *   SMTP_USER     - SMTP username / sender email
 *   SMTP_PASS     - SMTP password or app password
 *   CONTACT_EMAIL_TO - Recipient email (default: dansfera@gmail.com)
 */

let transporter = null;

function getTransporter() {
  if (transporter) return transporter;

  const smtpUser = process.env.SMTP_USER;
  const smtpPass = process.env.SMTP_PASS;
  const smtpHost = process.env.SMTP_HOST || 'smtp.gmail.com';
  const smtpPort = parseInt(process.env.SMTP_PORT || '587', 10);

  if (!smtpUser || !smtpPass) {
    return null;
  }

  try {
    const nodemailer = require('nodemailer');
    transporter = nodemailer.createTransport({
      host: smtpHost,
      port: smtpPort,
      secure: smtpPort === 465,
      auth: { user: smtpUser, pass: smtpPass }
    });
    return transporter;
  } catch (err) {
    console.error('[Email] Failed to create transporter:', err.message);
    return null;
  }
}

/**
 * Send an ad inquiry notification email.
 * @param {Object} data - { site, name, businessName, email, message }
 * @returns {Promise<boolean>} - true if sent, false if skipped/failed
 */
async function sendAdInquiryEmail(data) {
  const t = getTransporter();
  if (!t) {
    console.log('[Email] SMTP not configured — submission logged to DB only.');
    return false;
  }

  const to = process.env.CONTACT_EMAIL_TO || 'dansfera@gmail.com';
  const from = process.env.SMTP_USER;

  const siteName = {
    pest: 'SunbeltPestGuide.com',
    restoration: 'SunbeltRestorationGuide.com',
    hvac: 'SunbeltHVACGuide.com'
  }[data.site] || data.site;

  const subject = `New Ad Inquiry — ${siteName} from ${data.businessName}`;

  const html = `
    <h2>New Advertise With Us Inquiry</h2>
    <p><strong>Site:</strong> ${siteName}</p>
    <p><strong>Name:</strong> ${data.name}</p>
    <p><strong>Business:</strong> ${data.businessName}</p>
    <p><strong>Email:</strong> <a href="mailto:${data.email}">${data.email}</a></p>
    <p><strong>Message:</strong></p>
    <blockquote style="border-left:3px solid #ccc;padding-left:12px;color:#555;">${(data.message || '').replace(/\n/g, '<br>')}</blockquote>
    <hr>
    <p style="color:#888;font-size:12px;">Submitted via the Advertise With Us page on ${siteName}</p>
  `;

  const text = `
New Ad Inquiry — ${siteName}

Name: ${data.name}
Business: ${data.businessName}
Email: ${data.email}
Message:
${data.message || '(no message)'}
  `.trim();

  try {
    await t.sendMail({ from, to, subject, html, text });
    console.log(`[Email] Ad inquiry email sent to ${to} from ${data.businessName}`);
    return true;
  } catch (err) {
    console.error('[Email] Failed to send email:', err.message);
    return false;
  }
}

module.exports = { sendAdInquiryEmail };
