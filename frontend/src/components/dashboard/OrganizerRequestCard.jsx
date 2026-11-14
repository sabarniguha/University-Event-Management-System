import { useState } from 'react';
import { Megaphone } from 'lucide-react';
import api from '../../services/api.js';
import useFetch from '../../hooks/useFetch.js';
import { useToast } from '../../context/ToastContext.jsx';
import { Badge, Modal } from '../common/Ui.jsx';
import { errMsg } from '../../utils/format.js';

// Lets a student ask an admin for organiser access.
export default function OrganizerRequestCard() {
  const toast = useToast();
  const { data, reload } = useFetch('/auth/organizer-request');
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ organization: '', designation: '', reason: '' });
  const [busy, setBusy] = useState(false);
  const req = data?.request;
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    try {
      await api.post('/auth/organizer-request', form);
      toast.success('Request sent to the admins.');
      setOpen(false);
      reload();
    } catch (err) {
      toast.error(errMsg(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="card flex flex-wrap items-center justify-between gap-4">
      <div className="flex items-start gap-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-600"><Megaphone className="h-5 w-5" /></span>
        <div>
          <h2 className="font-semibold text-slate-900">Want to host events?</h2>
          <p className="text-sm text-slate-500">Request organiser access for your club or department. An admin will review it.</p>
          {req && <p className="mt-1 text-sm text-slate-600"><Badge>{req.status}</Badge> {req.organization}{req.reviewNote ? ` - ${req.reviewNote}` : ''}</p>}
        </div>
      </div>
      {(!req || req.status === 'REJECTED') && <button className="btn-outline" onClick={() => setOpen(true)}>{req ? 'Request again' : 'Request access'}</button>}
      <Modal open={open} onClose={() => setOpen(false)} title="Request organiser access">
        <form onSubmit={submit} className="space-y-3" id="org-form">
          <div><label className="label" htmlFor="org">Club or department</label><input id="org" required minLength={2} className="input" value={form.organization} onChange={set('organization')} /></div>
          <div><label className="label" htmlFor="des">Your role (optional)</label><input id="des" className="input" value={form.designation} onChange={set('designation')} /></div>
          <div><label className="label" htmlFor="rs">Why do you need access? (optional)</label><textarea id="rs" className="input min-h-[90px]" value={form.reason} onChange={set('reason')} /></div>
          <button className="btn-primary w-full" disabled={busy}>{busy ? 'Sending...' : 'Send request'}</button>
        </form>
      </Modal>
    </div>
  );
}
