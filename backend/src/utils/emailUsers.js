const prisma = require('./prismaClient');
const { sendMail, appUrl, mailConfigured } = require('./mailer');

// Emails users about something that already happened. Call it AFTER the database change has committed.
// It never throws and never blocks the request. Does nothing unless SMTP is configured.
// Users can switch emails off with notificationPrefs.email === false.
function emailUsers(userIds, { subject, text, link }) {
  if (!mailConfigured()) return;
  const ids = [...new Set([].concat(userIds))].filter(Boolean);
  if (ids.length === 0) return;
  setImmediate(async () => {
    try {
      const users = await prisma.user.findMany({
        where: { id: { in: ids }, isActive: true },
        select: { email: true, name: true, notificationPrefs: true },
      });
      const url = link ? `${appUrl()}${link}` : appUrl();
      for (const u of users) {
        if (u.notificationPrefs && u.notificationPrefs.email === false) continue;
        // Sequential on purpose: keeps SMTP providers happy and bounds memory for large lists.
        // eslint-disable-next-line no-await-in-loop
        await sendMail({ to: u.email, subject, text: `Hi ${u.name},\n\n${text}\n\nOpen UniEvents: ${url}\n\nYou can turn email notifications off in Settings.` });
      }
    } catch (e) {
      console.error('[mail] notification email failed:', e.message);
    }
  });
}

module.exports = { emailUsers };
