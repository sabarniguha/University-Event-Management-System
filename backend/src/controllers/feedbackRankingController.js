const prisma = require('../utils/prismaClient');
const asyncHandler = require('../utils/asyncHandler');

const round1 = (n) => Math.round(n * 10) / 10;

// Turns per-event rating totals into a ranked list plus a per-organiser summary. Pure, so it is easy to test.
function buildRanking(groups, events) {
  const byId = new Map(events.map((e) => [e.id, e]));
  const events_ = [];
  const orgs = new Map();
  for (const g of groups) {
    const e = byId.get(g.eventId);
    if (!e) continue;
    const count = g._count._all;
    const average = round1(g._avg.rating);
    events_.push({ eventId: e.id, title: e.title, startsAt: e.startsAt, organizer: e.organizer?.name || '', average, count });
    const o = orgs.get(e.organizerId) || { organizerId: e.organizerId, organizer: e.organizer?.name || '', sum: 0, count: 0, events: 0 };
    o.sum += g._avg.rating * count; o.count += count; o.events += 1;
    orgs.set(e.organizerId, o);
  }
  events_.sort((a, b) => b.average - a.average || b.count - a.count || a.title.localeCompare(b.title));
  const organizers = [...orgs.values()]
    .map((o) => ({ organizerId: o.organizerId, organizer: o.organizer, events: o.events, count: o.count, average: round1(o.sum / o.count) }))
    .sort((a, b) => b.average - a.average || b.count - a.count);
  return { events: events_, organizers };
}

// GET /api/feedback/ranking  (admin) - events and organisers ranked by student ratings
const ranking = asyncHandler(async (req, res) => {
  const groups = await prisma.feedback.groupBy({ by: ['eventId'], _avg: { rating: true }, _count: { _all: true } });
  const events = groups.length
    ? await prisma.event.findMany({ where: { id: { in: groups.map((g) => g.eventId) } }, select: { id: true, title: true, startsAt: true, organizerId: true, organizer: { select: { name: true } } } })
    : [];
  const out = buildRanking(groups, events);
  res.json({ events: out.events.slice(0, 100), organizers: out.organizers.slice(0, 50), totalReviews: groups.reduce((a, g) => a + g._count._all, 0) });
});

module.exports = { ranking, buildRanking };
