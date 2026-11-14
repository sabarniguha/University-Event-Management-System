import { Link } from 'react-router-dom';
import { Award, CalendarDays, CheckCircle2, ClipboardList, UserCheck, Users } from 'lucide-react';
import useFetch from '../../hooks/useFetch.js';
import DashboardShell from '../../components/DashboardShell.jsx';
import { ErrorBox, Skeleton, StatCard } from '../../components/common/Ui.jsx';
import { BarsChart, DonutChart, TrendChart } from '../../components/charts/Charts.jsx';

export default function AdminDashboard() {
  const { data: s, loading, error } = useFetch('/admin/stats');
  const { data: a } = useFetch('/analytics/admin');
  const st = s?.stats;
  return (
    <DashboardShell title="Admin overview" subtitle="Everything happening across the platform.">
      <ErrorBox message={error} />
      {(st?.pendingEvents > 0 || st?.pendingOrganizers > 0) && (
        <div className="flex flex-wrap gap-3">
          {st.pendingEvents > 0 && <Link to="/admin/approvals" className="btn-primary"><CheckCircle2 className="h-4 w-4" /> {st.pendingEvents} event(s) awaiting approval</Link>}
          {st.pendingOrganizers > 0 && <Link to="/admin/organizers" className="btn-outline"><UserCheck className="h-4 w-4" /> {st.pendingOrganizers} organiser request(s)</Link>}
        </div>
      )}
      {loading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-28" />)}</div>
      ) : st && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard label="Users" value={st.users} icon={Users} hint={`${st.students} students, ${st.organizers} organisers, ${st.admins} admins`} />
          <StatCard label="Events" value={st.events} icon={CalendarDays} hint={`${st.published} published`} />
          <StatCard label="Registrations" value={st.registrations} icon={ClipboardList} tone="green" hint={`${st.present} check-ins`} />
          <StatCard label="Certificates issued" value={st.certificates} icon={Award} tone="yellow" hint={`${st.subscribers} newsletter subscribers`} />
        </div>
      )}
      {a && (
        <div className="grid gap-6 lg:grid-cols-2">
          <TrendChart title="Registrations by month" subtitle="Last 6 months" data={a.registrationsByMonth} name="Registrations" />
          <TrendChart title="New users by month" subtitle="Last 6 months" data={a.usersByMonth} name="Users" />
          <DonutChart title="Events by status" data={a.eventsByStatus} />
          <BarsChart title="Published events by category" data={a.eventsByCategory} horizontal />
        </div>
      )}
    </DashboardShell>
  );
}
