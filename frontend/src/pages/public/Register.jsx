import { useState } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext.jsx';
import useFetch from '../../hooks/useFetch.js';
import AuthCard from '../../components/layout/AuthCard.jsx';
import PasswordInput from '../../components/forms/PasswordInput.jsx';
import { ErrorBox } from '../../components/common/Ui.jsx';
import { DEPARTMENTS, dashboardPath, errMsg } from '../../utils/format.js';

export default function Register() {
  const { user, register } = useAuth();
  const navigate = useNavigate();
  const { data: pub } = useFetch('/public/settings');
  const [form, setForm] = useState({ name: '', email: '', password: '', confirm: '', department: '', studentId: '', year: '', college: '' });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  if (user) return <Navigate to={dashboardPath(user.role)} replace />;
  const set = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    if (form.password !== form.confirm) return setError('Passwords do not match');
    setBusy(true);
    try {
      const { confirm, ...payload } = form;
      await register(payload);
      navigate('/student', { replace: true });
    } catch (err) {
      setError(errMsg(err));
    } finally {
      setBusy(false);
    }
    return undefined;
  };

  const closed = pub?.settings && pub.settings.allowStudentSignup === false;
  return (
    <AuthCard
      wide
      title="Create your student account"
      subtitle="Join UniEvents to discover and register for campus events."
      footer={<>Already have an account? <Link to="/login/student" className="font-medium text-brand-600 hover:underline">Sign in</Link></>}
    >
      {closed ? (
        <p className="rounded-xl bg-yellow-100 px-4 py-3 text-sm text-yellow-800">New sign-ups are currently closed. Please contact your administrator.</p>
      ) : (
        <form onSubmit={submit} className="space-y-4">
          <ErrorBox message={error} />
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2"><label className="label" htmlFor="name">Full name</label><input id="name" name="name" required minLength={2} autoComplete="name" className="input" value={form.name} onChange={set} /></div>
            <div className="sm:col-span-2"><label className="label" htmlFor="email">Email</label><input id="email" name="email" type="email" required autoComplete="email" className="input" value={form.email} onChange={set} /></div>
            <div><label className="label" htmlFor="password">Password</label><PasswordInput id="password" name="password" autoComplete="new-password" minLength={8} value={form.password} onChange={set} placeholder="At least 8 characters" /></div>
            <div><label className="label" htmlFor="confirm">Confirm password</label><PasswordInput id="confirm" name="confirm" autoComplete="new-password" value={form.confirm} onChange={set} /></div>
            <div>
              <label className="label" htmlFor="department">Department</label>
              <select id="department" name="department" className="input" value={form.department} onChange={set}>
                <option value="">Select...</option>
                {DEPARTMENTS.map((d) => <option key={d}>{d}</option>)}
              </select>
            </div>
            <div>
              <label className="label" htmlFor="year">Year</label>
              <select id="year" name="year" className="input" value={form.year} onChange={set}>
                <option value="">Select...</option>
                {[1, 2, 3, 4, 5].map((y) => <option key={y} value={y}>Year {y}</option>)}
              </select>
            </div>
            <div><label className="label" htmlFor="studentId">Student ID (optional)</label><input id="studentId" name="studentId" className="input" value={form.studentId} onChange={set} /></div>
            <div><label className="label" htmlFor="college">College (optional)</label><input id="college" name="college" className="input" value={form.college} onChange={set} /></div>
          </div>
          <button className="btn-primary w-full" disabled={busy}>{busy ? 'Creating account...' : 'Create account'}</button>
        </form>
      )}
    </AuthCard>
  );
}
