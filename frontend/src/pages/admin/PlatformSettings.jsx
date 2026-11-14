import { useEffect, useState } from 'react';
import api from '../../services/api.js';
import { useToast } from '../../context/ToastContext.jsx';
import useFetch from '../../hooks/useFetch.js';
import DashboardShell from '../../components/DashboardShell.jsx';
import { Badge, ErrorBox, Switch } from '../../components/common/Ui.jsx';
import { errMsg, timeAgo } from '../../utils/format.js';

export default function PlatformSettings() {
  const toast = useToast();
  const { data, error } = useFetch('/admin/settings');
  const { data: inbox, reload } = useFetch('/admin/messages', { limit: 10 });
  const [form, setForm] = useState(null);
  const [busy, setBusy] = useState(false);
  useEffect(() => { if (data) setForm(data.settings); }, [data]);

  const save = async (e) => {
    e.preventDefault();
    setBusy(true);
    try { const { data: res } = await api.put('/admin/settings', form); setForm(res.settings); toast.success('Settings saved.'); } catch (err) { toast.error(errMsg(err)); } finally { setBusy(false); }
  };
  const markRead = async (m) => { await api.patch(`/admin/messages/${m.id}/read`).catch(() => {}); reload(); };

  return (
    <DashboardShell title="Platform settings" subtitle="Site details and approval rules.">
      <ErrorBox message={error} />
      {form && (
        <form onSubmit={save} className="card max-w-2xl space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div><label className="label" htmlFor="s-n">Site name</label><input id="s-n" className="input" required value={form.siteName} onChange={(e) => setForm({ ...form, siteName: e.target.value })} /></div>
            <div><label className="label" htmlFor="s-c">Public contact email</label><input id="s-c" type="email" className="input" value={form.contactEmail} onChange={(e) => setForm({ ...form, contactEmail: e.target.value })} /></div>
          </div>
          <div><label className="label" htmlFor="s-t">Tagline</label><input id="s-t" className="input" value={form.tagline} onChange={(e) => setForm({ ...form, tagline: e.target.value })} /></div>
          {[['requireEventApproval', 'Require approval for new events', 'Organiser events stay hidden until an admin approves them.'], ['allowStudentSignup', 'Allow student sign-ups', 'Turn off to close the public registration form.']].map(([k, title, text]) => (
            <div key={k} className="flex items-center justify-between gap-4 rounded-xl border border-slate-200 p-3">
              <div><p className="text-sm font-medium text-slate-900">{title}</p><p className="text-xs text-slate-500">{text}</p></div>
              <Switch checked={Boolean(form[k])} onChange={(v) => setForm({ ...form, [k]: v })} label={title} />
            </div>
          ))}
          <button className="btn-primary" disabled={busy}>{busy ? 'Saving...' : 'Save settings'}</button>
        </form>
      )}
      <div className="card">
        <h2 className="mb-3 font-semibold text-slate-900">Contact messages</h2>
        {(inbox?.messages || []).length === 0 ? <p className="text-sm text-slate-500">No messages yet.</p> : (
          <ul className="divide-y divide-slate-100">
            {inbox.messages.map((m) => (
              <li key={m.id} className="py-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="font-medium text-slate-900">{m.subject} {!m.readAt && <Badge tone="blue">New</Badge>}</p>
                  <span className="text-xs text-slate-400">{timeAgo(m.createdAt)}</span>
                </div>
                <p className="text-xs text-slate-500">{m.name} &middot; <a className="text-brand-600 hover:underline" href={`mailto:${m.email}`}>{m.email}</a></p>
                <p className="mt-1 whitespace-pre-line text-sm text-slate-600">{m.message}</p>
                {!m.readAt && <button className="mt-1 text-xs font-medium text-brand-600 hover:underline" onClick={() => markRead(m)}>Mark as read</button>}
              </li>
            ))}
          </ul>
        )}
      </div>
    </DashboardShell>
  );
}
