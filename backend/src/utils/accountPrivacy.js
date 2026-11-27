const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const prisma = require('./prismaClient');
const { promoteWaitlist } = require('./waitlist');
const { refundOnCancel } = require('./cancelRefund');

const iso = (d) => (d ? new Date(d).toISOString() : null);

// Everything the app holds about one person, as plain JSON they can keep.
async function buildExport(userId) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, name: true, email: true, role: true, department: true, phone: true, studentId: true, year: true, college: true, bio: true, skills: true, emailVerifiedAt: true, createdAt: true, lastLoginAt: true, notificationPrefs: true },
  });
  const [registrations, feedback, payments, notifications, answers, follows, teams] = await Promise.all([
    prisma.registration.findMany({
      where: { userId }, orderBy: { createdAt: 'asc' },
      select: { id: true, status: true, ticketCode: true, createdAt: true, event: { select: { title: true, startsAt: true, endsAt: true, venue: true } }, attendance: { select: { status: true, method: true, checkedInAt: true } }, certificate: { select: { certificateId: true, issuedAt: true, revokedAt: true } } },
    }),
    prisma.feedback.findMany({ where: { userId }, select: { rating: true, comment: true, createdAt: true, event: { select: { title: true } } } }),
    prisma.payment.findMany({ where: { userId }, select: { amount: true, currency: true, status: true, paidAt: true, createdAt: true, event: { select: { title: true } } } }),
    prisma.notification.findMany({ where: { userId }, orderBy: { createdAt: 'desc' }, take: 500, select: { title: true, message: true, createdAt: true, readAt: true } }),
    prisma.eventAnswer.findMany({ where: { userId }, select: { value: true, updatedAt: true, question: { select: { label: true, event: { select: { title: true } } } } } }),
    prisma.organizerFollow.findMany({ where: { followerId: userId }, select: { createdAt: true, organizer: { select: { name: true } } } }),
    prisma.eventTeamMember.findMany({ where: { userId }, select: { team: { select: { name: true, event: { select: { title: true } } } } } }),
  ]);
  return {
    exportedAt: new Date().toISOString(),
    note: 'This is the personal data UniEvents holds about you.',
    profile: { ...user, emailVerifiedAt: iso(user.emailVerifiedAt), createdAt: iso(user.createdAt), lastLoginAt: iso(user.lastLoginAt) },
    registrations, feedback, payments: payments.map((p) => ({ ...p, amountRupees: p.amount / 100 })), notifications,
    surveyAnswers: answers, following: follows, teams,
  };
}

// Removes a student's personal details but keeps what other records depend on (certificate and report IDs, counts, payments).
// The account can no longer sign in. Future seats are cancelled first so other students can take them.
async function deleteStudent(userId) {
  const now = new Date();
  const upcoming = await prisma.registration.findMany({
    where: { userId, status: { in: ['REGISTERED', 'WAITLISTED', 'PENDING', 'AWAITING_PAYMENT'] }, event: { startsAt: { gt: now } } },
    include: { event: true },
  });
  for (const r of upcoming) {
    await prisma.$transaction(async (tx) => {
      await tx.registration.update({ where: { id: r.id }, data: { status: 'CANCELLED' } });
      if (r.status === 'REGISTERED') await promoteWaitlist(tx, r.eventId);
    });
    await refundOnCancel(r, r.event);
  }
  const placeholder = `deleted-${userId}-${crypto.randomBytes(4).toString('hex')}@deleted.invalid`;
  const passwordHash = await bcrypt.hash(crypto.randomBytes(24).toString('hex'), 10);
  await prisma.$transaction([
    prisma.notification.deleteMany({ where: { userId } }),
    prisma.pushSubscription.deleteMany({ where: { userId } }),
    prisma.authToken.deleteMany({ where: { userId } }),
    prisma.organizerFollow.deleteMany({ where: { OR: [{ followerId: userId }, { organizerId: userId }] } }),
    prisma.eventStaff.deleteMany({ where: { userId } }),
    prisma.eventAnswer.deleteMany({ where: { userId } }),
    prisma.eventQA.deleteMany({ where: { askerId: userId } }),
    prisma.organizerProfile.deleteMany({ where: { userId } }),
    prisma.feedback.updateMany({ where: { userId }, data: { comment: null } }),
    prisma.certificate.updateMany({ where: { userId }, data: { recipientName: null } }),
    prisma.mediaFile.deleteMany({ where: { ownerId: userId } }),
    prisma.user.update({
      where: { id: userId },
      data: {
        name: 'Deleted user', email: placeholder, passwordHash, phone: null, studentId: null, year: null, college: null, department: null, avatarUrl: null, bio: null,
        skills: [], isActive: false, emailVerifiedAt: null, notificationPrefs: null, twoFactorSecretEnc: null, twoFactorEnabledAt: null, twoFactorBackup: null,
      },
    }),
  ]);
}

module.exports = { buildExport, deleteStudent };
