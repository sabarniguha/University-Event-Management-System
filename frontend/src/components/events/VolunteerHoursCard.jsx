import { useEffect, useState } from 'react';
import api from '../../services/api.js';
import useFetch from '../../hooks/useFetch.js';
import { useToast } from '../../context/ToastContext.jsx';
import { errMsg } from '../../utils/format.js';

// Organiser / admin: after the event, confirm how many hours each helper served. Shows nothing when there are no helpers.
export default function VolunteerHoursCard({ eventId, refreshKey }) {
  const toast = useToast();
  const { data, reload } = useFetch(`/volunteer/event/${eventId}`);
  const [vals, setVals] = useState({});
  const [busy, setBusy] = useState(0);
  useEffect(() => { reload(); }, [refreshKey]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (!data) return;
    setVals(Object.fromEntries(data.helpers.map((h) => [h.userId, h.hours ?? data.defaultHours])));
  }, [data]);

  if (!data || data.helpers.length === 0) return null;
  const save = async (h) => {
    setBusy(h.userId);
    try { await api.put(`/volunteer/event/${eventId}/${h.userId}`, { hours: vals[h.userId] }); toast.success(`Hours saved for ${h.name}`); reload(); }
    catch (e) { toast.error(errMsg(e)); }
    finally { setBusy(0); }
  };
  const clear = async (h) => {
    setBusy(h.userId);
    try { await api.delete(`/volunteer/event/${eventId}/${h.userId}`); reload(); } catch (e) { toast.error(errMsg(e)); } finally { setBusy(0); }
  };

  return (
    <section className="card mt-6">
      <h2 className="font-semibold text-slate-900">Volunteer hours</h2>
      <p className="mb-3 mt-1 text-xs text-slate-500">
        {data.ended ? `Confirm the hours each helper served. The event length (${data.defaultHours} h) is filled in; change it for anyone who helped for less. Confirmed hours appear in the student's service record and activity transcript.` : 'You can confirm hours once the event has ended.'}
      </p>
      <ul className="divide-y divide-slate-100 text-sm">
        {data.helpers.map((h) => (
          <li key={h.userId} className="flex flex-wrap items-center justify-between gap-2 py-2">
            <span className="min-w-0"><span className="font-medium">{h.name}</span> {h.hours !== null && <span className="ml-2 rounded-full bg-green-100 px-2 py-0.5 text-xs text-green-700">{h.hours} h confirmed</span>}</span>
            <span className="flex items-center gap-2">
              <input type="number" min={0.25} max={48} step={0.25} className="input w-24" value={vals[h.userId] ?? ''} disabled={!data.ended} onChange={(e) => setVals((v) => ({ ...v, [h.userId]: e.target.value }))} aria-label={`Hours for ${h.name}`} />
              <button className="btn-primary btn-sm" disabled={!data.ended || busy === h.userId} onClick={() => save(h)}>{h.hours === null ? 'Confirm' : 'Update'}</button>
              {h.hours !== null && <button className="btn-ghost btn-sm text-red-600" disabled={busy === h.userId} onClick={() => clear(h)}>Remove</button>}
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}
