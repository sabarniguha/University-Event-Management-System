import { useState } from 'react';
import api from '../services/api.js';
import { useAuth } from '../context/AuthContext.jsx';
import { Badge, ErrorBox, SuccessBox } from '../components/Ui.jsx';
import { errMsg } from '../utils/format.js';

export default function Profile() {
  const { user, setUser } = useAuth();
  const [form, setForm] = useState({
    name: user.name || '',
    department: user.department || '',
    phone: user.phone || '',
  });
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);

  const onChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    setMessage('');
    setBusy(true);
    try {
      const { data } = await api.patch('/auth/me', form);
      setUser(data.user);
      setMessage('Profile updated.');
    } catch (err) {
      setError(errMsg(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mx-auto max-w-lg px-4 py-8">
      <form onSubmit={submit} className="card space-y-4">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">My profile</h1>
          <Badge>{user.role}</Badge>
        </div>
        <ErrorBox message={error} />
        <SuccessBox message={message} />
        <div>
          <label className="label">Email</label>
          <input className="input bg-slate-100" value={user.email} disabled />
        </div>
        <div>
          <label className="label" htmlFor="name">Name</label>
          <input id="name" name="name" required minLength={2} className="input" value={form.name} onChange={onChange} />
        </div>
        <div>
          <label className="label" htmlFor="department">Department</label>
          <input id="department" name="department" className="input" value={form.department} onChange={onChange} />
        </div>
        <div>
          <label className="label" htmlFor="phone">Phone</label>
          <input id="phone" name="phone" className="input" value={form.phone} onChange={onChange} />
        </div>
        <button className="btn-primary" disabled={busy}>{busy ? 'Saving...' : 'Save changes'}</button>
      </form>
    </div>
  );
}
