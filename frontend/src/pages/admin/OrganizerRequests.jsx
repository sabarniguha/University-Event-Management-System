import { useState } from 'react';
import { Check, X } from 'lucide-react';
import api from '../../services/api.js';
import { useToast } from '../../context/ToastContext.jsx';
import useFetch from '../../hooks/useFetch.js';
import { Badge, Modal } from '../../components/common/Ui.jsx';
import { errMsg, fmtDay } from '../../utils/format.js';

// Pending requests from students who want organiser access.
export default function OrganizerRequests({ onChange }) {
  const toast = useToast();
  const { data, reload } = useFetch('/admin/organizer-requests', { status: 'PENDING' });
  const [target, setTarget] = useState(null);
  const [note, setNote] = useState('');
  const requests = data?.requests || [];

  const decide = async (action) => {
    try {
      await api.patch(`/admin/organizer-requests/${target.id}`, { action, note });
      toast.success(action === 'APPROVE' ? 'Organiser access granted.' : 'Request declined.');
      setTarget(null);
      setNote('');
      reload();
      onChange?.();
    } catch (e) {
      toast.error(errMsg(e));
    }
  };

  if (requests.length === 0) return null;
  return (
    <div className="card">
      <h2 className="mb-3 font-semibold text-slate-900">Pending organiser requests <Badge tone="yellow">{requests.length}</Badge></h2>
      <ul className="divide-y divide-slate-100">
        {requests.map((r) => (
          <li key={r.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
            <div className="min-w-0">
              <p className="font-medium text-slate-900">{r.user.name} <span className="font-normal text-slate-500">({r.user.email})</span></p>
              <p className="text-sm text-slate-600">{r.organization}{r.designation ? ` · ${r.designation}` : ''}</p>
              {r.reason && <p className="text-sm text-slate-500">{r.reason}</p>}
              <p className="text-xs text-slate-400">Requested {fmtDay(r.createdAt)}</p>
            </div>
            <button className="btn-outline btn-sm" onClick={() => setTarget(r)}>Review</button>
          </li>
        ))}
      </ul>
      <Modal open={Boolean(target)} onClose={() => setTarget(null)} title={`Review ${target?.user.name || ''}`}
        footer={<><button className="btn-outline text-red-600" onClick={() => decide('REJECT')}><X className="h-4 w-4" /> Decline</button><button className="btn-primary" onClick={() => decide('APPROVE')}><Check className="h-4 w-4" /> Approve</button></>}>
        <p className="text-sm text-slate-600">Approving changes this student's role to organiser.</p>
        <label className="label mt-3" htmlFor="rn">Note to the applicant (optional)</label>
        <textarea id="rn" className="input" value={note} onChange={(e) => setNote(e.target.value)} />
      </Modal>
    </div>
  );
}
