const bcrypt = require('bcryptjs');
const prisma = require('../utils/prismaClient');
const HttpError = require('../utils/httpError');
const asyncHandler = require('../utils/asyncHandler');
const { signToken } = require('../utils/jwt');
const { userSelect } = require('../middleware/authMiddleware');
const { issueToken, consumeToken } = require('../utils/authTokens');
const { sendMail, appUrl } = require('../utils/mailer');
const { getSettings } = require('../utils/settings');
const { notifyAdmins } = require('../utils/notify');
const { audit } = require('../utils/audit');
const {
  registerSchema,
  loginSchema,
  profileSchema,
  changePasswordSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
  verifyEmailSchema,
  organizerRequestSchema,
} = require('../utils/validators');

const HOUR = 60 * 60 * 1000;

async function sendVerificationEmail(user) {
  const token = await issueToken(user.id, 'VERIFY_EMAIL', 48 * HOUR);
  const link = `${appUrl()}/verify-email?token=${token}`;
  await sendMail({
    to: user.email,
    subject: 'Verify your UniEvents email',
    text: `Hi ${user.name},\n\nConfirm your email address by opening this link (valid for 48 hours):\n${link}\n\nIf you did not create an account, ignore this message.`,
  });
}

// Public sign-up always creates a STUDENT. Admins promote users to ORGANIZER/ADMIN.
const register = asyncHandler(async (req, res) => {
  const settings = await getSettings();
  if (!settings.allowStudentSignup) throw new HttpError(403, 'New sign-ups are currently closed.');

  const data = registerSchema.parse(req.body);
  const exists = await prisma.user.findUnique({ where: { email: data.email } });
  if (exists) throw new HttpError(409, 'An account with this email already exists');

  const passwordHash = await bcrypt.hash(data.password, 12);
  const user = await prisma.user.create({
    data: {
      name: data.name,
      email: data.email,
      passwordHash,
      department: data.department,
      phone: data.phone,
      studentId: data.studentId,
      year: data.year,
      college: data.college,
      role: 'STUDENT',
      lastLoginAt: new Date(),
    },
    select: userSelect,
  });

  sendVerificationEmail(user).catch((e) => console.error('[auth] verification email failed:', e.message));
  res.status(201).json({ token: signToken(user), user });
});

const login = asyncHandler(async (req, res) => {
  const { email, password, role } = loginSchema.parse(req.body);

  const found = await prisma.user.findUnique({ where: { email } });
  // Same message for unknown email and wrong password to avoid account enumeration.
  const ok = found && (await bcrypt.compare(password, found.passwordHash));
  if (!ok) throw new HttpError(401, 'Invalid email or password');
  if (!found.isActive) throw new HttpError(403, 'This account has been deactivated. Contact an administrator.');

  // Separate login pages: a student cannot sign in through the admin page, and so on.
  // Checked only after the password is correct, so it reveals nothing to outsiders.
  if (role && found.role !== role) {
    const label = { STUDENT: 'a student', ORGANIZER: 'an organiser', ADMIN: 'an admin' }[role];
    throw new HttpError(403, `This account is not ${label} account. Please use the correct login page.`);
  }

  const user = await prisma.user.update({ where: { id: found.id }, data: { lastLoginAt: new Date() }, select: userSelect });
  res.json({ token: signToken(user), user });
});

const me = asyncHandler(async (req, res) => {
  res.json({ user: req.user });
});

const updateMe = asyncHandler(async (req, res) => {
  const data = profileSchema.parse(req.body);
  const user = await prisma.user.update({ where: { id: req.user.id }, data, select: userSelect });
  res.json({ user });
});

const changePassword = asyncHandler(async (req, res) => {
  const { currentPassword, newPassword } = changePasswordSchema.parse(req.body);
  const row = await prisma.user.findUnique({ where: { id: req.user.id }, select: { passwordHash: true } });
  if (!row || !(await bcrypt.compare(currentPassword, row.passwordHash))) {
    throw new HttpError(400, 'Your current password is incorrect');
  }
  if (currentPassword === newPassword) throw new HttpError(400, 'Choose a password different from the current one');

  await prisma.user.update({ where: { id: req.user.id }, data: { passwordHash: await bcrypt.hash(newPassword, 12) } });
  res.json({ message: 'Password updated' });
});

// Always answers the same way so it cannot be used to find out which emails have accounts.
const forgotPassword = asyncHandler(async (req, res) => {
  const { email } = forgotPasswordSchema.parse(req.body);
  const user = await prisma.user.findUnique({ where: { email } });
  if (user && user.isActive) {
    const token = await issueToken(user.id, 'RESET_PASSWORD', 1 * HOUR);
    await sendMail({
      to: user.email,
      subject: 'Reset your UniEvents password',
      text: `Hi ${user.name},\n\nUse this link to choose a new password (valid for 1 hour):\n${appUrl()}/reset-password?token=${token}\n\nIf you did not ask for this, you can ignore this message.`,
    });
  }
  res.json({ message: 'If an account exists for that email, a reset link has been sent.' });
});

const resetPassword = asyncHandler(async (req, res) => {
  const { token, password } = resetPasswordSchema.parse(req.body);
  const record = await consumeToken(token, 'RESET_PASSWORD');
  await prisma.user.update({ where: { id: record.userId }, data: { passwordHash: await bcrypt.hash(password, 12) } });
  res.json({ message: 'Password updated. You can sign in now.' });
});

const verifyEmail = asyncHandler(async (req, res) => {
  const { token } = verifyEmailSchema.parse(req.body);
  const record = await consumeToken(token, 'VERIFY_EMAIL');
  await prisma.user.update({ where: { id: record.userId }, data: { emailVerifiedAt: new Date() } });
  res.json({ message: 'Email verified' });
});

const resendVerification = asyncHandler(async (req, res) => {
  if (req.user.emailVerifiedAt) return res.json({ message: 'Your email is already verified' });
  await sendVerificationEmail(req.user);
  return res.json({ message: 'Verification email sent (if email delivery is configured on this server).' });
});

// ---------------------------------------------------------- organiser access requests
const myOrganizerRequest = asyncHandler(async (req, res) => {
  const request = await prisma.organizerProfile.findUnique({ where: { userId: req.user.id } });
  res.json({ request });
});

// A student asks to become an organiser; an admin approves or rejects it.
const requestOrganizer = asyncHandler(async (req, res) => {
  if (req.user.role !== 'STUDENT') throw new HttpError(400, 'Only student accounts can request organiser access');
  const data = organizerRequestSchema.parse(req.body);

  const existing = await prisma.organizerProfile.findUnique({ where: { userId: req.user.id } });
  if (existing && existing.status === 'PENDING') throw new HttpError(409, 'You already have a request waiting for review');

  const request = await prisma.organizerProfile.upsert({
    where: { userId: req.user.id },
    update: { ...data, status: 'PENDING', reviewNote: null, reviewedById: null, reviewedAt: null },
    create: { ...data, userId: req.user.id },
  });
  await notifyAdmins(prisma, {
    title: 'New organiser request',
    message: `${req.user.name} asked for organiser access (${data.organization}).`,
    link: '/admin/organizers',
    type: 'APPROVAL',
  });
  await audit(req, 'organizer.request', 'User', req.user.id, { organization: data.organization });
  res.status(201).json({ request });
});

module.exports = {
  register,
  login,
  me,
  updateMe,
  changePassword,
  forgotPassword,
  resetPassword,
  verifyEmail,
  resendVerification,
  myOrganizerRequest,
  requestOrganizer,
};
