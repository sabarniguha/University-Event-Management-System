import { useState } from 'react';
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { ErrorBox } from '../components/Ui.jsx';
import { dashboardPath, errMsg } from '../utils/format.js';

export default function Login() {
  const { user, login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [form, setForm] = useState({ email: '', password: '' });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  if (user) return <Navigate to={dashboardPath(user.role)} replace />;

  const onChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const onSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setBusy(true);
    try {
      const u = await login(form.email, form.password);
      navigate(location.state?.from || dashboardPath(u.role), { replace: true });
    } catch (err) {
      setError(errMsg(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mx-auto max-w-md px-4 py-12">
      <form onSubmit={onSubmit} className="card space-y-4">
        <h1 className="text-2xl font-bold">Welcome back</h1>
        <ErrorBox message={error} />
        <div>
          <label className="label" htmlFor="email">Email</label>
          <input id="email" name="email" type="email" required autoComplete="email" className="input" value={form.email} onChange={onChange} />
        </div>
        <div>
          <label className="label" htmlFor="password">Password</label>
          <input id="password" name="password" type="password" required autoComplete="current-password" className="input" value={form.password} onChange={onChange} />
        </div>
        <button className="btn-primary w-full" disabled={busy}>{busy ? 'Signing in...' : 'Sign in'}</button>
        <p className="text-center text-sm text-slate-500">
          New here? <Link to="/register" className="font-medium text-brand-600 hover:underline">Create an account</Link>
        </p>
      </form>
    </div>
  );
}
