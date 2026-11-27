const prisma = require('./prismaClient');
const { notify } = require('./notify');
const { promoteWaitlist } = require('./waitlist');

// Seats offered from the waitlist that nobody confirmed in time go back to the queue.
// Safe to run often: each claim is handled in its own transaction and removed when done.
async function expireClaims(now = new Date()) {
  const due = await prisma.waitlistClaim.findMany({
    where: { confirmedAt: null, deadline: { lte: now } },
    include: { registration: { include: { event: { select: { id: true, title: true, endsAt: true } } } } },
    take: 200,
  });
  for (const c of due) {
    const reg = c.registration;
    // eslint-disable-next-line no-await-in-loop
    await prisma.$transaction(async (tx) => {
      const gone = await tx.waitlistClaim.deleteMany({ where: { id: c.id, confirmedAt: null } });
      if (gone.count === 0) return; // confirmed or removed in the meantime
      if (reg.status !== 'REGISTERED' || reg.event.endsAt < now) return; // student already cancelled, or the event is over
      await tx.registration.update({ where: { id: reg.id }, data: { status: 'CANCELLED', decisionNote: 'Did not confirm the waitlist seat in time' } });
      await tx.attendance.deleteMany({ where: { registrationId: reg.id } });
      await notify(tx, reg.userId, { title: 'Seat released', message: `You did not confirm your seat for "${reg.event.title}" in time, so it went to the next student. You can join the waitlist again if the event is still open.`, link: '/student/registrations', type: 'WAITLIST' });
      await promoteWaitlist(tx, reg.eventId);
    }, { isolationLevel: 'Serializable' }).catch((e) => console.error('[waitlistClaims] could not release a seat:', e.message));
  }
}

let timer = null;
function startClaimJob() {
  if (timer) return;
  const run = () => expireClaims().catch((e) => console.error('[waitlistClaims] failed:', e.message));
  setTimeout(run, 75 * 1000);
  timer = setInterval(run, 5 * 60 * 1000);
  timer.unref();
}

module.exports = { expireClaims, startClaimJob };
