import { useState } from 'react';
import { KeyRound, Plus, Trash2, UserX, UserCheck } from 'lucide-react';
import api from '../../services/api.js';
import { useAuth } from '../../context/AuthContext.jsx';
import { useToast } from '../../context/ToastContext.jsx';
import useFetch from '../../hooks/useFetch.js';
import useDebounce from '../../hooks/useDebounce.js';
import DashboardShell from '../../components/DashboardShell.jsx';
import { Badge, ConfirmDialog, DataTable, EmptyState, ErrorBox, Modal, Pagination, SearchInput } from '../../components/common/Ui.jsx';
import { errMsg, fmtDay } from '../../utils/format.js';
import OrganizerRequests from './OrganizerRequests.jsx';

const COPY = {
  all: { title: 'User management', sub: 'Every account on the platform.', path: '/admin/users' },
  STUDENT: { title: 'Student management', sub: 'Student accounts, their activity and status.', path: '/admin/students' },
  ORGANIZER: { title: 'Organiser management', sub: 'Organisers, their events and pending access requests.', path: '/admin/organizers' },
};

export default function UserManagement({ role = 'all' }) {
  const { user: me } = useAuth();
  const toast = useToast();
  const copy = COPY[role];
  const [q, setQ] = useState('');
  const [status, setStatus] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [page, setPage] = useState(1);
  const dq = useDebounce(q);
  const params = { q: dq, status, page, limit: 15, ...(role === 'all' && roleFilter ? { role: roleFilter } : {}) };
  const { data, loading, error, reload } = useFetch(copy.path, params);
  const [create, setCreate] = useState(false);
  const [pwTarget, setPwTarget] = useState(null);
  const [delTarget, setDelTarget] = useState(null);
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState({ name: '', email: '', password: '', role: 'ORGANIZER', department: '' });
  const [newPw, setNewPw] = useState('');

  const run = async (fn, ok) => {
    setBusy(true);
    try { await fn(); toast.success(ok); reload(); return true; } catch (e) { toast.error(errMsg(e)); return false; } finally { setBusy(false); }
  };

  const toggleActive = (u) => run(() => api.patch(`/admin/users/${u.id}`, { isActive: !u.isActive }), u.isActive ? 'Account deactivated.' : 'Account activated.');
  const changeRole = (u, r) => run(() => api.patch(`/admin/users/${u.id}/role`, { role: r }), 'Role updated.');

  const users = data?.users || [];
  return (
    <DashboardShell title={copy.title} subtitle={copy.sub} actions={<button className="btn-primary" onClick={() => setCreate(true)}><Plus className="h-4 w-4" /> Create account</button>}>
      <ErrorBox message={error} />
      {role === 'ORGANIZER' && <OrganizerRequests onChange={reload} />}
      <div className="flex flex-col gap-3 sm:flex-row">
        <SearchInput className="flex-1" value={q} onChange={(v) => { setQ(v); setPage(1); }} placeholder="Search by name, email, student ID or department" />
        {role === 'all' && (
          <select className="input sm:w-40" value={roleFilter} onChange={(e) => { setRoleFilter(e.target.value); setPage(1); }} aria-label="Filter by role">
            <option value="">All roles</option><option value="STUDENT">Students</option><option value="ORGANIZER">Organisers</option><option value="ADMIN">Admins</option>
          </select>
        )}
        <select className="input sm:w-40" value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }} aria-label="Filter by status">
          <option value="">Any status</option><option value="active">Active</option><option value="inactive">Deactivated</option>
        </select>
      </div>
      <DataTable columns={['User', 'Role', 'Department', role === 'ORGANIZER' ? 'Events' : role === 'STUDENT' ? 'Registrations' : 'Joined', 'Status', '']} loading={loading}
        empty={users.length === 0 && <div className="p-6"><EmptyState title="No users found">Try a different search.</EmptyState></div>}>
        {users.map((u) => (
          <tr key={u.id}>
            <td className="td"><p className="font-medium text-slate-900">{u.name}</p><p className="text-xs text-slate-500">{u.email}{u.studentId ? ` · ${u.studentId}` : ''}</p></td>
            <td className="td">
              {u.id === me.id ? <Badge>{u.role}</Badge> : (
                <select className="input !w-auto !py-1 text-xs" value={u.role} disabled={busy} onChange={(e) => changeRole(u, e.target.value)} aria-label={`Role for ${u.name}`}>
                  <option value="STUDENT">Student</option><option value="ORGANIZER">Organiser</option><option value="ADMIN">Admin</option>
                </select>
              )}
            </td>
            <td className="td">{u.department || '-'}</td>
            <td className="td">{u._count ? (role === 'ORGANIZER' ? u._count.events : u._count.registrations) : fmtDay(u.createdAt)}</td>
            <td className="td">{u.isActive ? <Badge tone="green">Active</Badge> : <Badge tone="red">Deactivated</Badge>}</td>
            <td className="td">
              {u.id !== me.id && (
                <div className="flex justify-end gap-1">
                  <button className="btn-ghost btn-sm" title={u.isActive ? 'Deactivate' : 'Activate'} onClick={() => toggleActive(u)}>{u.isActive ? <UserX className="h-4 w-4" /> : <UserCheck className="h-4 w-4" />}</button>
                  <button className="btn-ghost btn-sm" title="Set new password" onClick={() => { setPwTarget(u); setNewPw(''); }}><KeyRound className="h-4 w-4" /></button>
                  <button className="btn-ghost btn-sm text-red-600" title="Delete" onClick={() => setDelTarget(u)}><Trash2 className="h-4 w-4" /></button>
                </div>
              )}
            </td>
          </tr>
        ))}
      </DataTable>
      <Pagination pagination={data?.pagination} onPage={setPage} />

      <Modal open={create} onClose={() => setCreate(false)} title="Create account"
        footer={<><button className="btn-outline" onClick={() => setCreate(false)}>Cancel</button><button className="btn-primary" form="create-user" disabled={busy}>Create</button></>}>
        <form id="create-user" className="space-y-3" onSubmit={async (e) => { e.preventDefault(); if (await run(() => api.post('/admin/users', form), 'Account created.')) { setCreate(false); setForm({ ...form, name: '', email: '', password: '' }); } }}>
          <div><label className="label" htmlFor="cu-n">Name</label><input id="cu-n" required className="input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
          <div><label className="label" htmlFor="cu-e">Email</label><input id="cu-e" type="email" required className="input" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></div>
          <div><label className="label" htmlFor="cu-p">Temporary password</label><input id="cu-p" required minLength={8} className="input" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} /></div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className="label" htmlFor="cu-r">Role</label><select id="cu-r" className="input" value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })}><option value="STUDENT">Student</option><option value="ORGANIZER">Organiser</option><option value="ADMIN">Admin</option></select></div>
            <div><label className="label" htmlFor="cu-d">Department</label><input id="cu-d" className="input" value={form.department} onChange={(e) => setForm({ ...form, department: e.target.value })} /></div>
          </div>
        </form>
      </Modal>

      <Modal open={Boolean(pwTarget)} onClose={() => setPwTarget(null)} title={`New password for ${pwTarget?.name || ''}`}
        footer={<><button className="btn-outline" onClick={() => setPwTarget(null)}>Cancel</button><button className="btn-primary" disabled={busy || newPw.length < 8} onClick={async () => { if (await run(() => api.post(`/admin/users/${pwTarget.id}/reset-password`, { password: newPw }), 'Password updated.')) setPwTarget(null); }}>Set password</button></>}>
        <p className="mb-3 text-sm text-slate-500">Use this when someone cannot receive a reset email. Share the password with them securely.</p>
        <input className="input" minLength={8} placeholder="At least 8 characters" value={newPw} onChange={(e) => setNewPw(e.target.value)} aria-label="New password" />
      </Modal>

      <ConfirmDialog open={Boolean(delTarget)} onClose={() => setDelTarget(null)} danger busy={busy} title="Delete this account?" confirmLabel="Delete"
        message={delTarget ? `${delTarget.name} and their registrations will be removed. Accounts that own events cannot be deleted; deactivate them instead.` : ''}
        onConfirm={async () => { if (await run(() => api.delete(`/admin/users/${delTarget.id}`), 'Account deleted.')) setDelTarget(null); }} />
    </DashboardShell>
  );
}
