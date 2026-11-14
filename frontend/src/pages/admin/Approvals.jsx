import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Check, CheckCircle2, Eye, X } from 'lucide-react';
import api from '../../services/api.js';
import { useToast } from '../../context/ToastContext.jsx';
import useFetch from '../../hooks/useFetch.js';
import DashboardShell from '../../components/DashboardShell.jsx';
import { EmptyState, ErrorBox, Loader, Modal } from '../../components/common/Ui.jsx';
import { errMsg, fmtDate } from '../../utils/format.js';

export default function Approvals() {
  const toast = useToast();
  const { data, loading, error, reload } = useFetch('/events/pending');
  const [target, setTarget] = useState(null);
  const [reason, setReason] = useState('');
  const events = data?.events || [];

  const approve = async (e) => {
    try { await api.patch(`/events/${e.id}/approve`); toast.success(`"${e.title}" is now live.`); reload(); } catch (err) { toast.error(errMsg(err)); }
  };
  const reject = async () => {
    try { await api.patch(`/events/${target.id}/reject`, { reason }); toast.success('Sent back to the organiser.'); setTarget(null); setReason(''); reload(); } catch (err) { toast.error(errMsg(err)); }
  };

  return (
    <DashboardShell title="Event approvals" subtitle="Review events submitted by organisers before they go live.">
      <ErrorBox message={error} />
      {loading ? <Loader /> : events.length === 0 ? (
        <EmptyState icon={CheckCircle2} title="Nothing to review">All submitted events have been handled.</EmptyState>
      ) : (
        <ul className="space-y-3">
          {events.map((e) => (
            <li key={e.id} className="card flex flex-wrap items-center justify-between gap-4">
              <div className="min-w-0">
                <p className="font-semibold text-slate-900">{e.title}</p>
                <p className="text-sm text-slate-500">{e.category} &middot; {fmtDate(e.startsAt)} &middot; {e.venue}</p>
                <p className="text-xs text-slate-400">By {e.organizer.name} &middot; capacity {e.capacity} &middot; submitted {e.submittedAt ? fmtDate(e.submittedAt) : '-'}</p>
              </div>
              <div className="flex gap-2">
                <Link to={`/events/${e.id}`} className="btn-outline btn-sm"><Eye className="h-4 w-4" /> Preview</Link>
                <button className="btn-outline btn-sm text-red-600" onClick={() => setTarget(e)}><X className="h-4 w-4" /> Reject</button>
                <button className="btn-primary btn-sm" onClick={() => approve(e)}><Check className="h-4 w-4" /> Approve</button>
              </div>
            </li>
          ))}
        </ul>
      )}
      <Modal open={Boolean(target)} onClose={() => setTarget(null)} title="Reject event"
        footer={<><button className="btn-outline" onClick={() => setTarget(null)}>Cancel</button><button className="btn-danger" disabled={reason.trim().length < 3} onClick={reject}>Send back</button></>}>
        <p className="text-sm text-slate-500">The organiser sees this reason and can edit and resubmit.</p>
        <textarea className="input mt-3 min-h-[100px]" placeholder="What needs to change?" value={reason} onChange={(e) => setReason(e.target.value)} aria-label="Reason" />
      </Modal>
    </DashboardShell>
  );
}
