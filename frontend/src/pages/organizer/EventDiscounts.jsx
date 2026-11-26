import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { Tag, Trash2 } from 'lucide-react';
import api from '../../services/api.js';
import useFetch from '../../hooks/useFetch.js';
import { useToast } from '../../context/ToastContext.jsx';
import DashboardShell from '../../components/DashboardShell.jsx';
import { Badge, EmptyState, ErrorBox, Loader } from '../../components/common/Ui.jsx';
import { errMsg, fmtDate } from '../../utils/format.js';

const EMPTY = { code: '', kind: 'PERCENT', value: '', maxUses: '', expiresAt: '' };

// Organiser / admin: promo codes for a paid event. The early-bird price is set in the event form.
export default function EventDiscounts() {
  const { id } = useParams();
  const toast = useToast();
  const { data, loading, error, reload } = useFetch(`/discounts/event/${id}`);
  const [form, setForm] = useState(EMPTY);
  const [busy, setBusy] = useState(false);
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  const create = async (e) => {
    e.preventDefault(); setBusy(true);
    try {
      await api.post(`/discounts/event/${id}`, { ...form, value: Number(form.value), maxUses: form.maxUses === '' ? '' : Number(form.maxUses), expiresAt: form.expiresAt ? new Date(form.expiresAt).toISOString() : '' });
      toast.success('Code created.'); setForm(EMPTY); reload();
    } catch (err) { toast.error(errMsg(err)); } finally { setBusy(false); }
  };
  const toggle = async (c) => { try { await api.patch(`/discounts/event/${id}/${c.id}`, { active: !c.active }); reload(); } catch (e) { toast.error(errMsg(e)); } };
  const remove = async (c) => { if (!window.confirm(`Delete code ${c.code}?`)) return; try { await api.delete(`/discounts/event/${id}/${c.id}`); reload(); } catch (e) { toast.error(errMsg(e)); } };

  if (loading) return <Loader />;
  const paid = (data?.event?.fee || 0) > 0;
  return (
    <DashboardShell title={`Promo codes: ${data?.event?.title || ''}`} subtitle="Students type a code before paying. The discount is worked out on the server. A code never takes the price below ₹1."
      actions={<Link to={`/organizer/events/${id}/registrations`} className="btn-outline">Registrations</Link>}>
      <ErrorBox message={error} />
      {!paid ? <EmptyState icon={Tag} title="This event is free">Promo codes are for paid events. Set a fee in the event form first.</EmptyState> : (
        <>
          <p className="text-sm text-slate-600">Fee ₹{data.event.fee}{data.event.earlyBirdFee ? `. Early-bird price ₹${data.event.earlyBirdFee} until ${fmtDate(data.event.earlyBirdUntil)}.` : '. Set an early-bird price in Edit event.'}</p>
          <form onSubmit={create} className="card grid max-w-3xl gap-3 sm:grid-cols-5">
            <input className="input" required placeholder="Code, e.g. UEM50" aria-label="Code" maxLength={20} value={form.code} onChange={set('code')} />
            <select className="input" aria-label="Type" value={form.kind} onChange={set('kind')}><option value="PERCENT">Percent off</option><option value="FLAT">Rupees off</option></select>
            <input className="input" required type="number" min={1} placeholder={form.kind === 'PERCENT' ? '% (max 90)' : '₹ off'} aria-label="Amount" value={form.value} onChange={set('value')} />
            <input className="input" type="number" min={1} placeholder="Max uses (optional)" aria-label="Max uses" value={form.maxUses} onChange={set('maxUses')} />
            <input className="input" type="datetime-local" aria-label="Expires" value={form.expiresAt} onChange={set('expiresAt')} title="Expires (optional)" />
            <button className="btn-primary sm:col-span-5" disabled={busy}>Create code</button>
          </form>
          {(data.codes || []).length === 0 ? <p className="text-sm text-slate-500">No codes yet.</p> : (
            <div className="card max-w-3xl divide-y divide-slate-100">
              {data.codes.map((c) => (
                <div key={c.id} className="flex flex-wrap items-center justify-between gap-2 py-2 text-sm">
                  <div><span className="font-mono font-semibold">{c.code}</span> <span className="text-slate-500">{c.kind === 'PERCENT' ? `${c.value}% off` : `₹${c.value} off`} · used {c.usedCount}{c.maxUses ? ` of ${c.maxUses}` : ''}{c.expiresAt ? ` · until ${fmtDate(c.expiresAt)}` : ''}</span></div>
                  <div className="flex items-center gap-2"><Badge tone={c.active ? 'green' : 'gray'}>{c.active ? 'ACTIVE' : 'OFF'}</Badge><button className="btn-outline btn-sm" onClick={() => toggle(c)}>{c.active ? 'Turn off' : 'Turn on'}</button><button className="btn-ghost btn-sm text-red-600" onClick={() => remove(c)} aria-label={`Delete ${c.code}`}><Trash2 className="h-4 w-4" /></button></div>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </DashboardShell>
  );
}
