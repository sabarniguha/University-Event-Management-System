import useFetch from '../../hooks/useFetch.js';
import DashboardShell from '../../components/DashboardShell.jsx';
import { DataTable, ErrorBox, StatCard } from '../../components/common/Ui.jsx';
import { BarsChart, DonutChart, TrendChart } from '../../components/charts/Charts.jsx';
import { RateBar } from '../../components/BarChart.jsx';
import { pctLabel } from '../../utils/format.js';

export default function OrganizerAnalytics() {
  const { data: a, loading, error } = useFetch('/analytics/organizer');
  return (
    <DashboardShell title="Analytics" subtitle="Registrations, attendance and feedback across your events.">
      <ErrorBox message={error} />
      {a && (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard label="Events" value={a.totals.events} />
            <StatCard label="Registrations" value={a.totals.registrations} />
            <StatCard label="Attendance rate" value={pctLabel(a.totals.attendanceRate)} tone="green" />
            <StatCard label="Average rating" value={a.totals.averageRating ?? '-'} tone="yellow" hint={`${a.totals.feedbackCount} reviews`} />
          </div>
          <div className="grid gap-6 lg:grid-cols-2">
            <TrendChart title="Registrations by month" data={a.registrationsByMonth} name="Registrations" />
            <DonutChart title="Events by status" data={a.eventsByStatus} />
            <BarsChart title="Registrations by department" data={a.registrationsByDepartment} horizontal />
            <BarsChart title="Events by category" data={a.eventsByCategory} horizontal />
          </div>
          <DataTable columns={['Event', 'Registered', 'Fill', 'Present', 'Attendance', 'Rating']} loading={loading}>
            {a.perEvent.map((e) => (
              <tr key={e.id}>
                <td className="td font-medium text-slate-900">{e.title}</td>
                <td className="td">{e.registered}/{e.capacity}</td>
                <td className="td"><RateBar value={e.fill} /></td>
                <td className="td">{e.present}</td>
                <td className="td"><RateBar value={e.attendanceRate} /></td>
                <td className="td">{e.rating ?? '-'}</td>
              </tr>
            ))}
          </DataTable>
        </>
      )}
    </DashboardShell>
  );
}
