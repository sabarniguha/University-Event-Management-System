const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const { z } = require('zod');
const prisma = require('../utils/prismaClient');
const HttpError = require('../utils/httpError');
const asyncHandler = require('../utils/asyncHandler');
const { loadManagedEvent } = require('../utils/access');
const { issueToken } = require('../utils/authTokens');
const { sendMail, appUrl, mailConfigured } = require('../utils/mailer');
const { notify } = require('../utils/notify');
const { audit } = require('../utils/audit');

const MAX_ROWS = 500;
const HOUR = 60 * 60 * 1000;
const text = (n) => z.string().trim().max(n).optional().transform((v) => v || undefined);

const studentRow = z.object({
  name: z.string().trim().min(2, 'name is too short').max(100),
  email: z.string().trim().toLowerCase().email('invalid email'),
  department: text(100),
  studentId: text(50),
  phone: text(20),
});
const studentsBody = z.object({ rows: z.array(z.record(z.any())).min(1, 'The file has no rows').max(MAX_ROWS, `At most ${MAX_ROWS} rows per upload`) });

// Sends one welcome email with a verification link and a link to choose a password. Runs after the response.
function mailWelcomes(users) {
  if (!mailConfigured()) return;
  setImmediate(async () => {
    for (const u of users) {
      try {
        // eslint-disable-next-line no-await-in-loop
        const verify = await issueToken(u.id, 'VERIFY_EMAIL', 7 * 24 * HOUR);
        // eslint-disable-next-line no-await-in-loop
        const reset = await issueToken(u.id, 'RESET_PASSWORD', 7 * 24 * HOUR);
        // eslint-disable-next-line no-await-in-loop
        await sendMail({
          to: u.email,
          subject: 'Your UniEvents account is ready',
          text: `Hi ${u.name},\n\nYour college has created a UniEvents account for you.\n\n1. Choose your password (valid for 7 days):\n${appUrl()}/reset-password?token=${reset}\n\n2. Verify your email (valid for 7 days):\n${appUrl()}/verify-email?token=${verify}\n\nIf you did not expect this email, ignore it.`,
        });
      } catch (e) {
        console.error('[bulk] welcome email failed:', e.message);
      }
    }
  });
}

// POST /api/admin/users/import  { rows: [{name,email,department,studentId,phone}] }
const importStudents = asyncHandler(async (req, res) => {
  const { rows } = studentsBody.parse(req.body);
  const errors = [];
  const valid = [];
  const seen = new Set();
  rows.forEach((raw, i) => {
    const line = i + 2; // row 1 is the header
    const parsed = studentRow.safeParse(raw);
    if (!parsed.success) return errors.push({ line, email: String(raw.email || ''), reason: parsed.error.issues[0].message });
    if (seen.has(parsed.data.email)) return errors.push({ line, email: parsed.data.email, reason: 'duplicate in file' });
    seen.add(parsed.data.email);
    return valid.push({ line, ...parsed.data });
  });

  const existing = await prisma.user.findMany({ where: { email: { in: valid.map((v) => v.email) } }, select: { email: true } });
  const taken = new Set(existing.map((e) => e.email));
  const fresh = valid.filter((v) => {
    if (taken.has(v.email)) {
      errors.push({ line: v.line, email: v.email, reason: 'account already exists' });
      return false;
    }
    return true;
  });

  const created = [];
  for (const v of fresh) {
    // The password is random and never shown; the student picks their own through the emailed link.
    // eslint-disable-next-line no-await-in-loop
    const passwordHash = await bcrypt.hash(crypto.randomBytes(24).toString('hex'), 4);
    try {
      // eslint-disable-next-line no-await-in-loop
      const user = await prisma.user.create({
        data: { name: v.name, email: v.email, passwordHash, role: 'STUDENT', department: v.department, studentId: v.studentId, phone: v.phone },
        select: { id: true, name: true, email: true },
      });
      created.push(user);
    } catch (e) {
      errors.push({ line: v.line, email: v.email, reason: 'could not be created' });
    }
  }

  mailWelcomes(created);
  await audit(req, 'user.bulk_import', 'User', null, { created: created.length, failed: errors.length });
  errors.sort((a, b) => a.line - b.line);
  res.status(201).json({ created: created.length, skipped: errors.length, errors: errors.slice(0, 100), emailConfigured: mailConfigured() });
});

const attendanceBody = z.object({
  eventId: z.coerce.number().int().positive(),
  status: z.enum(['PRESENT', 'ABSENT']).default('PRESENT'),
  rows: z.array(z.record(z.any())).min(1, 'The file has no rows').max(2000, 'At most 2000 rows per upload'),
});

// POST /api/attendance/import  { eventId, status, rows: [{email} or {studentId}] }
const importAttendance = asyncHandler(async (req, res) => {
  const { eventId, status, rows } = attendanceBody.parse(req.body);
  const event = await loadManagedEvent(eventId, req.user);
  if (event.status !== 'PUBLISHED') throw new HttpError(400, 'Attendance can only be recorded for published events');

  const regs = await prisma.registration.findMany({
    where: { eventId, status: 'REGISTERED' },
    select: { id: true, userId: true, user: { select: { email: true, studentId: true } } },
  });
  const byEmail = new Map(regs.map((r) => [r.user.email.toLowerCase(), r]));
  const byStudent = new Map(regs.filter((r) => r.user.studentId).map((r) => [r.user.studentId.toLowerCase(), r]));

  const matched = new Map();
  const notFound = [];
  rows.forEach((raw, i) => {
    const em = String(raw.email || '').trim().toLowerCase();
    const sid = String(raw.studentId || '').trim().toLowerCase();
    if (!em && !sid) return notFound.push({ line: i + 2, value: '', reason: 'no email or studentId' });
    const reg = (em && byEmail.get(em)) || (sid && byStudent.get(sid));
    if (!reg) return notFound.push({ line: i + 2, value: em || sid, reason: 'not registered for this event' });
    return matched.set(reg.id, reg);
  });

  const when = new Date();
  const data = { status, method: 'MANUAL', markedById: req.user.id, checkedInAt: status === 'PRESENT' ? when : null };
  await prisma.$transaction([...matched.keys()].map((registrationId) =>
    prisma.attendance.upsert({ where: { registrationId }, update: data, create: { registrationId, ...data } })));

  if (status === 'PRESENT') {
    await notify(prisma, [...matched.values()].map((r) => r.userId), {
      title: 'Checked in', message: `You were checked in to "${event.title}". Thanks for coming!`, link: '/student/attendance',
    });
  }
  await audit(req, 'attendance.import', 'Event', eventId, { marked: matched.size, notFound: notFound.length });
  res.json({ marked: matched.size, notFound: notFound.length, errors: notFound.slice(0, 100) });
});

module.exports = { importStudents, importAttendance };
