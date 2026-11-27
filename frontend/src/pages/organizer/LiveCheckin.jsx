import { useCallback, useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import api from '../../services/api.js';
import DashboardShell from '../../components/DashboardShell.jsx';
import { ErrorBox, Loader, StatCard } from '../../components/common/Ui.jsx';
import { BarsChart } from '../../components/charts/Charts.jsx';
import { errMsg } from '../../utils/format.js';

const hhmm = (d) => new Date(d).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
const STATE = { before: 'Not started yet', open: 'Running now', closed: 'Ended' };

// Organiser / admin: the door view during an event. Refreshes by itself every 10 seconds.
export default function LiveCheckin() {
  const { id } = useParams();
  const [d, setD] = useState(null);
  const [error, setError] = useState('');
  const [q, setQ] = useState('');

  const load = useCallback(async () => {
    try { const { data } = await api.get(`/live/event/${id}`); setD(data); setError(''); } catch (e) { setError(errMsg(e)); }
  }, [id]);
  useEffect(() => { load(); const t = setInterval(load, 10000); return () => clearInterval(t); }, [load]);

  const missing = (d?.missingList || []).filter((m) => !q.trim() || `${m.name} ${m.studentId || ''}`.toLowerCase().includes(q.trim().toLowerCase()));
  return (
    <DashboardShell title="Live check-in" subtitle={d ? `${d.event.title} · ${STATE[d.state]}. Updates every 10 seconds.` : 'Who is in and who is still missing.'}
      actions={<><Link to={`/organizer/events/${id}/attendance`} className="btn-outline">Attendance</Link><Link to={`/organizer/events/${id}/screen`} className="btn-outline">Screen check-in QR</Link></>}>
      <ErrorBox message={error} />
      {!d && !error ? <Loader /> : d && (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard label="Checked in" value={`${d.present} / ${d.registered}`} tone="green" hint={d.percent === null ? 'No registrations' : `${d.percent}% of registered`} />
            <StatCard label="Still missing" value={d.missing} tone={d.missing ? 'yellow' : 'green'} hint={d.absent ? `${d.absent} marked absent` : undefined} />
            <StatCard label="Last 10 minutes" value={d.lastTenMinutes} hint="check-ins" />
            <StatCard label="Registered" value={d.registered} hint={`Starts ${hhmm(d.event.startsAt)}, ends ${hhmm(d.event.endsAt)}`} />
          </div>

          {d.state === 'before' && <p className="rounded-xl bg-slate-100 p-3 text-sm text-slate-600">Attendance opens when the event starts. Until then everyone shows as missing.</p>}

          <BarsChart title="Check-ins per 10 minutes" subtitle="Start of each 10-minute slot" data={d.series.map((s) => ({ label: hhmm(s.start), count: s.count }))} name="Check-ins" />

          <div className="grid gap-4 lg:grid-cols-3">
            <section className="card lg:col-span-2">
              <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                <h2 className="font-semibold text-slate-900">Still missing ({d.missingTotal})</h2>
                <input className="input max-w-xs" placeholder="Search name or ID" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Search missing students" />
              </div>
              {missing.length === 0 ? <p className="text-sm text-slate-500">{d.missingTotal === 0 ? 'Everyone registered is in.' : 'No match.'}</p> : (
                <ul className="max-h-96 divide-y divide-slate-100 overflow-y-auto text-sm">
                  {missing.map((m) => (
                    <li key={`${m.studentId}-${m.name}`} className="flex flex-wrap items-center justify-between gap-2 py-2">
                      <span><span className="font-medium">{m.name}</span> <span className="text-xs text-slate-400">{m.studentId || ''}{m.department ? `, ${m.department}` : ''}</span></span>
                      {m.status === 'ABSENT' && <span className="text-xs text-red-600">Marked absent</span>}
                    </li>
                  ))}
                </ul>
              )}
              {d.missingTotal > d.missingList.length && <p className="mt-2 text-xs text-slate-500">Showing the first {d.missingList.length} of {d.missingTotal}.</p>}
            </section>
            <section className="card">
              <h2 className="mb-3 font-semibold text-slate-900">Latest check-ins</h2>
              {d.recent.length === 0 ? <p className="text-sm text-slate-500">No one has checked in yet.</p> : (
                <ul className="space-y-2 text-sm">{d.recent.map((r, i) => <li key={i} className="flex justify-between gap-2"><span className="truncate">{r.name}</span><span className="shrink-0 text-xs text-slate-400">{hhmm(r.at)} · {r.method === 'QR' ? 'QR' : r.method === 'MANUAL' ? 'Manual' : r.method}</span></li>)}</ul>
              )}
            </section>
          </div>
        </>
      )}
    </DashboardShell>
  );
}
