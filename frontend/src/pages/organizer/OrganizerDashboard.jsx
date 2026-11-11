import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../../services/api.js';
import { useAuth } from '../../context/AuthContext.jsx';
import DashboardShell, { StatCard } from '../../components/DashboardShell.jsx';
import { Badge, EmptyState, ErrorBox, Loader } from '../../components/Ui.jsx';
import { errMsg, fmtDate } from '../../utils/format.js';

export default function OrganizerDashboard() {
  const { user } = useAuth();
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(() => {
    return api
      .get('/events/mine')
      .then((res) => setEvents(res.data.events))
      .catch((e) => setError(errMsg(e)))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(); }, [load]);

  const setStatus = async (event, status) => {
    setError('');
    try {
      await api.patch(`/events/${event.id}`, { status });
      await load();
    } catch (e) {
      setError(errMsg(e));
    }
  };

  const duplicate = async (event) => {
    setError('');
    try {
      await api.post(`/events/${event.id}/duplicate`);
      await load();
    } catch (e) {
      setError(errMsg(e));
    }
  };

  const remove = async (event) => {
    if (!window.confirm(`Delete "${event.title}" and all of its registrations? This cannot be undone.`)) return;
    setError('');
    try {
      await api.delete(`/events/${event.id}`);
      await load();
    } catch (e) {
      setError(errMsg(e));
    }
  };

  const published = events.filter((e) => e.status === 'PUBLISHED').length;
  const totalRegs = events.reduce((sum, e) => sum + (e.registeredCount || 0), 0);

  return (
    <DashboardShell
      title="Organiser dashboard"
      subtitle={user.role === 'ADMIN' ? 'Showing all events (admin view)' : 'Create and manage your events'}
      actions={
        <>
          <Link to="/organizer/attendance" className="btn-outline">Attendance overview</Link>
          <Link to="/announcements" className="btn-outline">Announcements</Link>
          <Link to="/organizer/events/new" className="btn-primary">New event</Link>
        </>
      }
    >
      <ErrorBox message={error} />

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard label="Total events" value={events.length} />
        <StatCard label="Published" value={published} />
        <StatCard label="Registrations" value={totalRegs} />
      </div>

      {loading ? (
        <Loader />
      ) : events.length === 0 ? (
        <EmptyState>You have not created any events yet.</EmptyState>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
          <table className="min-w-full divide-y divide-slate-200">
            <thead className="bg-slate-50">
              <tr>
                <th className="th">Event</th>
                <th className="th">Date</th>
                <th className="th">Status</th>
                <th className="th">Seats</th>
                <th className="th">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {events.map((e) => (
                <tr key={e.id}>
                  <td className="td">
                    <Link to={`/events/${e.id}`} className="font-medium text-brand-700 hover:underline">{e.title}</Link>
                    {user.role === 'ADMIN' && <div className="text-xs text-slate-400">by {e.organizer?.name}</div>}
                  </td>
                  <td className="td">{fmtDate(e.startsAt)}</td>
                  <td className="td"><Badge>{e.status}</Badge></td>
                  <td className="td">{e.registeredCount} / {e.capacity}</td>
                  <td className="td">
                    <div className="flex flex-wrap gap-2">
                      <Link to={`/organizer/events/${e.id}/attendance`} className="btn-primary btn-sm">Attendance</Link>
                      <Link to={`/organizer/events/${e.id}/attendees`} className="btn-outline btn-sm">Participants</Link>
                      <Link to={`/organizer/events/${e.id}/feedback`} className="btn-outline btn-sm">Feedback</Link>
                      <button className="btn-outline btn-sm" onClick={() => duplicate(e)}>Duplicate</button>
                      <Link to={`/organizer/events/${e.id}/edit`} className="btn-outline btn-sm">Edit</Link>
                      {e.status === 'DRAFT' && <button className="btn-outline btn-sm" onClick={() => setStatus(e, 'PUBLISHED')}>Publish</button>}
                      {e.status === 'PUBLISHED' && <button className="btn-outline btn-sm" onClick={() => setStatus(e, 'DRAFT')}>Unpublish</button>}
                      {e.status !== 'CANCELLED' && <button className="btn-outline btn-sm" onClick={() => setStatus(e, 'CANCELLED')}>Cancel</button>}
                      <button className="btn-danger btn-sm" onClick={() => remove(e)}>Delete</button>
                    </div>
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
