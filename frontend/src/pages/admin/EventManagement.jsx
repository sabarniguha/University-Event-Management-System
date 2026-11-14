import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Star, Trash2, Pencil } from 'lucide-react';
import api from '../../services/api.js';
import { useToast } from '../../context/ToastContext.jsx';
import useFetch from '../../hooks/useFetch.js';
import useDebounce from '../../hooks/useDebounce.js';
import DashboardShell from '../../components/DashboardShell.jsx';
import { Badge, ConfirmDialog, DataTable, EmptyState, ErrorBox, Pagination, SearchInput } from '../../components/common/Ui.jsx';
import { errMsg, fmtDate } from '../../utils/format.js';

export default function EventManagement() {
  const toast = useToast();
  const [q, setQ] = useState('');
  const [status, setStatus] = useState('');
  const [page, setPage] = useState(1);
  const dq = useDebounce(q);
  const { data, loading, error, reload } = useFetch('/admin/events', { q: dq, status, page, limit: 15 });
  const [target, setTarget] = useState(null);
  const [busy, setBusy] = useState(false);
  const events = data?.events || [];

  const feature = async (e) => {
    try { await api.patch(`/events/${e.id}`, { featured: !e.featured }); reload(); } catch (err) { toast.error(errMsg(err)); }
  };
  const remove = async () => {
    setBusy(true);
    try { await api.delete(`/events/${target.id}`); toast.success('Event deleted.'); setTarget(null); reload(); } catch (err) { toast.error(errMsg(err)); } finally { setBusy(false); }
  };

  return (
    <DashboardShell title="Event management" subtitle="All events from every organiser.">
      <ErrorBox message={error} />
      <div className="flex flex-col gap-3 sm:flex-row">
        <SearchInput className="flex-1" value={q} onChange={(v) => { setQ(v); setPage(1); }} placeholder="Search by title or venue" />
        <select className="input sm:w-52" value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }} aria-label="Filter by status">
          <option value="">All statuses</option>
          {['DRAFT', 'PENDING_APPROVAL', 'PUBLISHED', 'REJECTED', 'CANCELLED'].map((s) => <option key={s} value={s}>{s.replace('_', ' ')}</option>)}
        </select>
      </div>
      <DataTable columns={['Event', 'Organiser', 'When', 'Status', 'Registered', '']} loading={loading}
        empty={events.length === 0 && <div className="p-6"><EmptyState title="No events">Nothing matches these filters.</EmptyState></div>}>
        {events.map((e) => (
          <tr key={e.id}>
            <td className="td"><Link to={`/events/${e.id}`} className="font-medium text-slate-900 hover:text-brand-600">{e.title}</Link><p className="text-xs text-slate-500">{e.category}</p></td>
            <td className="td">{e.organizer.name}</td>
            <td className="td whitespace-nowrap">{fmtDate(e.startsAt)}</td>
            <td className="td"><Badge>{e.status}</Badge></td>
            <td className="td">{e.registeredCount}/{e.capacity}</td>
            <td className="td">
              <div className="flex justify-end gap-1">
                <button className="btn-ghost btn-sm" title={e.featured ? 'Remove from featured' : 'Feature on home page'} onClick={() => feature(e)}><Star className={`h-4 w-4 ${e.featured ? 'fill-amber-400 text-amber-500' : ''}`} /></button>
                <Link to={`/organizer/events/${e.id}/edit`} className="btn-ghost btn-sm" title="Edit"><Pencil className="h-4 w-4" /></Link>
                <button className="btn-ghost btn-sm text-red-600" title="Delete" onClick={() => setTarget(e)}><Trash2 className="h-4 w-4" /></button>
              </div>
            </td>
          </tr>
        ))}
      </DataTable>
      <Pagination pagination={data?.pagination} onPage={setPage} />
      <ConfirmDialog open={Boolean(target)} onClose={() => setTarget(null)} danger busy={busy} title="Delete this event?" confirmLabel="Delete event" message={target ? `"${target.title}" and its registrations will be permanently removed.` : ''} onConfirm={remove} />
    </DashboardShell>
  );
}
