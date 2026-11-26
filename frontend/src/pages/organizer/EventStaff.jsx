import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { UserPlus, X } from 'lucide-react';
import api from '../../services/api.js';
import useFetch from '../../hooks/useFetch.js';
import { useToast } from '../../context/ToastContext.jsx';
import DashboardShell from '../../components/DashboardShell.jsx';
import { EmptyState, ErrorBox, Loader } from '../../components/common/Ui.jsx';
import { errMsg } from '../../utils/format.js';

// Organiser / admin: choose helpers who can scan tickets and mark attendance for this one event.
export default function EventStaff() {
  const { id } = useParams();
  const toast = useToast();
  const { data, loading, error, reload } = useFetch(`/staff/event/${id}`);
  const [email, setEmail] = useState('');
  const [busy, setBusy] = useState(false);

  const add = async (e) => {
    e.preventDefault();
    setBusy(true);
    try { const { data: r } = await api.post(`/staff/event/${id}`, { email }); toast.success(`${r.added.name} can now help at this event.`); setEmail(''); reload(); } catch (err) { toast.error(errMsg(err)); } finally { setBusy(false); }
  };
  const remove = async (userId) => {
    try { await api.delete(`/staff/event/${id}/${userId}`); reload(); } catch (err) { toast.error(errMsg(err)); }
  };

  if (loading) return <Loader />;
  const staff = data?.staff || [];
  return (
    <DashboardShell title={`Event staff: ${data?.event?.title || ''}`} subtitle="Helpers can scan tickets and mark present or absent for this event only, and only while it is running. They cannot change the event, see payments or issue certificates."
      actions={<Link to={`/organizer/events/${id}/registrations`} className="btn-outline">Registrations</Link>}>
      <ErrorBox message={error} />
      <form onSubmit={add} className="card flex max-w-xl flex-col gap-2 sm:flex-row">
        <input className="input flex-1" type="email" required placeholder="Helper's account email (they must have registered)" aria-label="Helper email" value={email} onChange={(e) => setEmail(e.target.value)} />
        <button className="btn-primary" disabled={busy || !email}><UserPlus className="h-4 w-4" /> Add helper</button>
      </form>
      {staff.length === 0 ? <EmptyState icon={UserPlus} title="No helpers yet">Add volunteers by their account email. They get a notification with a link to their staff page.</EmptyState> : (
        <ul className="card max-w-xl divide-y divide-slate-100">
          {staff.map((s) => (
            <li key={s.userId} className="flex items-center justify-between gap-3 py-2">
              <div><p className="font-medium text-slate-900">{s.name}</p><p className="text-xs text-slate-500">{s.email}{s.department ? ` · ${s.department}` : ''}</p></div>
              <button className="btn-ghost btn-sm text-red-600" onClick={() => remove(s.userId)} aria-label={`Remove ${s.name}`}><X className="h-4 w-4" /></button>
            </li>
          ))}
        </ul>
      )}
    </DashboardShell>
  );
}
