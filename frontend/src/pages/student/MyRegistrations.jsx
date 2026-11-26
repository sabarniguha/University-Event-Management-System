import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ClipboardList } from 'lucide-react';
import api from '../../services/api.js';
import { useToast } from '../../context/ToastContext.jsx';
import useFetch from '../../hooks/useFetch.js';
import DashboardShell from '../../components/DashboardShell.jsx';
import { Badge, ConfirmDialog, DataTable, EmptyState, ErrorBox, Tabs } from '../../components/common/Ui.jsx';
import { errMsg, fmtDate } from '../../utils/format.js';

const TABS = [['all', 'All'], ['upcoming', 'Upcoming'], ['past', 'Past'], ['waiting', 'Pending / waitlist'], ['cancelled', 'Cancelled']];

// Tells the student up front whether cancelling now brings a refund.
const refundNote = (r) => {
  const e = r.event;
  if (r.status !== 'REGISTERED' || !(e.fee > 0) || e.refundCutoffHours === null || e.refundCutoffHours === undefined) return '';
  const ok = new Date(e.startsAt).getTime() - e.refundCutoffHours * 3600e3 >= Date.now();
  return ok ? ' Your online payment will be refunded.' : ' The refund window has closed, so you will not be refunded.';
};

export default function MyRegistrations() {
  const toast = useToast();
  const { data, loading, error, reload } = useFetch('/registrations/my');
  const [tab, setTab] = useState('all');
  const [target, setTarget] = useState(null);
  const [busy, setBusy] = useState(false);
  const now = new Date();

  const rows = (data?.registrations || []).filter((r) => {
    const ended = new Date(r.event.endsAt) < now;
    if (tab === 'upcoming') return r.status === 'REGISTERED' && !ended;
    if (tab === 'past') return r.status === 'REGISTERED' && ended;
    if (tab === 'waiting') return ['PENDING', 'WAITLISTED', 'AWAITING_PAYMENT'].includes(r.status);
    if (tab === 'cancelled') return ['CANCELLED', 'REJECTED'].includes(r.status);
    return true;
  });

  const cancel = async () => {
    setBusy(true);
    try {
      const { data: res } = await api.delete(`/registrations/${target.event.id}`);
      toast.success(res.refund === 'REFUNDED' ? 'Registration cancelled. Your refund has started.' : res.refund === 'PENDING' ? 'Registration cancelled. Your refund will be completed by an admin.' : 'Registration cancelled.');
      setTarget(null);
      reload();
    } catch (e) {
      toast.error(errMsg(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <DashboardShell title="My registrations" subtitle="Every event you have registered for, requested or joined the waitlist of.">
      <ErrorBox message={error} />
      <Tabs tabs={TABS.map(([value, label]) => ({ value, label }))} value={tab} onChange={setTab} />
      <DataTable columns={['Event', 'When', 'Status', 'Attendance', '']} loading={loading}
        empty={rows.length === 0 && <div className="p-6"><EmptyState icon={ClipboardList} title="Nothing here">No registrations in this view. <Link to="/events" className="text-brand-600 hover:underline">Browse events</Link></EmptyState></div>}>
        {rows.map((r) => {
          const canCancel = ['REGISTERED', 'WAITLISTED', 'PENDING', 'AWAITING_PAYMENT'].includes(r.status) && new Date(r.event.startsAt) > now;
          return (
            <tr key={r.id}>
              <td className="td"><Link to={`/events/${r.event.id}`} className="font-medium text-slate-900 hover:text-brand-600">{r.event.title}</Link><p className="text-xs text-slate-500">{r.event.venue}</p></td>
              <td className="td whitespace-nowrap">{fmtDate(r.event.startsAt)}</td>
              <td className="td"><Badge>{r.status}</Badge>{r.waitlistPosition && <span className="ml-2 text-xs text-slate-500">#{r.waitlistPosition}</span>}</td>
              <td className="td">{r.attendance ? <Badge>{r.attendance.status}</Badge> : '-'}</td>
              <td className="td text-right">
                {r.status === 'REGISTERED' && <Link to="/student/tickets" className="btn-outline btn-sm mr-2">Ticket</Link>}
                {r.status === 'AWAITING_PAYMENT' && <Link to={`/events/${r.event.id}`} className="btn-primary btn-sm mr-2">Pay now</Link>}
                {canCancel && <button className="btn-ghost btn-sm text-red-600" onClick={() => setTarget(r)}>Cancel</button>}
              </td>
            </tr>
          );
        })}
      </DataTable>
      <ConfirmDialog open={Boolean(target)} onClose={() => setTarget(null)} danger busy={busy} title="Cancel registration?" message={target ? `You will lose your place in "${target.event.title}".${refundNote(target)}` : ''} confirmLabel="Cancel registration" onConfirm={cancel} />
    </DashboardShell>
  );
}
