import { useState } from 'react';
import { useLocation } from 'react-router-dom';
import { ShieldCheck } from 'lucide-react';
import api from '../../services/api.js';
import useFetch from '../../hooks/useFetch.js';
import { useAuth } from '../../context/AuthContext.jsx';
import { useToast } from '../../context/ToastContext.jsx';
import { errMsg } from '../../utils/format.js';

// Shown to any signed-in role whose email is not verified yet, when the server can send email.
export default function VerifyEmailBanner() {
  const { user } = useAuth();
  const toast = useToast();
  const location = useLocation();
  const { data } = useFetch('/public/config');
  const [busy, setBusy] = useState(false);
  // The student dashboard already shows its own notice.
  if (!data?.emailVerification || user.emailVerifiedAt || (user.role === 'STUDENT' && location.pathname === '/student')) return null;

  const resend = async () => {
    setBusy(true);
    try {
      await api.post('/auth/resend-verification');
      toast.success(`Verification link sent to ${user.email}`);
    } catch (e) {
      toast.error(errMsg(e));
    } finally {
      setBusy(false);
    }
  };
  return (
    <div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-yellow-200 bg-yellow-50 px-4 py-3 text-sm text-yellow-800" role="status">
      <span className="flex items-center gap-2"><ShieldCheck className="h-4 w-4" /> Please verify <b>{user.email}</b>. We sent you a link.{user.role !== 'ADMIN' && ' Until then you cannot register for or create events.'}</span>
      <button onClick={resend} disabled={busy} className="font-medium underline">{busy ? 'Sending...' : 'Resend link'}</button>
    </div>
  );
}
