import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../../services/api.js';
import DashboardShell, { StatCard } from '../../components/DashboardShell.jsx';
import BarChart from '../../components/BarChart.jsx';
import StarRating from '../../components/StarRating.jsx';
import { ErrorBox, Loader } from '../../components/Ui.jsx';
import { errMsg, pctLabel } from '../../utils/format.js';

export default function Analytics() {
  const [data, setData] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    api
      .get('/admin/analytics')
      .then((res) => setData(res.data))
      .catch((e) => setError(errMsg(e)));
  }, []);

  return (
    <DashboardShell
      title="Analytics"
      subtitle="How events, registrations and attendance are performing"
      actions={
        <>
          <Link to="/admin/attendance" className="btn-outline">Attendance by event</Link>
          <Link to="/admin" className="btn-outline">Dashboard</Link>
        </>
      }
    >
      <ErrorBox message={error} />
      {!data ? (
        !error && <Loader />
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard label="Attendance rate (ended events)" value={pctLabel(data.attendance.rate)} />
            <div className="card">
              <p className="text-sm text-slate-500">Average event rating</p>
              <div className="mt-1 flex items-center gap-2">
                <span className="text-3xl font-bold text-slate-900">{data.feedback.average ?? '–'}</span>
                {data.feedback.average !== null && <StarRating value={data.feedback.average} size="text-base" />}
              </div>
              <p className="text-xs text-slate-400">{data.feedback.count} response{data.feedback.count === 1 ? '' : 's'}</p>
            </div>
            <StatCard label="On waitlists now" value={data.waitlisted} />
            <StatCard label="QR vs manual check-ins" value={`${data.attendance.viaQr} / ${data.attendance.manual}`} />
          </div>

          <div className="grid gap-5 lg:grid-cols-2">
            <BarChart title="Registrations per month (last 6 months)" data={data.registrationsByMonth} />
            <BarChart title="Published events by category" data={data.eventsByCategory} />
            <BarChart title="Registrations by department" data={data.registrationsByDepartment} />
            <BarChart
              title="Most popular events (% of seats filled)"
              unit="%"
              data={data.topEvents.map((e) => ({ label: `${e.title} (${e.registered}/${e.capacity})`, count: e.fill ?? 0 }))}
            />
          </div>
        </>
      )}
    </DashboardShell>
  );
}
