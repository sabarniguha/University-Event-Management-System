import { useState } from 'react';
import { Link } from 'react-router-dom';
import { CalendarDays, Copy, Pencil, Trash2, Users } from 'lucide-react';
import api from '../../services/api.js';
import { useToast } from '../../context/ToastContext.jsx';
import useFetch from '../../hooks/useFetch.js';
import DashboardShell from '../../components/DashboardShell.jsx';
import { Badge, ConfirmDialog, DataTable, EmptyState, ErrorBox, Tabs } from '../../components/common/Ui.jsx';
import { errMsg, fmtDate } from '../../utils/format.js';

const TABS = [['ALL', 'All'], ['DRAFT', 'Draft'], ['PENDING_APPROVAL', 'Pending'], ['PUBLISHED', 'Published'], ['COMPLETED', 'Completed'], ['REJECTED', 'Rejected'], ['CANCELLED', 'Cancelled']];

export default function MyEvents() {
  const toast = useToast();
  const { data, loading, error, reload } = useFetch('/events/mine');
  const [tab, setTab] = useState('ALL');
  const [target, setTarget] = useState(null);
  const [busy, setBusy] = useState(false);
  const now = new Date();
  const completed = (e) => e.status === 'PUBLISHED' && new Date(e.endsAt) < now;
  const events = data?.events || [];
  const inTab = (e) => (tab === 'ALL' ? true : tab === 'COMPLETED' ? completed(e) : tab === 'PUBLISHED' ? e.status === 'PUBLISHED' && !completed(e) : e.status === tab);
  const rows = events.filter(inTab);
  const count = (t) => events.filter((e) => (t === 'ALL' ? true : t === 'COMPLETED' ? completed(e) : t === 'PUBLISHED' ? e.status === 'PUBLISHED' && !completed(e) : e.status === t)).length;

  const duplicate = async (e) => {
    try { await api.post(`/events/${e.id}/duplicate`); toast.success('Copied as a draft.'); reload(); } catch (err) { toast.error(errMsg(err)); }
  };
  const remove = async () => {
    setBusy(true);
    try { await api.delete(`/events/${target.id}`); toast.success('Event deleted.'); setTarget(null); reload(); } catch (err) { toast.error(errMsg(err)); } finally { setBusy(false); }
  };

  return (
    <DashboardShell title="My events" subtitle="Drafts, events under review, live events and past ones." actions={<Link to="/organizer/events/new" className="btn-primary">Create event</Link>}>
      <ErrorBox message={error} />
      <Tabs value={tab} onChange={setTab} tabs={TABS.map(([value, label]) => ({ value, label, count: count(value) }))} />
      <DataTable columns={['Event', 'When', 'Status', 'Registered', '']} loading={loading}
        empty={rows.length === 0 && <div className="p-6"><EmptyState icon={CalendarDays} title="No events here" action={<Link to="/organizer/events/new" className="btn-primary btn-sm">Create event</Link>}>Events in this state will show up here.</EmptyState></div>}>
        {rows.map((e) => (
          <tr key={e.id}>
            <td className="td"><Link to={`/events/${e.id}`} className="font-medium text-slate-900 hover:text-brand-600">{e.title}</Link>{e.status === 'REJECTED' && <p className="text-xs text-red-600">{e.rejectionReason}</p>}</td>
            <td className="td whitespace-nowrap">{fmtDate(e.startsAt)}</td>
            <td className="td"><Badge>{e.status}</Badge></td>
            <td className="td">{e.registeredCount}/{e.capacity}</td>
            <td className="td">
              <div className="flex justify-end gap-1">
                <Link to={`/organizer/events/${e.id}/registrations`} className="btn-ghost btn-sm" title="Registrations"><Users className="h-4 w-4" /></Link>
                <Link to={`/organizer/events/${e.id}/edit`} className="btn-ghost btn-sm" title="Edit"><Pencil className="h-4 w-4" /></Link>
                <button className="btn-ghost btn-sm" title="Duplicate" onClick={() => duplicate(e)}><Copy className="h-4 w-4" /></button>
                <button className="btn-ghost btn-sm text-red-600" title="Delete" onClick={() => setTarget(e)}><Trash2 className="h-4 w-4" /></button>
              </div>
            </td>
          </tr>
        ))}
      </DataTable>
      <ConfirmDialog open={Boolean(target)} onClose={() => setTarget(null)} danger busy={busy} title="Delete this event?" message={target ? `"${target.title}" and all its registrations will be permanently removed.` : ''} confirmLabel="Delete event" onConfirm={remove} />
    </DashboardShell>
  );
}
