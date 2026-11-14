import { useState } from 'react';
import { Send } from 'lucide-react';
import api from '../../services/api.js';
import { useToast } from '../../context/ToastContext.jsx';
import useFetch from '../../hooks/useFetch.js';
import DashboardShell from '../../components/DashboardShell.jsx';
import { DataTable } from '../../components/common/Ui.jsx';
import { errMsg, fmtDate } from '../../utils/format.js';

export default function SystemNotifications() {
  const toast = useToast();
  const { data, loading, reload } = useFetch('/admin/audit-logs', { action: 'notification.broadcast', limit: 10 });
  const [form, setForm] = useState({ title: '', message: '', audience: 'ALL', link: '' });
  const [busy, setBusy] = useState(false);
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  const send = async (e) => {
    e.preventDefault();
    setBusy(true);
    try {
      const { data: res } = await api.post('/admin/notifications', form);
      toast.success(`Sent to ${res.recipients} user(s).`);
      setForm({ title: '', message: '', audience: 'ALL', link: '' });
      reload();
    } catch (err) {
      toast.error(errMsg(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <DashboardShell title="System notifications" subtitle="Send an in-app notification to a group of users.">
      <form onSubmit={send} className="card max-w-2xl space-y-4">
        <div><label className="label" htmlFor="n-t">Title</label><input id="n-t" required minLength={3} className="input" value={form.title} onChange={set('title')} /></div>
        <div><label className="label" htmlFor="n-m">Message</label><textarea id="n-m" required minLength={3} className="input min-h-[100px]" value={form.message} onChange={set('message')} /></div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div><label className="label" htmlFor="n-a">Send to</label><select id="n-a" className="input" value={form.audience} onChange={set('audience')}><option value="ALL">Everyone</option><option value="STUDENTS">Students</option><option value="ORGANIZERS">Organisers</option><option value="ADMINS">Admins</option></select></div>
          <div><label className="label" htmlFor="n-l">Link (optional)</label><input id="n-l" className="input" placeholder="/events" value={form.link} onChange={set('link')} /></div>
        </div>
        <button className="btn-primary" disabled={busy}><Send className="h-4 w-4" /> {busy ? 'Sending...' : 'Send notification'}</button>
      </form>
      <div>
        <h2 className="mb-2 font-semibold text-slate-900">Recently sent</h2>
        <DataTable columns={['When', 'Title', 'Audience', 'Recipients', 'Sent by']} loading={loading}
          empty={(data?.logs || []).length === 0 && <p className="p-6 text-sm text-slate-500">No broadcasts sent yet.</p>}>
          {(data?.logs || []).map((l) => (
            <tr key={l.id}><td className="td whitespace-nowrap">{fmtDate(l.createdAt)}</td><td className="td">{l.details?.title}</td><td className="td">{l.details?.audience}</td><td className="td">{l.details?.recipients}</td><td className="td">{l.actor?.name || '-'}</td></tr>
          ))}
        </DataTable>
      </div>
    </DashboardShell>
  );
}
