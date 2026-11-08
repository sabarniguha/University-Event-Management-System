import { useCallback, useEffect, useState } from 'react';
import api from '../services/api.js';
import { useAuth } from '../context/AuthContext.jsx';
import { Badge, EmptyState, ErrorBox, Loader, SuccessBox } from '../components/Ui.jsx';
import { errMsg, fmtDate } from '../utils/format.js';

const blank = { title: '', content: '', audience: 'ALL', priority: 'NORMAL', status: 'PUBLISHED' };

export default function Announcements() {
  const { user } = useAuth();
  const canCreate = user.role === 'ADMIN' || user.role === 'ORGANIZER';

  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [form, setForm] = useState(blank);
  const [editingId, setEditingId] = useState(null);
  const [showForm, setShowForm] = useState(false);

  const load = useCallback(() => {
    return api
      .get('/announcements')
      .then((res) => setItems(res.data.announcements))
      .catch((e) => setError(errMsg(e)))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(); }, [load]);

  const canEdit = (a) => user.role === 'ADMIN' || a.authorId === user.id || a.author?.id === user.id;

  const onChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const startEdit = (a) => {
    setEditingId(a.id);
    setForm({ title: a.title, content: a.content, audience: a.audience, priority: a.priority, status: a.status });
    setShowForm(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const reset = () => {
    setEditingId(null);
    setForm(blank);
    setShowForm(false);
  };

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    setMessage('');
    try {
      if (editingId) await api.patch(`/announcements/${editingId}`, form);
      else await api.post('/announcements', form);
      setMessage(editingId ? 'Announcement updated.' : 'Announcement created.');
      reset();
      await load();
    } catch (err) {
      setError(errMsg(err));
    }
  };

  const toggle = async (a) => {
    setError('');
    try {
      await api.patch(`/announcements/${a.id}`, { status: a.status === 'PUBLISHED' ? 'DRAFT' : 'PUBLISHED' });
      await load();
    } catch (err) {
      setError(errMsg(err));
    }
  };

  const remove = async (a) => {
    if (!window.confirm(`Delete "${a.title}"?`)) return;
    setError('');
    try {
      await api.delete(`/announcements/${a.id}`);
      await load();
    } catch (err) {
      setError(errMsg(err));
    }
  };

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold">Announcements</h1>
        {canCreate && !showForm && (
          <button className="btn-primary" onClick={() => setShowForm(true)}>New announcement</button>
        )}
      </div>

      <div className="space-y-4">
        <ErrorBox message={error} />
        <SuccessBox message={message} />

        {showForm && (
          <form onSubmit={submit} className="card space-y-4">
            <h2 className="font-semibold">{editingId ? 'Edit announcement' : 'New announcement'}</h2>
            <div>
              <label className="label" htmlFor="title">Title</label>
              <input id="title" name="title" required minLength={3} className="input" value={form.title} onChange={onChange} />
            </div>
            <div>
              <label className="label" htmlFor="content">Message</label>
              <textarea id="content" name="content" required minLength={5} rows={4} className="input" value={form.content} onChange={onChange} />
            </div>
            <div className="grid gap-3 sm:grid-cols-3">
              <div>
                <label className="label" htmlFor="audience">Audience</label>
                <select id="audience" name="audience" className="input" value={form.audience} onChange={onChange}>
                  <option value="ALL">Everyone</option>
                  <option value="STUDENTS">Students only</option>
                  <option value="ORGANIZERS">Organisers only</option>
                </select>
              </div>
              <div>
                <label className="label" htmlFor="priority">Priority</label>
                <select id="priority" name="priority" className="input" value={form.priority} onChange={onChange}>
                  <option value="NORMAL">Normal</option>
                  <option value="IMPORTANT">Important</option>
                  <option value="URGENT">Urgent</option>
                </select>
              </div>
              <div>
                <label className="label" htmlFor="status">Status</label>
                <select id="status" name="status" className="input" value={form.status} onChange={onChange}>
                  <option value="PUBLISHED">Published</option>
                  <option value="DRAFT">Draft</option>
                </select>
              </div>
            </div>
            <div className="flex gap-2">
              <button className="btn-primary">{editingId ? 'Save changes' : 'Create'}</button>
              <button type="button" className="btn-outline" onClick={reset}>Cancel</button>
            </div>
          </form>
        )}

        {loading ? (
          <Loader />
        ) : items.length === 0 ? (
          <EmptyState>No announcements yet.</EmptyState>
        ) : (
          items.map((a) => (
            <article key={a.id} className="card">
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="font-semibold">{a.title}</h3>
                <Badge>{a.priority}</Badge>
                {a.status === 'DRAFT' && <Badge>DRAFT</Badge>}
                <Badge tone="indigo">{a.audience}</Badge>
                <span className="ml-auto text-xs text-slate-400">{fmtDate(a.publishedAt || a.createdAt)}</span>
              </div>
              <p className="mt-2 whitespace-pre-line text-sm text-slate-600">{a.content}</p>
              <p className="mt-2 text-xs text-slate-400">By {a.author?.name}</p>
              {canCreate && canEdit(a) && (
                <div className="mt-3 flex gap-2">
                  <button className="btn-outline btn-sm" onClick={() => startEdit(a)}>Edit</button>
                  <button className="btn-outline btn-sm" onClick={() => toggle(a)}>
                    {a.status === 'PUBLISHED' ? 'Unpublish' : 'Publish'}
                  </button>
                  <button className="btn-danger btn-sm" onClick={() => remove(a)}>Delete</button>
                </div>
              )}
            </article>
          ))
        )}
      </div>
    </div>
  );
}
