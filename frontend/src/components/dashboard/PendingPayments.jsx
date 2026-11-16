import { Link } from 'react-router-dom';
import { Clock } from 'lucide-react';
import useFetch from '../../hooks/useFetch.js';
import { useAuth } from '../../context/AuthContext.jsx';
import { fmtDate } from '../../utils/format.js';

// Pending (started, not completed) payments. Students see their own; organisers their events'; admins all.
export default function PendingPayments() {
  const { user } = useAuth();
  const student = user.role === 'STUDENT';
  const { data } = useFetch(student ? '/payments/mine' : '/payments', student ? undefined : { status: 'CREATED' });
  const all = data?.payments || [];
  const recent = Date.now() - 3 * 24 * 60 * 60 * 1000;
  const pending = all.filter((p) => p.status === 'CREATED' && new Date(p.createdAt).getTime() >= recent);
  if (pending.length === 0) return null;
  const to = student ? '/student/payments' : user.role === 'ADMIN' ? '/admin/payments' : '/organizer/payments';
  return (
    <section className="rounded-xl border border-yellow-200 bg-yellow-50 p-4">
      <div className="flex items-center justify-between gap-2">
        <h2 className="flex items-center gap-2 font-semibold text-yellow-900"><Clock className="h-4 w-4" /> {pending.length} pending payment{pending.length === 1 ? '' : 's'}</h2>
        <Link to={to} className="text-sm font-medium text-yellow-900 underline">{student ? 'Complete them' : 'View all'}</Link>
      </div>
      <ul className="mt-2 space-y-1 text-sm text-yellow-900">
        {pending.slice(0, 4).map((p) => (
          <li key={p.id}>{student ? '' : `${p.user.name} · `}<b>{p.event.title}</b> · ₹{(p.amount / 100).toLocaleString('en-IN')} · {fmtDate(p.createdAt)}</li>
        ))}
      </ul>
    </section>
  );
}
