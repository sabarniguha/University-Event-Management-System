const bcrypt = require('bcryptjs');
const prisma = require('../utils/prismaClient');
const HttpError = require('../utils/httpError');
const asyncHandler = require('../utils/asyncHandler');
const { signToken } = require('../utils/jwt');
const { userSelect } = require('../middleware/authMiddleware');
const { registerSchema, loginSchema, profileSchema } = require('../utils/validators');

// Public sign-up always creates a STUDENT. Admins promote users to ORGANIZER/ADMIN.
const register = asyncHandler(async (req, res) => {
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
      role: 'STUDENT',
    },
    select: userSelect,
  });

  res.status(201).json({ token: signToken(user), user });
});

const login = asyncHandler(async (req, res) => {
  const { email, password } = loginSchema.parse(req.body);

  const user = await prisma.user.findUnique({ where: { email } });
  // Same message for unknown email and wrong password to avoid account enumeration.
  const ok = user && (await bcrypt.compare(password, user.passwordHash));
  if (!ok) throw new HttpError(401, 'Invalid email or password');

  const { passwordHash, ...safeUser } = user;
  res.json({ token: signToken(user), user: { id: safeUser.id, name: safeUser.name, email: safeUser.email, role: safeUser.role, department: safeUser.department, phone: safeUser.phone } });
});

const me = asyncHandler(async (req, res) => {
  res.json({ user: req.user });
});

const updateMe = asyncHandler(async (req, res) => {
  const data = profileSchema.parse(req.body);
  const user = await prisma.user.update({ where: { id: req.user.id }, data, select: userSelect });
  res.json({ user });
});

module.exports = { register, login, me, updateMe };
