import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Camera, X } from 'lucide-react';
import api, { uploadImage } from '../../services/api.js';
import { useAuth } from '../../context/AuthContext.jsx';
import { useToast } from '../../context/ToastContext.jsx';
import DashboardShell from '../../components/DashboardShell.jsx';
import { Avatar, Badge, ErrorBox } from '../../components/common/Ui.jsx';
import { DEPARTMENTS, errMsg } from '../../utils/format.js';

export default function Profile() {
  const { user, setUser } = useAuth();
  const toast = useToast();
  const [form, setForm] = useState({
    name: user.name || '', department: user.department || '', phone: user.phone || '', studentId: user.studentId || '',
    year: user.year || '', college: user.college || '', bio: user.bio || '', avatarUrl: user.avatarUrl || '',
  });
  const [skills, setSkills] = useState(user.skills || []);
  const [skill, setSkill] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  const addSkill = () => {
    const v = skill.trim();
    if (v && !skills.includes(v) && skills.length < 20) setSkills([...skills, v]);
    setSkill('');
  };

  const pickPhoto = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 1.5 * 1024 * 1024) return toast.error('Choose an image under 1.5 MB.');
    try {
      const url = await uploadImage(file);
      setForm((f) => ({ ...f, avatarUrl: url }));
    } catch (err) {
      toast.error(errMsg(err));
    }
    return undefined;
  };

  const save = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      const { data } = await api.patch('/auth/me', { ...form, year: form.year || null, skills });
      setUser(data.user);
      toast.success('Profile saved.');
    } catch (err) {
      setError(errMsg(err));
    } finally {
      setBusy(false);
    }
  };

  const student = user.role === 'STUDENT';
  return (
    <DashboardShell title="My profile" subtitle="Your details are used for event eligibility and on certificates.">
      <form onSubmit={save} className="grid gap-6 lg:grid-cols-[280px_1fr]">
        <div className="card flex flex-col items-center text-center">
          <div className="relative">
            <Avatar user={{ ...user, avatarUrl: form.avatarUrl }} size={96} />
            <label className="absolute -bottom-1 -right-1 flex h-8 w-8 cursor-pointer items-center justify-center rounded-full bg-brand-600 text-white shadow" title="Change photo">
              <Camera className="h-4 w-4" />
              <input type="file" accept="image/png,image/jpeg,image/webp,image/gif" className="sr-only" onChange={pickPhoto} aria-label="Upload profile photo" />
            </label>
          </div>
          {form.avatarUrl && <button type="button" className="mt-2 text-xs text-slate-500 hover:text-red-600" onClick={() => setForm({ ...form, avatarUrl: '' })}>Remove photo</button>}
          <p className="mt-3 font-semibold text-slate-900">{user.name}</p>
          <p className="text-sm text-slate-500">{user.email}</p>
          <div className="mt-2 flex gap-2"><Badge>{user.role}</Badge>{user.emailVerifiedAt ? <Badge tone="green">Email verified</Badge> : <Badge tone="yellow">Email not verified</Badge>}</div>
          <Link to="/settings" className="mt-4 text-sm text-brand-600 hover:underline">Password and preferences</Link>
        </div>

        <div className="card space-y-4">
          <ErrorBox message={error} />
          <div className="grid gap-4 sm:grid-cols-2">
            <div><label className="label" htmlFor="p-name">Full name</label><input id="p-name" className="input" required minLength={2} value={form.name} onChange={set('name')} /></div>
            <div><label className="label" htmlFor="p-phone">Phone</label><input id="p-phone" className="input" value={form.phone} onChange={set('phone')} /></div>
            <div>
              <label className="label" htmlFor="p-dept">Department</label>
              <select id="p-dept" className="input" value={form.department} onChange={set('department')}>
                <option value="">Select...</option>
                {[...new Set([...(form.department ? [form.department] : []), ...DEPARTMENTS])].map((d) => <option key={d}>{d}</option>)}
              </select>
            </div>
            <div><label className="label" htmlFor="p-college">College</label><input id="p-college" className="input" value={form.college} onChange={set('college')} /></div>
            {student && (
              <>
                <div><label className="label" htmlFor="p-sid">Student ID</label><input id="p-sid" className="input" value={form.studentId} onChange={set('studentId')} /></div>
                <div>
                  <label className="label" htmlFor="p-year">Year</label>
                  <select id="p-year" className="input" value={form.year} onChange={set('year')}>
                    <option value="">Select...</option>
                    {[1, 2, 3, 4, 5].map((y) => <option key={y} value={y}>Year {y}</option>)}
                  </select>
                </div>
              </>
            )}
          </div>
          <div><label className="label" htmlFor="p-bio">About you</label><textarea id="p-bio" className="input min-h-[80px]" maxLength={500} value={form.bio} onChange={set('bio')} /></div>
          <div>
            <label className="label" htmlFor="p-skill">Skills and interests</label>
            <div className="flex gap-2">
              <input id="p-skill" className="input" value={skill} placeholder="e.g. React, Robotics" onChange={(e) => setSkill(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addSkill(); } }} />
              <button type="button" className="btn-outline" onClick={addSkill}>Add</button>
            </div>
            <div className="mt-2 flex flex-wrap gap-2">
              {skills.map((s) => (
                <span key={s} className="inline-flex items-center gap-1 rounded-full bg-brand-50 px-3 py-1 text-xs font-medium text-brand-700">
                  {s}<button type="button" onClick={() => setSkills(skills.filter((x) => x !== s))} aria-label={`Remove ${s}`}><X className="h-3 w-3" /></button>
                </span>
              ))}
            </div>
          </div>
          <button className="btn-primary" disabled={busy}>{busy ? 'Saving...' : 'Save changes'}</button>
        </div>
      </form>
    </DashboardShell>
  );
}
