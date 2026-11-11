import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../../services/api.js';
import { useAuth } from '../../context/AuthContext.jsx';
import DashboardShell, { StatCard } from '../../components/DashboardShell.jsx';
import { RateBar } from '../../components/BarChart.jsx';
import { Badge, EmptyState, ErrorBox, Loader } from '../../components/Ui.jsx';
import { dashboardPath, errMsg, fmtDate, pctLabel } from '../../utils/format.js';

// Shared by organisers (their own events) and admins (every event).
export default function AttendanceOverview() {
  const { user } = useAuth();
  const isAdmin = user.role === 'ADMIN';
  const [data, setData] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    api
      .get('/attendance/overview')
      .then((res) => setData(res.data))
      .catch((e) => setError(errMsg(e)));
  }, []);

  return (
    <DashboardShell
      title={isAdmin ? 'Attendance across all events' : 'Attendance for my events'}
      subtitle="Open an event to check people in, mark attendance and export the report"
      actions={<Link to={dashboardPath(user.role)} className="btn-outline">Dashboard</Link>}
    >
      <ErrorBox message={error} />

      {!data ? (
        !error && <Loader />
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard label="Events" value={data.totals.events} />
            <StatCard label="Confirmed registrations" value={data.totals.registered} />
            <StatCard label="Marked present" value={data.totals.present} />
            <StatCard label="Overall attendance rate" value={pctLabel(data.totals.rate)} />
          </div>

          {data.events.length === 0 ? (
            <EmptyState>No published events yet.</EmptyState>
          ) : (
            <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
              <table className="min-w-full divide-y divide-slate-200">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="th">Event</th>
                    {isAdmin && <th className="th">Organiser</th>}
                    <th className="th">Registered</th>
                    <th className="th">Present</th>
                    <th className="th">Absent</th>
                    <th className="th">Not marked</th>
                    <th className="th">Rate</th>
                    <th className="th" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {data.events.map((e) => (
                    <tr key={e.id}>
                      <td className="td">
                        <div className="font-medium">{e.title}</div>
                        <div className="text-xs text-slate-400">
                          {fmtDate(e.startsAt)} {e.status === 'CANCELLED' && <Badge>CANCELLED</Badge>}
                        </div>
                      </td>
                      {isAdmin && <td className="td">{e.organizer?.name}</td>}
                      <td className="td">{e.registered} / {e.capacity}</td>
                      <td className="td">{e.present}</td>
                      <td className="td">{e.absent}</td>
                      <td className="td">{e.unmarked}</td>
                      <td className="td"><RateBar value={e.rate} /></td>
                      <td className="td text-right">
                        <Link to={`/organizer/events/${e.id}/attendance`} className="btn-outline btn-sm">Open</Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </DashboardShell>
  );
}
