import { useState } from 'react';
import { Mail, Send } from 'lucide-react';
import api from '../../services/api.js';
import useFetch from '../../hooks/useFetch.js';
import { useToast } from '../../context/ToastContext.jsx';
import { ErrorBox } from '../../components/common/Ui.jsx';
import { errMsg } from '../../utils/format.js';

export default function Contact() {
  const toast = useToast();
  const { data } = useFetch('/public/settings');
  const [form, setForm] = useState({ name: '', email: '', subject: '', message: '' });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      const res = await api.post('/public/contact', form);
      toast.success(res.data.message);
      setSent(true);
      setForm({ name: '', email: '', subject: '', message: '' });
    } catch (err) {
      setError(errMsg(err));
    } finally {
      setBusy(false);
    }
  };

  const contactEmail = data?.settings?.contactEmail;
  return (
    <div className="mx-auto max-w-2xl px-4 py-12 sm:px-6">
      <h1 className="text-3xl font-bold tracking-tight text-slate-900">Contact us</h1>
      <p className="mt-2 text-slate-500">Questions, feedback or want to become an organiser? Send us a message.</p>
      {contactEmail && <p className="mt-2 flex items-center gap-2 text-sm text-slate-600"><Mail className="h-4 w-4" /> {contactEmail}</p>}
      <form onSubmit={submit} className="card mt-6 space-y-4">
        <ErrorBox message={error} />
        {sent && <p className="rounded-xl bg-green-100 px-4 py-3 text-sm text-green-700" role="status">Thanks! We received your message.</p>}
        <div className="grid gap-4 sm:grid-cols-2">
          <div><label className="label" htmlFor="c-name">Name</label><input id="c-name" className="input" required value={form.name} onChange={set('name')} /></div>
          <div><label className="label" htmlFor="c-email">Email</label><input id="c-email" type="email" className="input" required value={form.email} onChange={set('email')} /></div>
        </div>
        <div><label className="label" htmlFor="c-subject">Subject</label><input id="c-subject" className="input" required minLength={3} value={form.subject} onChange={set('subject')} /></div>
        <div><label className="label" htmlFor="c-msg">Message</label><textarea id="c-msg" className="input min-h-[130px]" required minLength={10} value={form.message} onChange={set('message')} /></div>
        <button className="btn-primary" disabled={busy}><Send className="h-4 w-4" /> {busy ? 'Sending...' : 'Send message'}</button>
      </form>
    </div>
  );
}
