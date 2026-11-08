const prisma = require('../utils/prismaClient');
const HttpError = require('../utils/httpError');
const asyncHandler = require('../utils/asyncHandler');
const { parseId, announcementSchema, announcementUpdateSchema } = require('../utils/validators');

const include = { author: { select: { id: true, name: true, role: true } }, event: { select: { id: true, title: true } } };

// What each role is allowed to see.
const visibleWhere = (user) => {
  if (user.role === 'ADMIN') return {};
  if (user.role === 'ORGANIZER') {
    return {
      OR: [{ status: 'PUBLISHED', audience: { in: ['ALL', 'ORGANIZERS'] } }, { authorId: user.id }],
    };
  }
  return { status: 'PUBLISHED', audience: { in: ['ALL', 'STUDENTS'] } };
};

const withPublishDate = (data) => {
  if (data.status === 'PUBLISHED') return { ...data, publishedAt: new Date() };
  if (data.status === 'DRAFT') return { ...data, publishedAt: null };
  return data;
};

// GET /api/announcements/public  (no login) - latest university-wide notices
const publicAnnouncements = asyncHandler(async (req, res) => {
  const announcements = await prisma.announcement.findMany({
    where: { status: 'PUBLISHED', audience: 'ALL' },
    orderBy: { publishedAt: 'desc' },
    take: 5,
    include,
  });
  res.json({ announcements });
});

// GET /api/announcements
const listAnnouncements = asyncHandler(async (req, res) => {
  const announcements = await prisma.announcement.findMany({
    where: visibleWhere(req.user),
    orderBy: [{ createdAt: 'desc' }],
    include,
  });
  res.json({ announcements });
});

const loadEditable = async (id, user) => {
  const existing = await prisma.announcement.findUnique({ where: { id } });
  if (!existing) throw new HttpError(404, 'Announcement not found');
  if (user.role !== 'ADMIN' && existing.authorId !== user.id) {
    throw new HttpError(403, 'You can only change your own announcements');
  }
  return existing;
};

const assertEventAllowed = async (eventId, user) => {
  if (!eventId) return;
  const event = await prisma.event.findUnique({ where: { id: eventId } });
  if (!event) throw new HttpError(400, 'Linked event does not exist');
  if (user.role !== 'ADMIN' && event.organizerId !== user.id) {
    throw new HttpError(403, 'You can only link announcements to your own events');
  }
};

const createAnnouncement = asyncHandler(async (req, res) => {
  const data = announcementSchema.parse(req.body);
  await assertEventAllowed(data.eventId, req.user);

  const announcement = await prisma.announcement.create({
    data: { ...withPublishDate(data), authorId: req.user.id },
    include,
  });
  res.status(201).json({ announcement });
});

const updateAnnouncement = asyncHandler(async (req, res) => {
  const id = parseId(req.params.id);
  const existing = await loadEditable(id, req.user);
  const data = announcementUpdateSchema.parse(req.body);
  await assertEventAllowed(data.eventId, req.user);

  // Only stamp publishedAt when the status actually flips to PUBLISHED.
  const payload = { ...data };
  if (data.status === 'PUBLISHED' && existing.status !== 'PUBLISHED') payload.publishedAt = new Date();
  if (data.status === 'DRAFT') payload.publishedAt = null;

  const announcement = await prisma.announcement.update({ where: { id }, data: payload, include });
  res.json({ announcement });
});

const deleteAnnouncement = asyncHandler(async (req, res) => {
  const id = parseId(req.params.id);
  await loadEditable(id, req.user);
  await prisma.announcement.delete({ where: { id } });
  res.json({ message: 'Announcement deleted' });
});

module.exports = {
  publicAnnouncements,
  listAnnouncements,
  createAnnouncement,
  updateAnnouncement,
  deleteAnnouncement,
};
