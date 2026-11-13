// Optional email. Nothing here is required: with no SMTP_* variables the app works the same and
// emails are simply not sent. To enable: set SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, MAIL_FROM
// and make sure the optional package "nodemailer" is installed (it is an optionalDependency).
const configured = () => Boolean(process.env.SMTP_HOST);

let transporter = null;
const getTransporter = () => {
  if (transporter) return transporter;
  // Required lazily so the app starts even when nodemailer is not installed.
  // eslint-disable-next-line global-require
  const nodemailer = require('nodemailer');
  transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT) || 587,
    secure: process.env.SMTP_SECURE === 'true',
    auth: process.env.SMTP_USER ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS } : undefined,
  });
  return transporter;
};

// Returns { sent: boolean }. Never throws.
async function sendMail({ to, subject, text }) {
  if (!configured()) {
    // Links contain secrets, so they are only printed outside production (or when explicitly allowed).
    if (process.env.NODE_ENV !== 'production' || process.env.LOG_EMAIL_LINKS === 'true') {
      console.log(`[mail] SMTP not configured. Would send to ${to}: ${subject}\n${text}`);
    }
    return { sent: false };
  }
  try {
    await getTransporter().sendMail({
      from: process.env.MAIL_FROM || process.env.SMTP_USER,
      to,
      subject,
      text,
    });
    return { sent: true };
  } catch (e) {
    console.error('[mail] failed to send:', e.message);
    return { sent: false };
  }
}

// Public address of the app, used in links inside emails. Taken from configuration, never from request headers.
const appUrl = () =>
  (
    process.env.APP_URL ||
    process.env.RENDER_EXTERNAL_URL ||
    String(process.env.CLIENT_ORIGIN || '').split(',')[0].trim() ||
    'http://localhost:5173'
  ).replace(/\/+$/, '');

module.exports = { sendMail, appUrl, mailConfigured: configured };
