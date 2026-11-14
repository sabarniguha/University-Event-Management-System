import { useState } from 'react';
import { Link, Navigate, useLocation, useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext.jsx';
import AuthCard from '../../components/layout/AuthCard.jsx';
import PasswordInput from '../../components/forms/PasswordInput.jsx';
import { ErrorBox } from '../../components/common/Ui.jsx';
import { ROLE_LOGINS, dashboardPath, errMsg } from '../../utils/format.js';

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
    <AuthCard
      title={`${info.label} login`}
      subtitle={info.description}
      footer={
        <>
          Not {type === 'admin' ? 'an' : 'a'} {info.label.toLowerCase()}?{' '}
          {others.map(([t, o], i) => (
            <span key={t}><Link to={`/login/${t}`} className="font-medium text-brand-600 hover:underline">{o.label} login</Link>{i < others.length - 1 && ' · '}</span>
          ))}
        </>
      }
    >
      <form onSubmit={onSubmit} className="space-y-4">
        <ErrorBox message={error} />
        <div>
          <label className="label" htmlFor="email">Email</label>
          <input id="email" name="email" type="email" required autoComplete="email" className="input" value={form.email} onChange={onChange} />
        </div>
        <div>
          <div className="flex items-center justify-between">
            <label className="label" htmlFor="password">Password</label>
            <Link to="/forgot-password" className="mb-1 text-xs font-medium text-brand-600 hover:underline">Forgot password?</Link>
          </div>
          <PasswordInput id="password" name="password" value={form.password} onChange={onChange} />
        </div>
        <button className="btn-primary w-full" disabled={busy}>{busy ? 'Signing in...' : `Sign in as ${info.label.toLowerCase()}`}</button>
        {type === 'student' ? (
          <p className="text-center text-sm text-slate-500">New here? <Link to="/register" className="font-medium text-brand-600 hover:underline">Create a student account</Link></p>
        ) : (
          <p className="text-center text-xs text-slate-400">{info.label} accounts are created by an administrator. Students can request organiser access from their dashboard.</p>
        )}
      </form>
    </AuthCard>
  );
}
