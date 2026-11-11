import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../../services/api.js';
import { useAuth } from '../../context/AuthContext.jsx';
import DashboardShell, { StatCard } from '../../components/DashboardShell.jsx';
import { Badge, ErrorBox, Loader, SuccessBox } from '../../components/Ui.jsx';
import { errMsg, fmtDate } from '../../utils/format.js';

export default function AdminDashboard() {
  const { user: me } = useAuth();
  const [stats, setStats] = useState(null);
  const [users, setUsers] = useState([]);
  const [q, setQ] = useState('');
  const [role, setRole] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  const loadStats = useCallback(
    () => api.get('/admin/stats').then((res) => setStats(res.data.stats)).catch((e) => setError(errMsg(e))),
    []
  );

  const loadUsers = useCallback(
    () =>
      api
        .get('/admin/users', { params: { q: q || undefined, role: role || undefined } })
        .then((res) => setUsers(res.data.users))
        .catch((e) => setError(errMsg(e))),
    [q, role]
  );

  useEffect(() => { loadStats().finally(() => setLoading(false)); }, [loadStats]);

  useEffect(() => {
    const t = setTimeout(loadUsers, 250);
    return () => clearTimeout(t);
  }, [loadUsers]);

  const changeRole = async (u, newRole) => {
    setError('');
    setMessage('');
    try {
      await api.patch(`/admin/users/${u.id}/role`, { role: newRole });
      setMessage(`${u.name} is now ${newRole}.`);
      await Promise.all([loadUsers(), loadStats()]);
    } catch (e) {
      setError(errMsg(e));
    }
  };

  const removeUser = async (u) => {
    if (!window.confirm(`Delete ${u.name} (${u.email})? Their registrations will be removed.`)) return;
    setError('');
    setMessage('');
    try {
      await api.delete(`/admin/users/${u.id}`);
      setMessage(`${u.name} was deleted.`);
      await Promise.all([loadUsers(), loadStats()]);
    } catch (e) {
      setError(errMsg(e));
    }
  };

  const [showCreate, setShowCreate] = useState(false);
  const [newUser, setNewUser] = useState({ name: '', email: '', password: '', role: 'ORGANIZER', department: '' });
  const onNewUser = (e) => setNewUser({ ...newUser, [e.target.name]: e.target.value });

  const createUser = async (e) => {
    e.preventDefault();
    setError('');
    setMessage('');
    try {
      const { data } = await api.post('/admin/users', newUser);
      setMessage(`Created ${data.user.role.toLowerCase()} account for ${data.user.name}.`);
      setNewUser({ name: '', email: '', password: '', role: 'ORGANIZER', department: '' });
      setShowCreate(false);
      await Promise.all([loadUsers(), loadStats()]);
    } catch (err) {
      setError(errMsg(err));
    }
  };

  return (
    <DashboardShell
      title="Admin dashboard"
      subtitle="Oversee users, events and announcements"
      actions={
        <>
          <Link to="/admin/analytics" className="btn-outline">Analytics</Link>
          <Link to="/admin/attendance" className="btn-outline">Attendance</Link>
          <Link to="/organizer" className="btn-outline">All events</Link>
          <Link to="/announcements" className="btn-outline">Announcements</Link>
        </>
      }
    >
      <ErrorBox message={error} />
      <SuccessBox message={message} />

      {loading || !stats ? (
        <Loader />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard label="Users" value={stats.users} />
          <StatCard label="Students / Organisers / Admins" value={`${stats.students} / ${stats.organizers} / ${stats.admins}`} />
          <StatCard label="Events (published)" value={`${stats.events} (${stats.published})`} />
          <StatCard label="Active registrations" value={stats.registrations} />
          <StatCard label="Attendance marked present" value={stats.present} />
          <StatCard label="Published announcements" value={stats.announcements} />
        </div>
      )}

      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">User management</h2>
          <button className="btn-primary btn-sm" onClick={() => setShowCreate((s) => !s)}>
            {showCreate ? 'Close' : 'Create account'}
          </button>
        </div>

        {showCreate && (
          <form onSubmit={createUser} className="card grid gap-3 sm:grid-cols-2">
            <div>
              <label className="label" htmlFor="nu-name">Full name</label>
              <input id="nu-name" name="name" required minLength={2} className="input" value={newUser.name} onChange={onNewUser} />
            </div>
            <div>
              <label className="label" htmlFor="nu-email">Email</label>
              <input id="nu-email" name="email" type="email" required className="input" value={newUser.email} onChange={onNewUser} />
            </div>
            <div>
              <label className="label" htmlFor="nu-password">Temporary password (min 8)</label>
              <input id="nu-password" name="password" type="password" required minLength={8} autoComplete="new-password" className="input" value={newUser.password} onChange={onNewUser} />
            </div>
            <div>
              <label className="label" htmlFor="nu-role">Role</label>
              <select id="nu-role" name="role" className="input" value={newUser.role} onChange={onNewUser}>
                <option value="ORGANIZER">Organiser</option>
                <option value="ADMIN">Admin</option>
                <option value="STUDENT">Student</option>
              </select>
            </div>
            <div className="sm:col-span-2">
              <label className="label" htmlFor="nu-dept">Department (optional)</label>
              <input id="nu-dept" name="department" className="input" value={newUser.department} onChange={onNewUser} />
            </div>
            <div className="sm:col-span-2">
              <button className="btn-primary">Create account</button>
            </div>
          </form>
        )}
        <div className="grid gap-3 sm:grid-cols-3">
          <input className="input sm:col-span-2" placeholder="Search by name or email..." value={q} onChange={(e) => setQ(e.target.value)} />
          <select className="input" value={role} onChange={(e) => setRole(e.target.value)}>
            <option value="">All roles</option>
            <option value="STUDENT">Students</option>
            <option value="ORGANIZER">Organisers</option>
            <option value="ADMIN">Admins</option>
          </select>
        </div>

        <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
          <table className="min-w-full divide-y divide-slate-200">
            <thead className="bg-slate-50">
              <tr>
                <th className="th">User</th>
                <th className="th">Department</th>
                <th className="th">Joined</th>
                <th className="th">Role</th>
                <th className="th" />
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {users.map((u) => (
                <tr key={u.id}>
                  <td className="td">
                    <div className="font-medium">{u.name}</div>
                    <div className="text-xs text-slate-400">{u.email}</div>
                  </td>
                  <td className="td">{u.department || '-'}</td>
                  <td className="td">{fmtDate(u.createdAt)}</td>
                  <td className="td">
                    {u.id === me.id ? (
                      <Badge>{u.role}</Badge>
                    ) : (
                      <select className="input !w-auto !py-1" value={u.role} onChange={(e) => changeRole(u, e.target.value)}>
                        <option value="STUDENT">Student</option>
                        <option value="ORGANIZER">Organiser</option>
                        <option value="ADMIN">Admin</option>
                      </select>
                    )}
                  </td>
                  <td className="td text-right">
                    {u.id !== me.id && <button className="btn-danger btn-sm" onClick={() => removeUser(u)}>Delete</button>}
                  </td>
                </tr>
              ))}
              {users.length === 0 && (
                <tr><td className="td text-center text-slate-400" colSpan={5}>No users found.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </DashboardShell>
  );
}
