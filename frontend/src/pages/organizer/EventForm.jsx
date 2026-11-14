import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import api from '../../services/api.js';
import { useAuth } from '../../context/AuthContext.jsx';
import { useToast } from '../../context/ToastContext.jsx';
import useFetch from '../../hooks/useFetch.js';
import DashboardShell from '../../components/DashboardShell.jsx';
import ImageUpload from '../../components/forms/ImageUpload.jsx';
import ListEditor from '../../components/forms/ListEditor.jsx';
import { Badge, ErrorBox, Loader } from '../../components/common/Ui.jsx';
import { DEPARTMENTS, EVENT_TYPES, errMsg, toLocalInput } from '../../utils/format.js';

const EMPTY = {
  title: '', description: '', category: 'General', eventType: '', bannerUrl: '', startsAt: '', endsAt: '', registrationDeadline: '',
  mode: 'OFFLINE', venue: '', onlineUrl: '', capacity: 100, waitlistEnabled: true, fee: 0, requiresRegistrationApproval: false,
  department: '', eligibility: '', requirements: '', contactEmail: '', contactPhone: '', terms: '', featured: false,
};

const Section = ({ title, hint, children }) => (
  <section className="card space-y-4">
    <div><h2 className="font-semibold text-slate-900">{title}</h2>{hint && <p className="text-xs text-slate-500">{hint}</p>}</div>
    {children}
  </section>
);

