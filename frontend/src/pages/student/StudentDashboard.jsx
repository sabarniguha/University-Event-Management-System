import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../../services/api.js';
import DashboardShell, { StatCard } from '../../components/DashboardShell.jsx';
import { Badge, EmptyState, ErrorBox, Loader } from '../../components/Ui.jsx';
import { errMsg, fmtDate } from '../../utils/format.js';

export default function StudentDashboard() {
  const [registrations, setRegistrations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(() => {
    return api
      .get('/registrations/me')
      .then((res) => setRegistrations(res.data.registrations))
      .catch((e) => setError(errMsg(e)))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(); }, [load]);

  const cancel = async (reg) => {
    if (!window.confirm(`Cancel your registration for "${reg.event.title}"?`)) return;
    setError('');
    try {
      await api.delete(`/registrations/${reg.event.id}`);
      await load();
    } catch (e) {
      setError(errMsg(e));
    }
  };

  const active = registrations.filter((r) => r.status === 'REGISTERED');
  const upcoming = active.filter((r) => new Date(r.event.endsAt) >= new Date());
  const attended = active.filter((r) => r.attendance?.status === 'PRESENT');

  return (
    <DashboardShell
      title="Student dashboard"
      subtitle="Your registrations and attendance history"
      actions={
        <>
          <Link to="/student/tickets" className="btn-outline">My tickets</Link>
          <Link to="/student/attendance" className="btn-outline">My attendance</Link>
          <Link to="/events" className="btn-primary">Find events</Link>
        </>
      }
    >
      <ErrorBox message={error} />

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard label="Active registrations" value={active.length} />
        <StatCard label="Upcoming events" value={upcoming.length} />
        <StatCard label="Events attended" value={attended.length} />
      </div>

      {loading ? (
        <Loader />
      ) : registrations.length === 0 ? (
        <EmptyState>
          You have not registered for any event yet. <Link to="/events" className="font-medium text-brand-600 hover:underline">Browse events</Link>
        </EmptyState>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
          <table className="min-w-full divide-y divide-slate-200">
            <thead className="bg-slate-50">
              <tr>
                <th className="th">Event</th>
                <th className="th">Date</th>
                <th className="th">Registration</th>
                <th className="th">Attendance</th>
                <th className="th" />
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {registrations.map((r) => (
                <tr key={r.id}>
                  <td className="td">
                    <Link to={`/events/${r.event.id}`} className="font-medium text-brand-700 hover:underline">{r.event.title}</Link>
                    <div className="text-xs text-slate-400">{r.event.venue}</div>
                  </td>
                  <td className="td">{fmtDate(r.event.startsAt)}</td>
                  <td className="td">
                    <Badge>{r.status}</Badge>
                    {r.status === 'WAITLISTED' && <span className="ml-2 text-xs text-slate-500">#{r.waitlistPosition}</span>}
                  </td>
                  <td className="td">
                    {r.status !== 'REGISTERED' ? '-' : r.attendance ? <Badge>{r.attendance.status}</Badge> : <span className="text-xs text-slate-400">Not marked</span>}
                  </td>
                  <td className="td text-right">
                    {r.status !== 'CANCELLED' && new Date(r.event.startsAt) > new Date() && (
                      <button className="btn-outline btn-sm" onClick={() => cancel(r)}>
                        {r.status === 'WAITLISTED' ? 'Leave waitlist' : 'Cancel'}
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </DashboardShell>
  );
}
