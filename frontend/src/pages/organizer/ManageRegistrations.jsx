import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { Check, Download, Users, X } from 'lucide-react';
import api, { downloadFile } from '../../services/api.js';
import { useToast } from '../../context/ToastContext.jsx';
import useFetch from '../../hooks/useFetch.js';
import useDebounce from '../../hooks/useDebounce.js';
import DashboardShell from '../../components/DashboardShell.jsx';
import EventPicker from '../../components/events/EventPicker.jsx';
import { Badge, DataTable, EmptyState, ErrorBox, SearchInput, StatCard } from '../../components/common/Ui.jsx';
import { errMsg, fmtDate } from '../../utils/format.js';

function EventRegistrations({ id }) {
  const toast = useToast();
  const { data, loading, error, reload } = useFetch(`/registrations/event/${id}`);
  const [q, setQ] = useState('');
  const [status, setStatus] = useState('ALL');
  const dq = useDebounce(q, 200).toLowerCase();

  const decide = async (reg, action) => {
    try {
      await api.patch(`/registrations/${reg.id}/decision`, { action });
      toast.success(action === 'APPROVE' ? 'Approved.' : 'Declined.');
      reload();
    } catch (e) {
      toast.error(errMsg(e));
    }
  };

  const rows = (data?.participants || []).filter((p) => {
    if (status !== 'ALL' && p.status !== status) return false;
    if (!dq) return true;
    return [p.user.name, p.user.email, p.user.studentId, p.user.department].some((v) => (v || '').toLowerCase().includes(dq));
  });
  const s = data?.summary;

  return (
    <DashboardShell
      title={data ? `Registrations: ${data.event.title}` : 'Registrations'}
      subtitle="Search, approve or decline requests, and export the list."
      actions={
        <>
          <button className="btn-outline" onClick={() => downloadFile(`/registrations/event/${id}/export`, 'registrations.csv').catch((e) => toast.error(errMsg(e)))}><Download className="h-4 w-4" /> CSV</button>
          <Link to={`/organizer/events/${id}/attendance`} className="btn-primary">Attendance and check-in</Link>
        </>
      }
    >
      <ErrorBox message={error} />
      {s && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard label="Registered" value={`${s.registered}/${s.capacity}`} icon={Users} />
          <StatCard label="Pending approval" value={s.pending} tone="yellow" />
          <StatCard label="Waitlisted" value={s.waitlisted} tone="yellow" />
          <StatCard label="Cancelled" value={s.cancelled + s.rejected} tone="red" />
        </div>
      )}
      <div className="flex flex-col gap-3 sm:flex-row">
        <SearchInput className="flex-1" value={q} onChange={setQ} placeholder="Search by name, email, student ID or department" />
        <select className="input sm:w-48" value={status} onChange={(e) => setStatus(e.target.value)} aria-label="Filter by status">
          <option value="ALL">All statuses</option>
          {['REGISTERED', 'PENDING', 'WAITLISTED', 'REJECTED', 'CANCELLED'].map((v) => <option key={v}>{v}</option>)}
        </select>
      </div>
      <DataTable columns={['Student', 'Department', 'Joined', 'Status', 'Attendance', '']} loading={loading}
        empty={rows.length === 0 && <div className="p-6"><EmptyState icon={Users} title="No matching registrations">Nobody matches these filters yet.</EmptyState></div>}>
        {rows.map((p) => (
          <tr key={p.id}>
            <td className="td"><p className="font-medium text-slate-900">{p.user.name}</p><p className="text-xs text-slate-500">{p.user.email}{p.user.studentId ? ` · ${p.user.studentId}` : ''}</p></td>
            <td className="td">{p.user.department || '-'}{p.user.year ? <span className="text-xs text-slate-500"> (Y{p.user.year})</span> : ''}</td>
            <td className="td whitespace-nowrap">{fmtDate(p.joinedAt)}</td>
            <td className="td"><Badge>{p.status}</Badge></td>
            <td className="td">{p.attendance ? <Badge>{p.attendance.status}</Badge> : '-'}</td>
            <td className="td text-right">
              {p.status === 'PENDING' && (
                <div className="flex justify-end gap-1">
                  <button className="btn-primary btn-sm" onClick={() => decide(p, 'APPROVE')}><Check className="h-3.5 w-3.5" /> Approve</button>
                  <button className="btn-outline btn-sm text-red-600" onClick={() => decide(p, 'REJECT')}><X className="h-3.5 w-3.5" /> Decline</button>
                </div>
              )}
            </td>
          </tr>
        ))}
      </DataTable>
    </DashboardShell>
  );
}

export default function ManageRegistrations() {
  const { id } = useParams();
  if (id) return <EventRegistrations id={id} />;
  return (
    <DashboardShell title="Manage registrations" subtitle="Choose an event to see who registered.">
      <EventPicker filter={(e) => e.status !== 'DRAFT'} empty="Registrations appear once you publish an event."
        renderAction={(e) => <Link to={`/organizer/events/${e.id}/registrations`} className="btn-outline btn-sm">Open</Link>} />
    </DashboardShell>
  );
}
