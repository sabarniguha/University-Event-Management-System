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
  const [tab, setTab] = useState('student');
  const [org, setOrg] = useState({ organization: '', designation: '', reason: '' });
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
      await register(tab === 'organizer' ? { ...payload, organizer: org } : payload);
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
      title={tab === 'organizer' ? 'Apply for an organiser account' : 'Create your account'}
      subtitle={tab === 'organizer' ? 'Sign up, then an administrator reviews your request. Until it is approved you can use the app as a student.' : 'Join UniEvents to discover and register for campus events.'}
      footer={<>Already have an account? <Link to="/login/student" className="font-medium text-brand-600 hover:underline">Sign in</Link></>}
    >
      <div className="mb-4 grid grid-cols-3 gap-1 rounded-xl bg-slate-100 p-1 text-sm font-medium" role="tablist">
        {[['student', 'Student'], ['organizer', 'Organiser'], ['admin', 'Admin']].map(([k, label]) => (
          <button key={k} type="button" role="tab" aria-selected={tab === k} onClick={() => setTab(k)} className={`rounded-lg px-3 py-2 ${tab === k ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500'}`}>{label}</button>
        ))}
      </div>
      {tab === 'admin' ? (
        <div className="space-y-3 text-sm text-slate-600">
          <p>Admin accounts cannot be created from the public site, so nobody can make themselves an administrator. An existing admin adds new admins in <b>User Management</b>.</p>
          <Link to="/login/admin" className="btn-primary w-full">Go to admin login</Link>
        </div>
      ) : closed ? (
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
          {tab === 'organizer' && (
            <fieldset className="space-y-4 rounded-xl border border-slate-200 p-4">
              <legend className="px-1 text-sm font-semibold text-slate-700">Organiser details</legend>
              <div><label className="label" htmlFor="organization">Club, society or department</label><input id="organization" required minLength={2} className="input" value={org.organization} onChange={(e) => setOrg({ ...org, organization: e.target.value })} placeholder="e.g. UEM Robotics Club" /></div>
              <div><label className="label" htmlFor="designation">Your role (optional)</label><input id="designation" className="input" value={org.designation} onChange={(e) => setOrg({ ...org, designation: e.target.value })} placeholder="e.g. Secretary" /></div>
              <div><label className="label" htmlFor="reason">What events will you run? (optional)</label><textarea id="reason" rows={3} className="input" value={org.reason} onChange={(e) => setOrg({ ...org, reason: e.target.value })} /></div>
            </fieldset>
          )}
          <button className="btn-primary w-full" disabled={busy}>{busy ? 'Creating account...' : tab === 'organizer' ? 'Sign up and request organiser access' : 'Create account'}</button>
        </form>
      )}
    </AuthCard>
  );
}
