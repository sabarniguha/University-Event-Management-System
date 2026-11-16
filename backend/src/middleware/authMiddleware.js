const prisma = require('../utils/prismaClient');
const { verifyToken } = require('../utils/jwt');
const HttpError = require('../utils/httpError');
const asyncHandler = require('../utils/asyncHandler');
const { isReadOnlyDemoAdmin } = require('../utils/demo');
const { mailConfigured } = require('../utils/mailer');

// Everything the client may know about the signed-in user. Never includes the password hash.
const userSelect = {
  id: true,
  name: true,
  email: true,
  role: true,
  department: true,
  phone: true,
  studentId: true,
  year: true,
  college: true,
  avatarUrl: true,
  bio: true,
  skills: true,
  isActive: true,
  emailVerifiedAt: true,
  notificationPrefs: true,
  createdAt: true,
  organizerProfile: { select: { status: true, organization: true } },
};

const extractToken = (req) => {
  const header = req.headers.authorization || '';
  return header.startsWith('Bearer ') ? header.slice(7) : null;
};

// Requires a valid token. The user is re-read from the DB so role changes / deletions apply immediately.
const authenticate = asyncHandler(async (req, res, next) => {
  const token = extractToken(req);
  if (!token) throw new HttpError(401, 'Authentication required');

  let payload;
  try {
    payload = verifyToken(token);
  } catch {
    throw new HttpError(401, 'Invalid or expired token');
  }

  const user = await prisma.user.findUnique({ where: { id: payload.sub }, select: userSelect });
  if (!user) throw new HttpError(401, 'Account no longer exists');
  if (!user.isActive) throw new HttpError(403, 'This account has been deactivated. Contact an administrator.');

  if (isReadOnlyDemoAdmin(user) && !['GET', 'HEAD', 'OPTIONS'].includes(req.method)) {
    throw new HttpError(403, 'The demo admin is read-only. You can look around but not change anything.');
  }

  req.user = user;
  next();
});

// When email delivery is set up, students and organisers must confirm their address before they
// register for events or create them. Admins are exempt so nobody can be locked out of the platform.
// Without SMTP nothing can be sent, so this check is skipped.
const requireVerifiedEmail = (req, res, next) => {
  if (mailConfigured() && req.user && req.user.role !== 'ADMIN' && !req.user.emailVerifiedAt) {
    return next(new HttpError(403, `Please verify your email first. We sent a link to ${req.user.email}. You can ask for a new one from your dashboard.`));
  }
  return next();
};

// Attaches req.user when a valid token is present, but never blocks the request.
const optionalAuth = asyncHandler(async (req, res, next) => {
  const token = extractToken(req);
  if (token) {
    try {
      const payload = verifyToken(token);
      const user = await prisma.user.findUnique({ where: { id: payload.sub }, select: userSelect });
      if (user && user.isActive) req.user = user;
    } catch {
      // ignore invalid tokens on public routes
    }
  }
  next();
});

module.exports = { requireVerifiedEmail, authenticate, optionalAuth, userSelect };
