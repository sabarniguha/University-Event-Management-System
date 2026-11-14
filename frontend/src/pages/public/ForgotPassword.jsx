import { useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../../services/api.js';
import AuthCard from '../../components/layout/AuthCard.jsx';
import { ErrorBox, SuccessBox } from '../../components/common/Ui.jsx';
import { errMsg } from '../../utils/format.js';

export default function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [done, setDone] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      const { data } = await api.post('/auth/forgot-password', { email });
      setDone(data.message);
    } catch (err) {
      setError(errMsg(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <AuthCard title="Forgot your password?" subtitle="Enter your email and we will send a reset link if an account exists." footer={<Link to="/login" className="font-medium text-brand-600 hover:underline">Back to sign in</Link>}>
      <form onSubmit={submit} className="space-y-4">
        <ErrorBox message={error} />
        <SuccessBox message={done} />
        {done && <p className="text-xs text-slate-500">No email arriving? On some installations email delivery is not set up. Ask an administrator to reset your password.</p>}
        <div><label className="label" htmlFor="email">Email</label><input id="email" type="email" required className="input" value={email} onChange={(e) => setEmail(e.target.value)} /></div>
        <button className="btn-primary w-full" disabled={busy}>{busy ? 'Sending...' : 'Send reset link'}</button>
      </form>
    </AuthCard>
  );
}
