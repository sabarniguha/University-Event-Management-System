import { useCallback, useEffect, useState } from 'react';
import { Clock } from 'lucide-react';
import api from '../../services/api.js';
import { useToast } from '../../context/ToastContext.jsx';
import { errMsg, fmtDate } from '../../utils/format.js';

const left = (deadline) => {
  const mins = Math.max(0, Math.round((new Date(deadline).getTime() - Date.now()) / 60000));
  return mins >= 60 ? `${Math.floor(mins / 60)} h ${mins % 60} min` : `${mins} min`;
};

// Seats offered from a waitlist that need the student's confirmation. Shows nothing when there are none.
export default function WaitlistClaimBanner({ onChange }) {
  const toast = useToast();
  const [claims, setClaims] = useState([]);
  const [busy, setBusy] = useState(0);

  const load = useCallback(() => { api.get('/waitlist-claims/mine').then(({ data }) => setClaims(data.claims || [])).catch(() => {}); }, []);
  useEffect(() => { load(); }, [load]);

  const confirm = async (c) => {
    setBusy(c.id);
    try { await api.post(`/waitlist-claims/${c.id}/confirm`, {}); toast.success('Seat confirmed. See you there!'); load(); if (onChange) onChange(); }
    catch (e) { toast.error(errMsg(e)); load(); if (onChange) onChange(); }
    finally { setBusy(0); }
  };
  const giveUp = async (c) => {
    setBusy(c.id);
    try { await api.delete(`/registrations/${c.event.id}`); toast.success('Seat released'); load(); if (onChange) onChange(); }
    catch (e) { toast.error(errMsg(e)); }
    finally { setBusy(0); }
  };

  if (claims.length === 0) return null;
  return (
    <div className="mb-4 space-y-2">
      {claims.map((c) => (
        <div key={c.id} className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900">
          <div className="min-w-0">
            <p className="flex items-center gap-2 font-semibold"><Clock className="h-4 w-4" /> A seat opened up: {c.event.title}</p>
            <p className="mt-0.5 text-xs">{fmtDate(c.event.startsAt)} at {c.event.venue}. Confirm within {left(c.deadline)} (by {fmtDate(c.deadline)}) or it goes to the next student.</p>
          </div>
          <div className="flex gap-2">
            <button type="button" className="btn-primary btn-sm" disabled={busy === c.id} onClick={() => confirm(c)}>Confirm my seat</button>
            <button type="button" className="btn-outline btn-sm" disabled={busy === c.id} onClick={() => giveUp(c)}>Give it up</button>
          </div>
        </div>
      ))}
    </div>
  );
}
