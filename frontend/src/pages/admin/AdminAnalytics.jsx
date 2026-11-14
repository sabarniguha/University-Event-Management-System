import { Download } from 'lucide-react';
import { downloadFile } from '../../services/api.js';
import { useToast } from '../../context/ToastContext.jsx';
import useFetch from '../../hooks/useFetch.js';
import DashboardShell from '../../components/DashboardShell.jsx';
import { ErrorBox, StatCard } from '../../components/common/Ui.jsx';
import { BarsChart, DonutChart, TrendChart } from '../../components/charts/Charts.jsx';
import { errMsg, pctLabel } from '../../utils/format.js';

export default function AdminAnalytics() {
  const toast = useToast();
  const { data: a, error } = useFetch('/analytics/admin');
  const dl = (type) => downloadFile(`/admin/reports/${type}`, `${type}.csv`).catch((e) => toast.error(errMsg(e)));
  return (
    <DashboardShell title="Reports and analytics" subtitle="Platform-wide numbers, straight from the database."
      actions={['events', 'registrations', 'users'].map((t) => <button key={t} className="btn-outline" onClick={() => dl(t)}><Download className="h-4 w-4" /> {t} CSV</button>)}>
      <ErrorBox message={error} />
      {a && (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard label="Attendance rate" value={pctLabel(a.attendance.rate)} tone="green" hint={`${a.attendance.present} of ${a.attendance.registeredAtEndedEvents} at finished events`} />
            <StatCard label="QR check-ins" value={a.attendance.viaQr} hint={`${a.attendance.manual} marked manually`} />
            <StatCard label="Average rating" value={a.feedback.average ?? '-'} tone="yellow" hint={`${a.feedback.count} reviews`} />
            <StatCard label="Certificates" value={a.certificates} hint={`${a.waitlisted} students waitlisted`} />
          </div>
          <div className="grid gap-6 lg:grid-cols-2">
            <TrendChart title="Registrations by month" data={a.registrationsByMonth} name="Registrations" />
            <TrendChart title="New users by month" data={a.usersByMonth} name="Users" />
            <DonutChart title="Users by role" data={a.usersByRole} />
            <DonutChart title="Events by format" data={a.eventsByMode} />
            <BarsChart title="Registrations by department" data={a.registrationsByDepartment} horizontal />
            <BarsChart title="Top events by registrations" data={a.topEvents.map((e) => ({ label: e.title.slice(0, 22), count: e.registered }))} horizontal />
          </div>
        </>
      )}
    </DashboardShell>
  );
}