export default function EventForm() {
  const { id } = useParams();
  const editing = Boolean(id);
  const { user } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();
  const { data: cats } = useFetch('/categories');
  const { data: pub } = useFetch('/public/settings');
  const [form, setForm] = useState(EMPTY);
  const [lists, setLists] = useState({ agenda: [], speakers: [], team: [], faqs: [] });
  const [status, setStatus] = useState('DRAFT');
  const [rejection, setRejection] = useState('');
  const [loading, setLoading] = useState(editing);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!editing) return;
    api.get(`/events/${id}`).then(({ data }) => {
      const e = data.event;
      setForm({
        ...EMPTY, ...Object.fromEntries(Object.keys(EMPTY).map((k) => [k, e[k] ?? EMPTY[k]])),
        onlineUrl: e.onlineUrl === 'hidden' ? '' : e.onlineUrl || '',
        startsAt: toLocalInput(e.startsAt), endsAt: toLocalInput(e.endsAt),
        registrationDeadline: e.registrationDeadline ? toLocalInput(e.registrationDeadline) : '',
      });
      setLists({ agenda: e.agenda, speakers: e.speakers, team: e.team, faqs: e.faqs });
      setStatus(e.status);
      setRejection(e.rejectionReason || '');
    }).catch((err) => setError(errMsg(err))).finally(() => setLoading(false));
  }, [id, editing]);

  const set = (k) => (e) => setForm({ ...form, [k]: e.target.type === 'checkbox' ? e.target.checked : e.target.value });
  const list = (k) => (items) => setLists({ ...lists, [k]: items });
  const needsApproval = user.role !== 'ADMIN' && pub?.settings?.requireEventApproval !== false;

  const save = async (targetStatus) => {
    setError('');
    setBusy(true);
    try {
      const payload = {
        ...form,
        capacity: Number(form.capacity), fee: Number(form.fee),
        startsAt: form.startsAt ? new Date(form.startsAt).toISOString() : '',
        endsAt: form.endsAt ? new Date(form.endsAt).toISOString() : '',
        registrationDeadline: form.registrationDeadline ? new Date(form.registrationDeadline).toISOString() : null,
        ...lists,
        status: targetStatus,
      };
      if (user.role !== 'ADMIN') delete payload.featured;
      const { data } = editing ? await api.patch(`/events/${id}`, payload) : await api.post('/events', payload);
      const s = data.event.status;
      toast.success(s === 'PENDING_APPROVAL' ? 'Submitted for admin approval.' : s === 'PUBLISHED' ? 'Event published.' : 'Draft saved.');
      navigate('/organizer/events');
    } catch (err) {
      setError(errMsg(err));
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } finally {
      setBusy(false);
    }
  };

  if (loading) return <Loader />;
  const live = status === 'PUBLISHED';
  return (
    <DashboardShell title={editing ? 'Edit event' : 'Create event'} subtitle="Fill in the details. Nothing goes live until you publish or submit it." actions={editing && <Badge>{status}</Badge>}>
      {status === 'REJECTED' && <ErrorBox message={`This event was not approved: ${rejection}. Update it and submit again.`} />}
      <ErrorBox message={error} />
      <form onSubmit={(e) => { e.preventDefault(); save('PUBLISHED'); }} className="space-y-6">
        <Section title="Basics">
          <div><label className="label" htmlFor="title">Title</label><input id="title" className="input" required minLength={3} maxLength={200} value={form.title} onChange={set('title')} /></div>
          <div><label className="label" htmlFor="desc">Description</label><textarea id="desc" className="input min-h-[140px]" required minLength={10} value={form.description} onChange={set('description')} /></div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="label" htmlFor="cat">Category</label>
              <select id="cat" className="input" value={form.category} onChange={set('category')}>
                {[...new Set([form.category, ...(cats?.categories || []).map((c) => c.name)])].map((c) => <option key={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className="label" htmlFor="type">Event type</label>
              <select id="type" className="input" value={form.eventType} onChange={set('eventType')}>
                <option value="">Not specified</option>
                {EVENT_TYPES.map((t) => <option key={t}>{t}</option>)}
              </select>
            </div>
          </div>
          <ImageUpload value={form.bannerUrl} onChange={(v) => setForm({ ...form, bannerUrl: v })} />
        </Section>

        <Section title="Schedule and place">
          <div className="grid gap-4 sm:grid-cols-3">
            <div><label className="label" htmlFor="st">Starts</label><input id="st" type="datetime-local" required className="input" value={form.startsAt} onChange={set('startsAt')} /></div>
            <div><label className="label" htmlFor="en">Ends</label><input id="en" type="datetime-local" required className="input" value={form.endsAt} onChange={set('endsAt')} /></div>
            <div><label className="label" htmlFor="dl">Registration deadline</label><input id="dl" type="datetime-local" className="input" value={form.registrationDeadline} onChange={set('registrationDeadline')} /></div>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="label" htmlFor="mode">Format</label>
              <select id="mode" className="input" value={form.mode} onChange={set('mode')}>
                <option value="OFFLINE">In person</option><option value="ONLINE">Online</option><option value="HYBRID">Hybrid</option>
              </select>
            </div>
            <div><label className="label" htmlFor="venue">Venue</label><input id="venue" className="input" required minLength={2} value={form.venue} onChange={set('venue')} placeholder={form.mode === 'ONLINE' ? 'e.g. Google Meet' : ''} /></div>
          </div>
          {form.mode !== 'OFFLINE' && (
            <div><label className="label" htmlFor="url">Meeting link</label><input id="url" type="url" required className="input" value={form.onlineUrl} onChange={set('onlineUrl')} placeholder="https://" /><p className="mt-1 text-xs text-slate-500">Only registered students can see this link.</p></div>
          )}
        </Section>

        <Section title="Registration">
          <div className="grid gap-4 sm:grid-cols-2">
            <div><label className="label" htmlFor="cap">Capacity</label><input id="cap" type="number" min={1} required className="input" value={form.capacity} onChange={set('capacity')} /></div>
            <div><label className="label" htmlFor="fee">Fee in rupees (0 = free)</label><input id="fee" type="number" min={0} className="input" value={form.fee} onChange={set('fee')} /><p className="mt-1 text-xs text-slate-500">Shown to students. Payment is not collected on the platform.</p></div>
          </div>
          <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={form.waitlistEnabled} onChange={set('waitlistEnabled')} /> Enable waitlist when the event is full</label>
          <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={form.requiresRegistrationApproval} onChange={set('requiresRegistrationApproval')} /> I want to approve each registration manually</label>
          {user.role === 'ADMIN' && <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={form.featured} onChange={set('featured')} /> Feature on the home page</label>}
        </Section>

        <Section title="Eligibility" hint="Leave empty if anyone can join.">
          <div>
            <label className="label" htmlFor="dep">Restrict to department</label>
            <select id="dep" className="input" value={form.department} onChange={set('department')}>
              <option value="">All departments</option>
              {[...new Set([form.department, ...DEPARTMENTS].filter(Boolean))].map((d) => <option key={d}>{d}</option>)}
            </select>
          </div>
          <div><label className="label" htmlFor="elig">Eligibility notes</label><textarea id="elig" className="input" value={form.eligibility} onChange={set('eligibility')} /></div>
          <div><label className="label" htmlFor="req">Requirements (what to bring)</label><textarea id="req" className="input" value={form.requirements} onChange={set('requirements')} /></div>
        </Section>

        <Section title="Programme">
          <ListEditor title="Agenda" items={lists.agenda} onChange={list('agenda')} blank={{ time: '', title: '', description: '' }} addLabel="Add item"
            fields={[{ key: 'time', label: 'Time (e.g. 10:00)' }, { key: 'title', label: 'Title', required: true }, { key: 'description', label: 'Description', multiline: true }]} />
          <ListEditor title="Speakers" items={lists.speakers} onChange={list('speakers')} blank={{ name: '', title: '' }} addLabel="Add speaker"
            fields={[{ key: 'name', label: 'Name', required: true }, { key: 'title', label: 'Title / company' }, { key: 'bio', label: 'Short bio', multiline: true }]} />
          <ListEditor title="Organising team" items={lists.team} onChange={list('team')} blank={{ name: '', role: '' }} addLabel="Add member"
            fields={[{ key: 'name', label: 'Name', required: true }, { key: 'role', label: 'Role' }]} />
          <ListEditor title="FAQs" items={lists.faqs} onChange={list('faqs')} blank={{ question: '', answer: '' }} addLabel="Add FAQ"
            fields={[{ key: 'question', label: 'Question', required: true, wide: true }, { key: 'answer', label: 'Answer', required: true, multiline: true }]} />
        </Section>

        <Section title="Contact and terms">
          <div className="grid gap-4 sm:grid-cols-2">
            <div><label className="label" htmlFor="ce">Contact email</label><input id="ce" type="email" className="input" value={form.contactEmail} onChange={set('contactEmail')} /></div>
            <div><label className="label" htmlFor="cp">Contact phone</label><input id="cp" className="input" value={form.contactPhone} onChange={set('contactPhone')} /></div>
          </div>
          <div><label className="label" htmlFor="terms">Terms and conditions</label><textarea id="terms" className="input min-h-[90px]" value={form.terms} onChange={set('terms')} /></div>
        </Section>

        <div className="sticky bottom-0 -mx-4 flex flex-wrap items-center justify-end gap-2 border-t border-slate-200 bg-white/90 px-4 py-3 backdrop-blur sm:mx-0 sm:rounded-2xl sm:border">
          {!live && <button type="button" className="btn-outline" disabled={busy} onClick={() => save('DRAFT')}>Save as draft</button>}
          <button className="btn-primary" disabled={busy}>
            {busy ? 'Saving...' : live ? 'Save changes' : needsApproval ? 'Submit for approval' : 'Publish event'}
          </button>
        </div>
      </form>
    </DashboardShell>
  );
}
