import { useCallback, useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import api from '../../services/api.js';
import DashboardShell, { StatCard } from '../../components/DashboardShell.jsx';
import { Badge, EmptyState, ErrorBox, Loader } from '../../components/Ui.jsx';
import { errMsg, fmtDate } from '../../utils/format.js';

export default function EventAttendees() {
  const { id } = useParams();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showCancelled, setShowCancelled] = useState(false);

  const load = useCallback(() => {
    return api
      .get(`/registrations/event/${id}`)
      .then((res) => setData(res.data))
      .catch((e) => setError(errMsg(e)))
      .finally(() => setLoading(false));
  }, [id]);

  useEffect(() => { load(); }, [load]);

  const mark = async (registrationId, status) => {
    setError('');
    try {
      await api.post('/attendance', { registrationId, status });
      await load();
    } catch (e) {
      setError(errMsg(e));
    }
  };

  // The CSV endpoint needs the auth header, so download it through axios instead of a plain link.
  const exportCsv = async () => {
    setError('');
    try {
      const res = await api.get(`/registrations/event/${id}/export`, { responseType: 'blob' });
      const url = URL.createObjectURL(res.data);
      const a = document.createElement('a');
      a.href = url;
      a.download = `participants_event_${id}.csv`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (e) {
      setError('Could not export the participant list');
    }
  };

  if (loading) return <Loader />;
  if (!data) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-12">
        <ErrorBox message={error || 'Event not found'} />
        <Link to="/organizer" className="mt-4 inline-block text-sm text-brand-600 hover:underline">← Back to dashboard</Link>
      </div>
    );
  }

  const { event, participants, summary } = data;
  const rows = showCancelled ? participants : participants.filter((p) => p.status === 'REGISTERED');

  return (
    <DashboardShell
      title={event.title}
      subtitle={`${fmtDate(event.startsAt)} · ${event.venue}`}
      actions={
        <>
          <Link to="/organizer" className="btn-outline">Back</Link>
          <button className="btn-primary" onClick={exportCsv}>Export CSV</button>
        </>
      }
    >
      <ErrorBox message={error} />

      <div className="grid gap-4 sm:grid-cols-4">
        <StatCard label="Registered" value={`${summary.registered} / ${summary.capacity}`} />
        <StatCard label="Present" value={summary.present} />
        <StatCard label="Absent" value={summary.absent} />
        <StatCard label="Cancelled" value={summary.cancelled} />
      </div>

      <label className="flex items-center gap-2 text-sm text-slate-600">
        <input type="checkbox" checked={showCancelled} onChange={(e) => setShowCancelled(e.target.checked)} />
        Show cancelled registrations
      </label>

      {rows.length === 0 ? (
        <EmptyState>No participants yet.</EmptyState>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
          <table className="min-w-full divide-y divide-slate-200">
            <thead className="bg-slate-50">
              <tr>
                <th className="th">Student</th>
                <th className="th">Department</th>
                <th className="th">Registered</th>
                <th className="th">Status</th>
                <th className="th">Attendance</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {rows.map((p) => (
                <tr key={p.id}>
                  <td className="td">
                    <div className="font-medium">{p.user.name}</div>
                    <div className="text-xs text-slate-400">{p.user.email}</div>
                  </td>
                  <td className="td">{p.user.department || '-'}</td>
                  <td className="td">{fmtDate(p.createdAt)}</td>
                  <td className="td"><Badge>{p.status}</Badge></td>
                  <td className="td">
                    {p.status === 'REGISTERED' ? (
                      <div className="flex items-center gap-2">
                        {p.attendance ? <Badge>{p.attendance.status}</Badge> : <span className="text-xs text-slate-400">Not marked</span>}
                        <button className="btn-outline btn-sm" onClick={() => mark(p.id, 'PRESENT')}>Present</button>
                        <button className="btn-outline btn-sm" onClick={() => mark(p.id, 'ABSENT')}>Absent</button>
                      </div>
                    ) : (
                      '-'
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
