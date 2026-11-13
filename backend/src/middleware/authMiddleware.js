const prisma = require('../utils/prismaClient');
const { verifyToken } = require('../utils/jwt');
const HttpError = require('../utils/httpError');
const asyncHandler = require('../utils/asyncHandler');

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

  req.user = user;
  next();
});

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

module.exports = { authenticate, optionalAuth, userSelect };
