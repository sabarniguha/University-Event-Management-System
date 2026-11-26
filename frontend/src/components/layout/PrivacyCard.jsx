import { useState } from 'react';
import { Download, Trash2 } from 'lucide-react';
import api, { downloadFile } from '../../services/api.js';
import { useAuth } from '../../context/AuthContext.jsx';
import { useToast } from '../../context/ToastContext.jsx';
import PasswordInput from '../forms/PasswordInput.jsx';
import { errMsg } from '../../utils/format.js';

// Settings card: download everything we hold about you, and (students) delete the account.
export default function PrivacyCard() {
  const { user, logout } = useAuth();
  const toast = useToast();
  const [open, setOpen] = useState(false);
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [busy, setBusy] = useState(false);

  const download = async () => {
    try { await downloadFile('/account/export', 'my-unievents-data.json'); } catch (e) { toast.error(errMsg(e)); }
  };
  const remove = async (e) => {
    e.preventDefault(); setBusy(true);
    try { await api.post('/account/delete', { password, confirm }); toast.success('Your account was deleted.'); logout(); } catch (err) { toast.error(errMsg(err)); } finally { setBusy(false); }
  };

  return (
    <div className="card max-w-xl space-y-3">
      <h2 className="font-semibold text-slate-900">Your data</h2>
      <p className="text-sm text-slate-600">Download a copy of the personal data UniEvents holds about you: profile, registrations, attendance, certificates, payments, feedback and notifications.</p>
      <button className="btn-outline" onClick={download}><Download className="h-4 w-4" /> Download my data</button>
      {user?.role === 'STUDENT' && (
        <div className="border-t border-slate-100 pt-3">
          <h3 className="text-sm font-semibold text-red-700">Delete my account</h3>
          <p className="mt-1 text-sm text-slate-600">This removes your name, email, phone, photo, notifications and answers, cancels your upcoming registrations and signs you out for good. Certificates you earned stay verifiable but no longer show your name. This cannot be undone.</p>
          {!open ? <button className="btn-outline mt-2 text-red-600" onClick={() => setOpen(true)}><Trash2 className="h-4 w-4" /> Delete my account</button> : (
            <form onSubmit={remove} className="mt-2 space-y-2">
              <PasswordInput value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Your password" autoComplete="current-password" />
              <input className="input" placeholder="Type DELETE to confirm" aria-label="Type DELETE" value={confirm} onChange={(e) => setConfirm(e.target.value)} />
              <div className="flex gap-2"><button className="btn-primary bg-red-600 hover:bg-red-700" disabled={busy || !password || confirm !== 'DELETE'}>Permanently delete</button><button type="button" className="btn-outline" onClick={() => setOpen(false)}>Cancel</button></div>
            </form>
          )}
        </div>
      )}
      {user?.role !== 'STUDENT' && <p className="text-xs text-slate-500">Organiser and admin accounts own events and records, so ask an administrator to remove them.</p>}
    </div>
  );
}
