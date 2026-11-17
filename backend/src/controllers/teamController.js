const crypto = require('crypto');
const { z } = require('zod');
const prisma = require('../utils/prismaClient');
const HttpError = require('../utils/httpError');
const asyncHandler = require('../utils/asyncHandler');
const { parseId } = require('../utils/validators');
const { loadManagedEvent } = require('../utils/access');
const { notify } = require('../utils/notify');
const { audit } = require('../utils/audit');
const { toCsv, safeFilename } = require('../utils/csv');

// A team belongs to a team event. Each member registers for the event the normal way first
// (so fees, approval, tickets, attendance and certificates all work per person), then joins a team.
const ACTIVE = ['REGISTERED', 'PENDING', 'WAITLISTED', 'AWAITING_PAYMENT'];
const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // no look-alike characters
const newInviteCode = () => Array.from({ length: 6 }, () => ALPHABET[crypto.randomInt(ALPHABET.length)]).join('');

const createSchema = z.object({
  eventId: z.coerce.number().int().positive(),
  name: z.string().trim().min(2, 'Give your team a name').max(60),
});
const joinSchema = z.object({ code: z.string().trim().toUpperCase().regex(/^[A-Z0-9]{6}$/, 'Enter the 6-character team code') });

const teamInclude = { members: { include: { user: { select: { id: true, name: true, department: true, studentId: true } } }, orderBy: { joinedAt: 'asc' } } };

async function present(team, event) {
  const regs = await prisma.registration.findMany({
    where: { eventId: team.eventId, userId: { in: team.members.map((m) => m.userId) } },
    select: { userId: true, status: true },
  });
  const status = new Map(regs.map((r) => [r.userId, r.status]));
  const members = team.members.map((m) => ({
    userId: m.userId,
    name: m.user.name,
    department: m.user.department,
    studentId: m.user.studentId,
    isLeader: m.userId === team.leaderId,
    registrationStatus: status.get(m.userId) || 'NONE',
  }));
  const confirmed = members.filter((m) => m.registrationStatus === 'REGISTERED').length;
  return {
    id: team.id,
    eventId: team.eventId,
    name: team.name,
    leaderId: team.leaderId,
    inviteCode: team.inviteCode,
    members,
    size: members.length,
    teamMin: event.teamMin,
    teamMax: event.teamMax,
    complete: confirmed >= event.teamMin,
  };
}

async function loadTeamEvent(eventId) {
  const event = await prisma.event.findUnique({ where: { id: eventId } });
  if (!event || event.status !== 'PUBLISHED') throw new HttpError(404, 'Event not found');
  if (event.teamMax < 2) throw new HttpError(400, 'This is not a team event');
  if (event.endsAt < new Date()) throw new HttpError(400, 'This event has already ended');
  return event;
}

async function requireActiveRegistration(eventId, userId) {
  const reg = await prisma.registration.findUnique({ where: { eventId_userId: { eventId, userId } } });
  if (!reg || !ACTIVE.includes(reg.status)) throw new HttpError(403, 'Register for the event first, then create or join a team.');
}

// GET /api/teams/event/:eventId/mine  (students)
const mine = asyncHandler(async (req, res) => {
  const eventId = parseId(req.params.eventId, 'event id');
  const event = await prisma.event.findUnique({ where: { id: eventId } });
  if (!event) throw new HttpError(404, 'Event not found');
  const membership = await prisma.eventTeamMember.findUnique({
    where: { eventId_userId: { eventId, userId: req.user.id } },
    include: { team: { include: teamInclude } },
  });
  res.json({ team: membership ? await present(membership.team, event) : null });
});

// POST /api/teams  (students)
const create = asyncHandler(async (req, res) => {
  const { eventId, name } = createSchema.parse(req.body);
  const event = await loadTeamEvent(eventId);
  await requireActiveRegistration(eventId, req.user.id);

  let team;
  for (let attempt = 0; attempt < 5 && !team; attempt += 1) {
    try {
      // eslint-disable-next-line no-await-in-loop
      team = await prisma.$transaction(async (tx) => {
        if (await tx.eventTeamMember.findUnique({ where: { eventId_userId: { eventId, userId: req.user.id } } })) {
          throw new HttpError(409, 'You are already in a team for this event');
        }
        const t = await tx.eventTeam.create({ data: { eventId, name, leaderId: req.user.id, inviteCode: newInviteCode() } });
        await tx.eventTeamMember.create({ data: { teamId: t.id, eventId, userId: req.user.id } });
        return tx.eventTeam.findUnique({ where: { id: t.id }, include: teamInclude });
      });
    } catch (e) {
      if (e instanceof HttpError) throw e;
      if (e.code === 'P2002' && /name/i.test(String(e.meta?.target))) throw new HttpError(409, 'Another team already uses this name. Pick a different one.');
      if (e.code !== 'P2002') throw e; // P2002 on inviteCode: try another code
    }
  }
  if (!team) throw new HttpError(500, 'Could not create the team. Please try again.');
  res.status(201).json({ team: await present(team, event) });
});

