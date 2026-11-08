import { useState } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { ErrorBox } from '../components/Ui.jsx';
import { dashboardPath, errMsg } from '../utils/format.js';

export default function Register() {
  const { user, register } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ name: '', email: '', password: '', department: '', phone: '' });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  if (user) return <Navigate to={dashboardPath(user.role)} replace />;

  const onChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const onSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setBusy(true);
    try {
      const u = await register(form);
      navigate(dashboardPath(u.role), { replace: true });
    } catch (err) {
      setError(errMsg(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mx-auto max-w-md px-4 py-12">
      <form onSubmit={onSubmit} className="card space-y-4">
        <h1 className="text-2xl font-bold">Create your account</h1>
        <p className="text-sm text-slate-500">Student accounts are created here. Organiser access is granted by an administrator.</p>
        <ErrorBox message={error} />
        <div>
          <label className="label" htmlFor="name">Full name</label>
          <input id="name" name="name" required className="input" value={form.name} onChange={onChange} />
        </div>
        <div>
          <label className="label" htmlFor="email">Email</label>
          <input id="email" name="email" type="email" required autoComplete="email" className="input" value={form.email} onChange={onChange} />
        </div>
        <div>
          <label className="label" htmlFor="password">Password (min 8 characters)</label>
          <input id="password" name="password" type="password" required minLength={8} autoComplete="new-password" className="input" value={form.password} onChange={onChange} />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label" htmlFor="department">Department</label>
            <input id="department" name="department" className="input" value={form.department} onChange={onChange} />
          </div>
          <div>
            <label className="label" htmlFor="phone">Phone</label>
            <input id="phone" name="phone" className="input" value={form.phone} onChange={onChange} />
          </div>
        </div>
        <button className="btn-primary w-full" disabled={busy}>{busy ? 'Creating...' : 'Sign up'}</button>
        <p className="text-center text-sm text-slate-500">
          Already registered? <Link to="/login" className="font-medium text-brand-600 hover:underline">Sign in</Link>
        </p>
      </form>
    </div>
  );
}
