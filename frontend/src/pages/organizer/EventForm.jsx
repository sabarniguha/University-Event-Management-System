import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import api from '../../services/api.js';
import { ErrorBox, Loader } from '../../components/Ui.jsx';
import { CATEGORIES, errMsg, toLocalInput } from '../../utils/format.js';

const blank = {
  title: '',
  description: '',
  venue: '',
  category: 'General',
  bannerUrl: '',
  startsAt: '',
  endsAt: '',
  capacity: 100,
  status: 'DRAFT',
};

export default function EventForm() {
  const { id } = useParams();
  const isEdit = Boolean(id);
  const navigate = useNavigate();
  const [form, setForm] = useState(blank);
  const [loading, setLoading] = useState(isEdit);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!isEdit) return;
    api
      .get(`/events/${id}`)
      .then(({ data }) => {
        const e = data.event;
        setForm({
          title: e.title,
          description: e.description,
          venue: e.venue,
          category: e.category,
          bannerUrl: e.bannerUrl || '',
          startsAt: toLocalInput(e.startsAt),
          endsAt: toLocalInput(e.endsAt),
          capacity: e.capacity,
          status: e.status,
        });
      })
      .catch((e) => setError(errMsg(e)))
      .finally(() => setLoading(false));
  }, [id, isEdit]);

  const onChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    setBusy(true);
    try {
      const payload = {
        ...form,
        capacity: Number(form.capacity),
        startsAt: new Date(form.startsAt).toISOString(),
        endsAt: new Date(form.endsAt).toISOString(),
      };
      if (isEdit) await api.patch(`/events/${id}`, payload);
      else await api.post('/events', payload);
      navigate('/organizer');
    } catch (err) {
      setError(errMsg(err));
    } finally {
      setBusy(false);
    }
  };

  if (loading) return <Loader />;

  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      <Link to="/organizer" className="text-sm text-brand-600 hover:underline">← Back to dashboard</Link>
      <form onSubmit={submit} className="card mt-4 space-y-4">
        <h1 className="text-2xl font-bold">{isEdit ? 'Edit event' : 'Create event'}</h1>
        <ErrorBox message={error} />

        <div>
          <label className="label" htmlFor="title">Title</label>
          <input id="title" name="title" required minLength={3} className="input" value={form.title} onChange={onChange} />
        </div>
        <div>
          <label className="label" htmlFor="description">Description</label>
          <textarea id="description" name="description" required minLength={10} rows={5} className="input" value={form.description} onChange={onChange} />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="label" htmlFor="venue">Venue</label>
            <input id="venue" name="venue" required className="input" value={form.venue} onChange={onChange} />
          </div>
          <div>
            <label className="label" htmlFor="category">Category</label>
            <select id="category" name="category" className="input" value={form.category} onChange={onChange}>
              {CATEGORIES.map((c) => <option key={c}>{c}</option>)}
            </select>
          </div>
          <div>
            <label className="label" htmlFor="startsAt">Starts</label>
            <input id="startsAt" name="startsAt" type="datetime-local" required className="input" value={form.startsAt} onChange={onChange} />
          </div>
          <div>
            <label className="label" htmlFor="endsAt">Ends</label>
            <input id="endsAt" name="endsAt" type="datetime-local" required className="input" value={form.endsAt} onChange={onChange} />
          </div>
          <div>
            <label className="label" htmlFor="capacity">Capacity</label>
            <input id="capacity" name="capacity" type="number" min={1} required className="input" value={form.capacity} onChange={onChange} />
          </div>
          <div>
            <label className="label" htmlFor="status">Status</label>
            <select id="status" name="status" className="input" value={form.status} onChange={onChange}>
              <option value="DRAFT">Draft (hidden)</option>
              <option value="PUBLISHED">Published</option>
              <option value="CANCELLED">Cancelled</option>
            </select>
          </div>
        </div>
        <div>
          <label className="label" htmlFor="bannerUrl">Banner image URL (optional)</label>
          <input id="bannerUrl" name="bannerUrl" type="url" placeholder="https://..." className="input" value={form.bannerUrl} onChange={onChange} />
        </div>

        <div className="flex gap-2">
          <button className="btn-primary" disabled={busy}>{busy ? 'Saving...' : isEdit ? 'Save changes' : 'Create event'}</button>
          <Link to="/organizer" className="btn-outline">Cancel</Link>
        </div>
      </form>
    </div>
  );
}
