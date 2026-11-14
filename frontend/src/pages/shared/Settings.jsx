import { useState } from 'react';
import { Monitor, Moon, Sun } from 'lucide-react';
import api from '../../services/api.js';
import { useAuth } from '../../context/AuthContext.jsx';
import { useTheme } from '../../context/ThemeContext.jsx';
import { useToast } from '../../context/ToastContext.jsx';
import DashboardShell from '../../components/DashboardShell.jsx';
import PasswordInput from '../../components/forms/PasswordInput.jsx';
import { ErrorBox, Switch } from '../../components/common/Ui.jsx';
import { errMsg } from '../../utils/format.js';

const THEMES = [['light', 'Light', Sun], ['dark', 'Dark', Moon], ['system', 'System', Monitor]];

export default function Settings() {
  const { user, setUser } = useAuth();
  const { theme, setTheme } = useTheme();
  const toast = useToast();
  const prefs = { reminders: true, announcements: true, ...(user.notificationPrefs || {}) };
  const [pw, setPw] = useState({ currentPassword: '', newPassword: '', confirm: '' });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const savePref = async (key, value) => {
    try {
      const { data } = await api.patch('/auth/me', { notificationPrefs: { ...prefs, [key]: value } });
      setUser(data.user);
    } catch (e) {
      toast.error(errMsg(e));
    }
  };

  const changePassword = async (e) => {
    e.preventDefault();
    setError('');
    if (pw.newPassword !== pw.confirm) return setError('New passwords do not match');
    setBusy(true);
    try {
      await api.post('/auth/change-password', { currentPassword: pw.currentPassword, newPassword: pw.newPassword });
      toast.success('Password updated.');
      setPw({ currentPassword: '', newPassword: '', confirm: '' });
    } catch (err) {
      setError(errMsg(err));
    } finally {
      setBusy(false);
    }
    return undefined;
  };

  return (
    <DashboardShell title="Settings" subtitle="Appearance, notifications and security.">
      <div className="grid gap-6 lg:grid-cols-2">
        <div className="card">
          <h2 className="font-semibold text-slate-900">Appearance</h2>
          <div className="mt-3 grid grid-cols-3 gap-2">
            {THEMES.map(([v, label, Icon]) => (
              <button key={v} onClick={() => setTheme(v)} aria-pressed={theme === v}
                className={`flex flex-col items-center gap-1 rounded-xl border px-3 py-3 text-sm font-medium ${theme === v ? 'border-brand-500 bg-brand-50 text-brand-700' : 'border-slate-200 text-slate-600 hover:bg-slate-100'}`}>
                <Icon className="h-5 w-5" />{label}
              </button>
            ))}
          </div>
        </div>

        <div className="card space-y-4">
          <h2 className="font-semibold text-slate-900">Notifications</h2>
          {[['reminders', 'Event reminders', 'A reminder 24 hours before events you registered for.'], ['announcements', 'Announcements', 'Show university-wide announcements.']].map(([k, title, text]) => (
            <div key={k} className="flex items-center justify-between gap-4">
              <div><p className="text-sm font-medium text-slate-900">{title}</p><p className="text-xs text-slate-500">{text}</p></div>
              <Switch checked={prefs[k] !== false} onChange={(v) => savePref(k, v)} label={title} />
            </div>
          ))}
        </div>

        <form onSubmit={changePassword} className="card space-y-4 lg:col-span-2 lg:max-w-xl">
          <h2 className="font-semibold text-slate-900">Change password</h2>
          <ErrorBox message={error} />
          <div><label className="label" htmlFor="cp">Current password</label><PasswordInput id="cp" value={pw.currentPassword} onChange={(e) => setPw({ ...pw, currentPassword: e.target.value })} /></div>
          <div><label className="label" htmlFor="np">New password</label><PasswordInput id="np" autoComplete="new-password" minLength={8} value={pw.newPassword} onChange={(e) => setPw({ ...pw, newPassword: e.target.value })} /></div>
          <div><label className="label" htmlFor="np2">Confirm new password</label><PasswordInput id="np2" autoComplete="new-password" value={pw.confirm} onChange={(e) => setPw({ ...pw, confirm: e.target.value })} /></div>
          <button className="btn-primary" disabled={busy}>{busy ? 'Updating...' : 'Update password'}</button>
        </form>
      </div>
    </DashboardShell>
  );
}
