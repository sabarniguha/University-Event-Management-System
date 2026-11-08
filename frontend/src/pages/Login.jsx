import { useState } from 'react';
import { Link, Navigate, useLocation, useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { ErrorBox } from '../components/Ui.jsx';
import { ROLE_LOGINS, dashboardPath, errMsg } from '../utils/format.js';

// Role-specific login page: /login/student, /login/organizer, /login/admin
export default function Login() {
  const { type } = useParams();
  const { user, login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [form, setForm] = useState({ email: '', password: '' });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const info = ROLE_LOGINS[type];

  if (user) return <Navigate to={dashboardPath(user.role)} replace />;
  if (!info) return <Navigate to="/login" replace />;

  const onChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const onSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setBusy(true);
    try {
      const u = await login(form.email, form.password, info.role);
      navigate(location.state?.from || dashboardPath(u.role), { replace: true });
    } catch (err) {
      setError(errMsg(err));
    } finally {
      setBusy(false);
    }
  };

  const others = Object.entries(ROLE_LOGINS).filter(([t]) => t !== type);

  return (
    <div className="mx-auto max-w-md px-4 py-12">
      <form onSubmit={onSubmit} className="card space-y-4">
        <div>
          <h1 className="text-2xl font-bold">{info.label} login</h1>
          <p className="mt-1 text-sm text-slate-500">{info.description}</p>
        </div>
        <ErrorBox message={error} />
        <div>
          <label className="label" htmlFor="email">Email</label>
          <input id="email" name="email" type="email" required autoComplete="email" className="input" value={form.email} onChange={onChange} />
        </div>
        <div>
          <label className="label" htmlFor="password">Password</label>
          <input id="password" name="password" type="password" required autoComplete="current-password" className="input" value={form.password} onChange={onChange} />
        </div>
        <button className="btn-primary w-full" disabled={busy}>{busy ? 'Signing in...' : `Sign in as ${info.label.toLowerCase()}`}</button>

        {type === 'student' && (
          <p className="text-center text-sm text-slate-500">
            New here? <Link to="/register" className="font-medium text-brand-600 hover:underline">Create a student account</Link>
          </p>
        )}
        {type !== 'student' && (
          <p className="text-center text-xs text-slate-400">
            {info.label} accounts are created by an administrator.
          </p>
        )}

        <div className="border-t border-slate-100 pt-3 text-center text-sm text-slate-500">
          Not {type === 'admin' ? 'an' : 'a'} {info.label.toLowerCase()}?{' '}
          {others.map(([t, o], i) => (
            <span key={t}>
              <Link to={`/login/${t}`} className="font-medium text-brand-600 hover:underline">{o.label} login</Link>
              {i < others.length - 1 && ' · '}
            </span>
          ))}
        </div>
      </form>
    </div>
  );
}
