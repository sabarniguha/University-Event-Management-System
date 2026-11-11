import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../../services/api.js';
import DashboardShell from '../../components/DashboardShell.jsx';
import QrCode from '../../components/QrCode.jsx';
import { Badge, EmptyState, ErrorBox, Loader } from '../../components/Ui.jsx';
import { errMsg, fmtDate } from '../../utils/format.js';

export default function MyTickets() {
  const [regs, setRegs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    api
      .get('/registrations/me')
      .then((res) => setRegs(res.data.registrations))
      .catch((e) => setError(errMsg(e)))
      .finally(() => setLoading(false));
  }, []);

  const now = new Date();
  const live = (r) => r.event.status !== 'CANCELLED' && new Date(r.event.endsAt) >= now;
  const tickets = regs.filter((r) => r.status === 'REGISTERED' && live(r));
  const waitlist = regs.filter((r) => r.status === 'WAITLISTED' && live(r));

  return (
    <DashboardShell
      title="My tickets"
      subtitle="Show the QR code at the venue. The organiser scans it to mark your attendance."
      actions={<Link to="/student/attendance" className="btn-outline">My attendance</Link>}
    >
      <ErrorBox message={error} />

      {loading ? (
        <Loader />
      ) : tickets.length === 0 && waitlist.length === 0 ? (
        <EmptyState>
          No upcoming tickets. <Link to="/events" className="font-medium text-brand-600 hover:underline">Browse events</Link>
        </EmptyState>
      ) : (
        <>
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {tickets.map((r) => (
              <div key={r.id} className="card flex flex-col items-center text-center">
                <QrCode value={`UEMS:${r.ticketCode}`} size={176} />
                <Link to={`/events/${r.event.id}`} className="mt-4 text-lg font-semibold text-brand-700 hover:underline">
                  {r.event.title}
                </Link>
                <p className="mt-1 text-sm text-slate-500">{fmtDate(r.event.startsAt)}</p>
                <p className="text-sm text-slate-500">{r.event.venue}</p>
                <div className="mt-3 flex items-center gap-2">
                  <Badge>REGISTERED</Badge>
                  {r.attendance?.status === 'PRESENT' && <Badge>PRESENT</Badge>}
                </div>
                <p className="mt-3 break-all font-mono text-[11px] text-slate-400">{r.ticketCode}</p>
              </div>
            ))}
          </div>

          {waitlist.length > 0 && (
            <section>
              <h2 className="mb-3 text-lg font-semibold">On the waitlist</h2>
              <div className="grid gap-4 sm:grid-cols-2">
                {waitlist.map((r) => (
                  <div key={r.id} className="card flex items-center justify-between gap-3">
                    <div>
                      <Link to={`/events/${r.event.id}`} className="font-medium text-brand-700 hover:underline">{r.event.title}</Link>
                      <p className="text-xs text-slate-400">{fmtDate(r.event.startsAt)}</p>
                    </div>
                    <div className="text-right">
                      <Badge>WAITLISTED</Badge>
                      <p className="mt-1 text-xs text-slate-500">Position #{r.waitlistPosition}</p>
                    </div>
                  </div>
                ))}
              </div>
              <p className="mt-2 text-xs text-slate-400">You will get a notification and a QR pass automatically if a seat opens up.</p>
            </section>
          )}
        </>
      )}
    </DashboardShell>
  );
}
