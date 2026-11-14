import { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import api from '../../services/api.js';
import AuthCard from '../../components/layout/AuthCard.jsx';
import PasswordInput from '../../components/forms/PasswordInput.jsx';
import { ErrorBox, SuccessBox } from '../../components/common/Ui.jsx';
import { errMsg } from '../../utils/format.js';

export default function ResetPassword() {
  const [params] = useSearchParams();
  const token = params.get('token') || '';
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [done, setDone] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    if (password !== confirm) return setError('Passwords do not match');
    setBusy(true);
    try {
      const { data } = await api.post('/auth/reset-password', { token, password });
      setDone(data.message);
    } catch (err) {
      setError(errMsg(err));
    } finally {
      setBusy(false);
    }
    return undefined;
  };

  return (
    <AuthCard title="Choose a new password" footer={<Link to="/login" className="font-medium text-brand-600 hover:underline">Go to sign in</Link>}>
      {!token ? <ErrorBox message="This reset link is incomplete. Request a new one." /> : (
        <form onSubmit={submit} className="space-y-4">
          <ErrorBox message={error} />
          <SuccessBox message={done} />
          {!done && (
            <>
              <div><label className="label" htmlFor="pw">New password</label><PasswordInput id="pw" autoComplete="new-password" minLength={8} value={password} onChange={(e) => setPassword(e.target.value)} /></div>
              <div><label className="label" htmlFor="pw2">Confirm password</label><PasswordInput id="pw2" autoComplete="new-password" value={confirm} onChange={(e) => setConfirm(e.target.value)} /></div>
              <button className="btn-primary w-full" disabled={busy}>{busy ? 'Saving...' : 'Update password'}</button>
            </>
          )}
        </form>
      )}
    </AuthCard>
  );
}
