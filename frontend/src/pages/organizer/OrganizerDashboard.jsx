import { Link } from 'react-router-dom';
import { CalendarDays, ClipboardList, Percent, Star } from 'lucide-react';
import { useAuth } from '../../context/AuthContext.jsx';
import useFetch from '../../hooks/useFetch.js';
import DashboardShell from '../../components/DashboardShell.jsx';
import { ErrorBox, Skeleton, StatCard } from '../../components/common/Ui.jsx';
import { BarsChart, TrendChart } from '../../components/charts/Charts.jsx';
import EventList from '../../components/dashboard/EventList.jsx';
import { pctLabel } from '../../utils/format.js';

export default function OrganizerDashboard() {
  const { user } = useAuth();
  const { data: a, loading, error } = useFetch('/analytics/organizer');
  const { data: ev } = useFetch('/events/mine');

  const upcoming = (ev?.events || [])
    .filter((e) => new Date(e.endsAt) >= new Date() && e.status !== 'CANCELLED')
    .sort((x, y) => new Date(x.startsAt) - new Date(y.startsAt))
    .slice(0, 5)
    .map((e) => ({ key: e.id, title: e.title, to: `/events/${e.id}`, date: e.startsAt, meta: `${e.registeredCount}/${e.capacity} registered`, status: e.status }));

  return (
    <DashboardShell title={`Hello, ${user.name.split(' ')[0]}`} subtitle="How your events are doing." actions={<Link to="/organizer/events/new" className="btn-primary">Create event</Link>}>
      <ErrorBox message={error} />
      {loading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-28" />)}</div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard label="Events" value={a.totals.events} icon={CalendarDays} hint={`${a.totals.published} live, ${a.totals.pending} awaiting approval`} />
          <StatCard label="Registrations" value={a.totals.registrations} icon={ClipboardList} hint={`${a.totals.waitlisted} on waitlists`} />
          <StatCard label="Attendance rate" value={pctLabel(a.totals.attendanceRate)} icon={Percent} tone="green" hint="Finished events" />
          <StatCard label="Average rating" value={a.totals.averageRating ?? '-'} icon={Star} tone="yellow" hint={`${a.totals.feedbackCount} reviews`} />
        </div>
      )}
      <div className="grid gap-6 lg:grid-cols-2">
        <div className="card">
          <div className="mb-2 flex items-center justify-between"><h2 className="font-semibold text-slate-900">Upcoming events</h2><Link to="/organizer/events" className="text-sm text-brand-600 hover:underline">All events</Link></div>
          <EventList items={upcoming} empty="No upcoming events." action={<Link to="/organizer/events/new" className="btn-primary btn-sm">Create one</Link>} />
        </div>
        <TrendChart title="Registrations by month" subtitle="Last 6 months" data={a?.registrationsByMonth || []} name="Registrations" />
      </div>
      {a && <BarsChart title="Most registered events" data={(a.perEvent || []).map((e) => ({ label: e.title.slice(0, 22), count: e.registered }))} horizontal />}
    </DashboardShell>
  );
}
