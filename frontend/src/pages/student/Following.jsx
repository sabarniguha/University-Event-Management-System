import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Users } from 'lucide-react';
import api from '../../services/api.js';
import useFetch from '../../hooks/useFetch.js';
import { useToast } from '../../context/ToastContext.jsx';
import DashboardShell from '../../components/DashboardShell.jsx';
import { EmptyState, ErrorBox, Loader } from '../../components/common/Ui.jsx';
import { errMsg } from '../../utils/format.js';

export default function Following() {
  const toast = useToast();
  const { data, loading, error, reload } = useFetch('/follows/mine');
  const [busy, setBusy] = useState(null);
  const unfollow = async (id) => {
    setBusy(id);
    try { await api.delete(`/follows/organizer/${id}`); reload(); } catch (e) { toast.error(errMsg(e)); } finally { setBusy(null); }
  };
  const list = data?.organizers || [];
  return (
    <DashboardShell title="Organisers I follow" subtitle="You get a notification whenever one of these organisers publishes a new event. Follow someone from any event page.">
      <ErrorBox message={error} />
      {loading ? <Loader /> : list.length === 0 ? (
        <EmptyState icon={Users} title="You are not following anyone yet">Open an event and press <b>Follow</b> next to the organiser's name. <Link to="/events" className="font-medium text-brand-600 hover:underline">Browse events</Link></EmptyState>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {list.map((o) => (
            <div key={o.id} className="card flex items-center justify-between gap-3">
              <div><p className="font-semibold text-slate-900">{o.name}</p><p className="text-xs text-slate-500">{o.department || 'Organiser'} · {o.upcomingEvents} upcoming event{o.upcomingEvents === 1 ? '' : 's'}</p></div>
              <button className="btn-outline btn-sm" disabled={busy === o.id} onClick={() => unfollow(o.id)}>Unfollow</button>
            </div>
          ))}
        </div>
      )}
    </DashboardShell>
  );
}
