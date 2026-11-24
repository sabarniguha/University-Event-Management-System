import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { Send } from 'lucide-react';
import api from '../../services/api.js';
import useFetch from '../../hooks/useFetch.js';
import { useToast } from '../../context/ToastContext.jsx';
import DashboardShell from '../../components/DashboardShell.jsx';
import { ErrorBox, Loader } from '../../components/common/Ui.jsx';
import { errMsg } from '../../utils/format.js';

const QUICK = [
  ['Venue changed', 'The venue has changed. Please check the event page for the new location.'],
  ['Event delayed', 'The event will start a little later than planned. We will share the new time shortly.'],
  ['Bring your ID', 'Please bring your college ID card and your ticket QR to the event.'],
  ['Reminder', 'A reminder that the event is coming up soon. We look forward to seeing you.'],
];

// Organiser / admin: send one notice to everyone registered for an event.
export default function EventMessages() {
  const { id } = useParams();
  const toast = useToast();
  const { data, loading, error } = useFetch(`/event-messages/event/${id}`);
  const [form, setForm] = useState({ subject: '', message: '', audience: 'CONFIRMED' });
  const [busy, setBusy] = useState(false);
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });
  const count = data ? (form.audience === 'ALL' ? data.all : data.confirmed) : 0;

  const send = async (e) => {
    e.preventDefault();
    if (!window.confirm(`Send this message to ${count} student${count === 1 ? '' : 's'}?`)) return;
    setBusy(true);
    try {
      const { data: r } = await api.post(`/event-messages/event/${id}`, form);
      toast.success(r.sent ? `Sent to ${r.sent} student${r.sent === 1 ? '' : 's'}${r.emailed ? ' (email too)' : ''}.` : r.message);
      if (r.sent) setForm({ ...form, subject: '', message: '' });
    } catch (err) { toast.error(errMsg(err)); } finally { setBusy(false); }
  };

  if (loading) return <Loader />;
  return (
    <DashboardShell title={`Message attendees: ${data?.event?.title || ''}`} subtitle="Send one notice to everyone registered for this event. It appears in their notifications, and by email if email is set up."
      actions={<Link to={`/organizer/events/${id}/registrations`} className="btn-outline">Registrations</Link>}>
      <ErrorBox message={error} />
      {data && (
        <form onSubmit={send} className="card max-w-2xl space-y-3">
          <div className="flex flex-wrap gap-1.5">{QUICK.map(([s, m]) => <button key={s} type="button" className="rounded-full border border-slate-200 px-2.5 py-0.5 text-xs text-slate-700 hover:bg-slate-50" onClick={() => setForm({ ...form, subject: s, message: m })}>{s}</button>)}</div>
          <div><label className="label" htmlFor="ms">Subject</label><input id="ms" className="input" maxLength={120} required value={form.subject} onChange={set('subject')} /></div>
          <div><label className="label" htmlFor="mm">Message</label><textarea id="mm" className="input" rows={5} maxLength={1500} required value={form.message} onChange={set('message')} /></div>
          <div><label className="label" htmlFor="ma">Send to</label>
            <select id="ma" className="input" value={form.audience} onChange={set('audience')}>
              <option value="CONFIRMED">Confirmed students ({data.confirmed})</option>
              <option value="ALL">Everyone not cancelled, including waitlist and pending ({data.all})</option>
            </select></div>
          <p className="text-xs text-slate-500">{data.emailOn ? 'Email is on: students who have not switched email off also get this by email.' : 'Email is not set up on this server, so the message goes to in-app notifications only.'}</p>
          <button className="btn-primary" disabled={busy || count === 0}><Send className="h-4 w-4" /> {busy ? 'Sending...' : `Send to ${count}`}</button>
        </form>
      )}
    </DashboardShell>
  );
}
