import { useState } from 'react';
import { ShieldCheck } from 'lucide-react';
import api from '../../services/api.js';
import useFetch from '../../hooks/useFetch.js';
import { useToast } from '../../context/ToastContext.jsx';
import QrCode from '../QrCode.jsx';
import PasswordInput from '../forms/PasswordInput.jsx';
import { ErrorBox, Loader } from '../common/Ui.jsx';
import { errMsg } from '../../utils/format.js';

// Admin Settings: turn two-factor sign-in (authenticator app) on or off, and manage backup codes.
export default function TwoFactorCard() {
  const toast = useToast();
  const { data, loading, reload } = useFetch('/auth/2fa/status');
  const [setup, setSetup] = useState(null); // { secret, otpauthUrl }
  const [code, setCode] = useState('');
  const [password, setPassword] = useState('');
  const [codes, setCodes] = useState(null);
  const [mode, setMode] = useState(null); // 'disable' | 'regen'
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  if (loading && !data) return <div className="card"><Loader /></div>;
  if (!data?.available) return null;

  const run = async (fn) => {
    setBusy(true); setError('');
    try { await fn(); } catch (e) { setError(errMsg(e)); } finally { setBusy(false); }
  };

  const start = () => run(async () => { const { data: d } = await api.post('/auth/2fa/setup'); setSetup(d); setCode(''); });
  const enable = (e) => { e.preventDefault(); run(async () => { const { data: d } = await api.post('/auth/2fa/enable', { code }); setCodes(d.backupCodes); setSetup(null); setCode(''); reload(); toast.success('Two-factor sign-in is on'); }); };
  const confirm = (e) => {
    e.preventDefault();
    run(async () => {
      if (mode === 'disable') { await api.post('/auth/2fa/disable', { password, code }); toast.success('Two-factor sign-in is off'); }
      else { const { data: d } = await api.post('/auth/2fa/backup-codes', { password, code }); setCodes(d.backupCodes); }
      setMode(null); setPassword(''); setCode(''); reload();
    });
  };

  return (
    <div className="card space-y-4 lg:col-span-2 lg:max-w-xl">
      <h2 className="flex items-center gap-2 font-semibold text-slate-900"><ShieldCheck className="h-4 w-4 text-brand-600" /> Two-factor sign-in</h2>
      <p className="text-sm text-slate-500">Adds a 6-digit code from an authenticator app (Google Authenticator, Authy, Microsoft Authenticator) every time you sign in, so a stolen password is not enough.</p>
      <ErrorBox message={error} />

      {codes && (
        <div className="rounded-xl border border-amber-300 bg-amber-50 p-4">
          <p className="text-sm font-semibold text-amber-900">Save these backup codes now</p>
          <p className="mb-2 text-xs text-amber-800">Each works once if you lose your phone. They will not be shown again.</p>
          <div className="grid grid-cols-2 gap-1 font-mono text-sm">{codes.map((c) => <span key={c}>{c}</span>)}</div>
          <div className="mt-3 flex gap-2">
            <button type="button" className="btn-outline btn-sm" onClick={() => navigator.clipboard?.writeText(codes.join('\n')).then(() => toast.success('Copied'))}>Copy</button>
            <button type="button" className="btn-primary btn-sm" onClick={() => setCodes(null)}>I have saved them</button>
          </div>
        </div>
      )}

      {!data.enabled && !setup && <button className="btn-primary" onClick={start} disabled={busy}>Set up two-factor sign-in</button>}

      {setup && (
        <form onSubmit={enable} className="space-y-3">
          <p className="text-sm text-slate-600">1. Scan this QR code with your authenticator app, or type the key in by hand.</p>
          <div className="flex flex-col items-center gap-2 sm:flex-row sm:items-start">
            <QrCode value={setup.otpauthUrl} size={160} />
            <p className="break-all rounded-lg bg-slate-50 p-3 font-mono text-xs text-slate-700">{setup.secret}</p>
          </div>
          <label className="label" htmlFor="tf-code">2. Enter the 6-digit code it shows</label>
          <input id="tf-code" className="input max-w-[12rem] font-mono tracking-widest" inputMode="numeric" autoComplete="one-time-code" maxLength={6} value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))} required />
          <div className="flex gap-2"><button className="btn-primary" disabled={busy || code.length !== 6}>Turn on</button><button type="button" className="btn-ghost" onClick={() => setSetup(null)}>Cancel</button></div>
        </form>
      )}

      {data.enabled && !mode && (
        <div className="space-y-3">
          <p className="text-sm text-emerald-700">Two-factor sign-in is on. {data.backupCodesLeft} backup code(s) left.</p>
          <div className="flex flex-wrap gap-2">
            <button className="btn-outline" onClick={() => { setMode('regen'); setError(''); }}>New backup codes</button>
            <button className="btn-outline text-red-600" onClick={() => { setMode('disable'); setError(''); }}>Turn off</button>
          </div>
        </div>
      )}

      {data.enabled && mode && (
        <form onSubmit={confirm} className="space-y-3">
          <p className="text-sm text-slate-600">{mode === 'disable' ? 'To turn it off,' : 'To make new backup codes,'} confirm with your password and a current code (or a backup code).</p>
          <div><label className="label" htmlFor="tf-pw">Password</label><PasswordInput id="tf-pw" value={password} onChange={(e) => setPassword(e.target.value)} /></div>
          <div><label className="label" htmlFor="tf-c2">Code</label><input id="tf-c2" className="input max-w-[12rem] font-mono" autoComplete="one-time-code" value={code} onChange={(e) => setCode(e.target.value)} required /></div>
          <div className="flex gap-2"><button className="btn-primary" disabled={busy}>Confirm</button><button type="button" className="btn-ghost" onClick={() => setMode(null)}>Cancel</button></div>
        </form>
      )}
    </div>
  );
}
