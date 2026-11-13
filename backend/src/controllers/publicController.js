const prisma = require('../utils/prismaClient');
const asyncHandler = require('../utils/asyncHandler');
const { getSettings, publicSettings } = require('../utils/settings');
const { newsletterSchema, contactSchema } = require('../utils/validators');

// GET /api/public/stats - real counts only, used by the home page
const stats = asyncHandler(async (req, res) => {
  const now = new Date();
  const [events, upcoming, students, registrations, certificates, categories] = await Promise.all([
    prisma.event.count({ where: { status: 'PUBLISHED' } }),
    prisma.event.count({ where: { status: 'PUBLISHED', endsAt: { gte: now } } }),
    prisma.user.count({ where: { role: 'STUDENT', isActive: true } }),
    prisma.registration.count({ where: { status: 'REGISTERED' } }),
    prisma.certificate.count({ where: { revokedAt: null } }),
    prisma.eventCategory.count(),
  ]);
  res.json({ events, upcoming, students, registrations, certificates, categories });
});

// "Alice K." - never expose a full name or email on a public page.
const shortName = (name) => {
  const parts = String(name || 'Student').trim().split(/\s+/);
  return parts.length > 1 ? `${parts[0]} ${parts[parts.length - 1][0]}.` : parts[0];
};

// GET /api/public/highlights - testimonials and highlights built from real feedback and finished events
const highlights = asyncHandler(async (req, res) => {
  const [feedback, finished] = await Promise.all([
    prisma.feedback.findMany({
      where: { rating: { gte: 4 }, comment: { not: null }, event: { status: 'PUBLISHED' } },
      orderBy: { createdAt: 'desc' },
      take: 6,
      select: {
        rating: true,
        comment: true,
        user: { select: { name: true, department: true } },
        event: { select: { id: true, title: true } },
      },
    }),
    prisma.event.findMany({
      where: { status: 'PUBLISHED', endsAt: { lt: new Date() } },
      orderBy: { endsAt: 'desc' },
      take: 3,
      select: {
        id: true, title: true, category: true, bannerUrl: true, endsAt: true,
        _count: { select: { registrations: { where: { status: 'REGISTERED' } } } },
      },
    }),
  ]);

  res.json({
    testimonials: feedback
      .filter((f) => f.comment && f.comment.trim().length > 0)
      .map((f) => ({
        rating: f.rating,
        comment: f.comment,
        name: shortName(f.user.name),
        department: f.user.department,
        eventId: f.event.id,
        eventTitle: f.event.title,
      })),
    highlights: finished.map((e) => ({
      id: e.id, title: e.title, category: e.category, bannerUrl: e.bannerUrl, endedAt: e.endsAt, attendees: e._count.registrations,
    })),
  });
});

const settings = asyncHandler(async (req, res) => {
  res.json({ settings: publicSettings(await getSettings()) });
});

// POST /api/public/newsletter
const subscribe = asyncHandler(async (req, res) => {
  const { email } = newsletterSchema.parse(req.body);
  await prisma.newsletterSubscriber.upsert({ where: { email }, update: {}, create: { email } });
  // Same answer whether or not the address was already subscribed.
  res.status(201).json({ message: 'Thanks for subscribing!' });
});

// POST /api/public/contact
const contact = asyncHandler(async (req, res) => {
  const data = contactSchema.parse(req.body);
  await prisma.contactMessage.create({ data });
  res.status(201).json({ message: 'Thanks! We received your message and will get back to you.' });
});

module.exports = { stats, highlights, settings, subscribe, contact };