// POST /api/teams/join  (students)
const join = asyncHandler(async (req, res) => {
  const { code } = joinSchema.parse(req.body);
  const found = await prisma.eventTeam.findUnique({ where: { inviteCode: code } });
  if (!found) throw new HttpError(404, 'No team has this code');
  const event = await loadTeamEvent(found.eventId);
  await requireActiveRegistration(found.eventId, req.user.id);

  const team = await prisma.$transaction(
    async (tx) => {
      if (await tx.eventTeamMember.findUnique({ where: { eventId_userId: { eventId: found.eventId, userId: req.user.id } } })) {
        throw new HttpError(409, 'You are already in a team for this event');
      }
      const size = await tx.eventTeamMember.count({ where: { teamId: found.id } });
      if (size >= event.teamMax) throw new HttpError(409, `This team is full (${event.teamMax} members)`);
      await tx.eventTeamMember.create({ data: { teamId: found.id, eventId: found.eventId, userId: req.user.id } });
      return tx.eventTeam.findUnique({ where: { id: found.id }, include: teamInclude });
    },
    { isolationLevel: 'Serializable' }
  );
  await notify(prisma, [team.leaderId], { title: 'Someone joined your team', message: `${req.user.name} joined "${team.name}" for "${event.title}".`, link: `/events/${event.id}`, type: 'TEAM' });
  res.json({ team: await present(team, event) });
});

async function loadOwnTeam(req) {
  const id = parseId(req.params.id, 'team id');
  const team = await prisma.eventTeam.findUnique({ where: { id }, include: teamInclude });
  if (!team) throw new HttpError(404, 'Team not found');
  return team;
}

// POST /api/teams/:id/leave  (members who are not the leader)
const leave = asyncHandler(async (req, res) => {
  const team = await loadOwnTeam(req);
  if (!team.members.some((m) => m.userId === req.user.id)) throw new HttpError(404, 'You are not in this team');
  if (team.leaderId === req.user.id) throw new HttpError(400, 'The team leader cannot leave. Disband the team instead.');
  await prisma.eventTeamMember.delete({ where: { eventId_userId: { eventId: team.eventId, userId: req.user.id } } });
  await notify(prisma, [team.leaderId], { title: 'A member left your team', message: `${req.user.name} left "${team.name}".`, link: `/events/${team.eventId}`, type: 'TEAM' });
  res.json({ ok: true });
});

// DELETE /api/teams/:id  (leader) - disband
const disband = asyncHandler(async (req, res) => {
  const team = await loadOwnTeam(req);
  if (team.leaderId !== req.user.id) throw new HttpError(403, 'Only the team leader can disband the team');
  await prisma.eventTeam.delete({ where: { id: team.id } });
  await notify(prisma, team.members.filter((m) => m.userId !== req.user.id).map((m) => m.userId), { title: 'Team disbanded', message: `"${team.name}" was disbanded by its leader. You can join or create another team.`, link: `/events/${team.eventId}`, type: 'TEAM' });
  res.json({ ok: true });
});

// DELETE /api/teams/:id/members/:userId  (leader)
const removeMember = asyncHandler(async (req, res) => {
  const team = await loadOwnTeam(req);
  const userId = parseId(req.params.userId, 'user id');
  if (team.leaderId !== req.user.id) throw new HttpError(403, 'Only the team leader can remove members');
  if (userId === team.leaderId) throw new HttpError(400, 'The leader cannot be removed');
  const done = await prisma.eventTeamMember.deleteMany({ where: { teamId: team.id, userId } });
  if (done.count === 0) throw new HttpError(404, 'That student is not in this team');
  await notify(prisma, [userId], { title: 'Removed from a team', message: `You were removed from "${team.name}".`, link: `/events/${team.eventId}`, type: 'TEAM' });
  res.json({ ok: true });
});

// GET /api/teams/event/:eventId  (organiser/admin of the event)
const forEvent = asyncHandler(async (req, res) => {
  const eventId = parseId(req.params.eventId, 'event id');
  const event = await loadManagedEvent(eventId, req.user);
  const teams = await prisma.eventTeam.findMany({ where: { eventId }, orderBy: { createdAt: 'asc' }, include: teamInclude });
  const shaped = [];
  for (const t of teams) shaped.push(await present(t, event)); // eslint-disable-line no-await-in-loop
  res.json({ event: { id: event.id, title: event.title, teamMin: event.teamMin, teamMax: event.teamMax }, teams: shaped });
});

// GET /api/teams/event/:eventId/export  (organiser/admin)
const exportCsv = asyncHandler(async (req, res) => {
  const eventId = parseId(req.params.eventId, 'event id');
  const event = await loadManagedEvent(eventId, req.user);
  const teams = await prisma.eventTeam.findMany({ where: { eventId }, orderBy: { createdAt: 'asc' }, include: teamInclude });
  const rows = [];
  for (const t of teams) {
    const p = await present(t, event); // eslint-disable-line no-await-in-loop
    for (const m of p.members) rows.push([p.name, m.isLeader ? 'Leader' : 'Member', m.name, m.studentId, m.department, m.registrationStatus, p.complete ? 'Yes' : 'No']);
  }
  await audit(req, 'team.export', 'Event', eventId, { teams: teams.length });
  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename="teams_${safeFilename(event.title)}.csv"`);
  res.send(toCsv(['Team', 'Role', 'Name', 'Student ID', 'Department', 'Registration status', 'Team complete'], rows));
});

module.exports = { mine, create, join, leave, disband, removeMember, forEvent, exportCsv };
