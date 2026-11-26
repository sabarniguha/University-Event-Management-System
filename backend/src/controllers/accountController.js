const { z } = require('zod');
const bcrypt = require('bcryptjs');
const prisma = require('../utils/prismaClient');
const HttpError = require('../utils/httpError');
const asyncHandler = require('../utils/asyncHandler');
const { audit } = require('../utils/audit');
const { isDemoAccount } = require('../utils/demo');
const { buildExport, deleteStudent } = require('../utils/accountPrivacy');

// GET /api/account/export - my data as a JSON file
const exportMine = asyncHandler(async (req, res) => {
  const data = await buildExport(req.user.id);
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Content-Disposition', 'attachment; filename="my-unievents-data.json"');
  res.send(JSON.stringify(data, null, 2));
});

// POST /api/account/delete  { password, confirm: "DELETE" }
const deleteMine = asyncHandler(async (req, res) => {
  const { password, confirm } = z.object({ password: z.string().min(1).max(200), confirm: z.literal('DELETE') }).parse(req.body);
  if (req.user.role !== 'STUDENT') throw new HttpError(403, 'Organiser and admin accounts own events and records, so an admin must remove them. Ask your administrator.');
  if (isDemoAccount(req.user.email)) throw new HttpError(403, 'Demo accounts cannot be deleted');
  const me = await prisma.user.findUnique({ where: { id: req.user.id }, select: { passwordHash: true } });
  if (!me || !(await bcrypt.compare(password, me.passwordHash))) throw new HttpError(400, 'Your password is not correct');
  await audit(req, 'account.delete', 'User', req.user.id);
  await deleteStudent(req.user.id);
  res.json({ deleted: true });
});

module.exports = { exportMine, deleteMine };
