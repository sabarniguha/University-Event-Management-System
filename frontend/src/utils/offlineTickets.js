// Saves the student's current tickets on this device so the QR code still opens with no signal at the venue.
// Only what is printed on the ticket is kept. It is removed when the student signs out.
const PREFIX = 'unievents_tickets_';

export function saveTickets(userId, regs) {
  try {
    const tickets = regs
      .filter((r) => r.status === 'REGISTERED' && r.event && r.event.status !== 'CANCELLED' && new Date(r.event.endsAt) >= new Date())
      .map((r) => ({ id: r.id, ticketCode: r.ticketCode, title: r.event.title, startsAt: r.event.startsAt, endsAt: r.event.endsAt, venue: r.event.venue, eventId: r.event.id }));
    localStorage.setItem(`${PREFIX}${userId}`, JSON.stringify({ savedAt: new Date().toISOString(), tickets }));
  } catch { /* storage may be unavailable; online use is unaffected */ }
}

// Every saved set on this device (normally one). Expired tickets are dropped.
export function loadAllTickets() {
  const out = [];
  try {
    for (let i = 0; i < localStorage.length; i += 1) {
      const key = localStorage.key(i);
      if (!key || !key.startsWith(PREFIX)) continue;
      const data = JSON.parse(localStorage.getItem(key) || 'null');
      if (data && Array.isArray(data.tickets)) out.push(...data.tickets.filter((t) => new Date(t.endsAt) >= new Date()).map((t) => ({ ...t, savedAt: data.savedAt })));
    }
  } catch { /* ignore */ }
  return out;
}

export function clearSavedTickets() {
  try {
    Object.keys(localStorage).filter((k) => k.startsWith(PREFIX)).forEach((k) => localStorage.removeItem(k));
  } catch { /* ignore */ }
}
