import { Link } from 'react-router-dom';
import { Award, CheckCircle2, ClipboardList, Percent, ShieldCheck } from 'lucide-react';
import api from '../../services/api.js';
import { useAuth } from '../../context/AuthContext.jsx';
import { useToast } from '../../context/ToastContext.jsx';
import useFetch from '../../hooks/useFetch.js';
import DashboardShell from '../../components/DashboardShell.jsx';
import { Skeleton, StatCard, ErrorBox } from '../../components/common/Ui.jsx';
import { TrendChart, BarsChart } from '../../components/charts/Charts.jsx';
import EventList from '../../components/dashboard/EventList.jsx';
import OrganizerRequestCard from '../../components/dashboard/OrganizerRequestCard.jsx';
import { pctLabel } from '../../utils/format.js';

export default function StudentDashboard() {
  const { user } = useAuth();
  const toast = useToast();
  const { data: a, loading, error } = useFetch('/analytics/student');
  const { data: regs } = useFetch('/registrations/me');

  const upcoming = (regs?.registrations || [])
    .filter((r) => ['REGISTERED', 'PENDING', 'WAITLISTED'].includes(r.status) && new Date(r.event.endsAt) >= new Date() && r.event.status !== 'CANCELLED')
    .sort((x, y) => new Date(x.event.startsAt) - new Date(y.event.startsAt))
    .slice(0, 5)
    .map((r) => ({ key: r.id, title: r.event.title, to: `/events/${r.event.id}`, date: r.event.startsAt, meta: r.event.venue, status: r.status }));

  const resend = async () => {
    try { await api.post('/auth/resend-verification'); toast.success('Verification email requested.'); } catch { toast.error('Could not send the email.'); }
  };

  return (
    <DashboardShell title={`Welcome back, ${user.name.split(' ')[0]}`} subtitle="Your events, tickets and progress at a glance." actions={<Link to="/events" className="btn-primary">Discover events</Link>}>
      <ErrorBox message={error} />
      {!user.emailVerifiedAt && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-yellow-200 bg-yellow-50 px-4 py-3 text-sm text-yellow-800">
          <span className="flex items-center gap-2"><ShieldCheck className="h-4 w-4" /> Please verify your email address.</span>
          <button onClick={resend} className="font-medium underline">Resend verification email</button>
        </div>
      )}

      {loading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-28" />)}</div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard label="Registered events" value={a.totals.registered} icon={ClipboardList} hint={`${a.totals.upcoming} upcoming`} />
          <StatCard label="Attended" value={a.totals.attended} icon={CheckCircle2} tone="green" hint={`${a.totals.missed} missed`} />
          <StatCard label="Attendance rate" value={pctLabel(a.totals.attendanceRate)} icon={Percent} tone="yellow" />
          <StatCard label="Certificates" value={a.totals.certificates} icon={Award} hint={`${a.totals.pending + a.totals.waitlisted} pending or waitlisted`} />
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="card">
          <div className="mb-2 flex items-center justify-between"><h2 className="font-semibold text-slate-900">Upcoming for you</h2><Link to="/student/registrations" className="text-sm text-brand-600 hover:underline">All registrations</Link></div>
          <EventList items={upcoming} empty="You have no upcoming events." action={<Link to="/events" className="btn-primary btn-sm">Find an event</Link>} />
        </div>
        <TrendChart title="Registrations by month" subtitle="Last 6 months" data={a?.registrationsByMonth || []} name="Registrations" />
      </div>
      {a && <BarsChart title="Attended by category" data={a.attendedByCategory} horizontal />}
      <OrganizerRequestCard />
    </DashboardShell>
  );
}
