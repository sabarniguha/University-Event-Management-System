import { Link } from 'react-router-dom';
import { Award } from 'lucide-react';
import useFetch from '../../hooks/useFetch.js';
import DashboardShell from '../../components/DashboardShell.jsx';
import { DataTable, ErrorBox, StatCard } from '../../components/common/Ui.jsx';
import { fmtDate } from '../../utils/format.js';

// Student: hours served as event staff, confirmed by organisers.
export default function Volunteer() {
  const { data, loading, error } = useFetch('/volunteer/mine');
  return (
    <DashboardShell title="Volunteer hours" subtitle="Hours you served as event staff, confirmed by the organiser after each event."
      actions={data && data.entries.length > 0 ? <Link to="/student/volunteer/certificate" className="btn-primary"><Award className="h-4 w-4" /> Volunteer certificate</Link> : null}>
      <ErrorBox message={error} />
      {data && (
        <div className="grid gap-4 sm:grid-cols-2">
          <StatCard label="Total hours" value={data.total} tone="green" />
          <StatCard label="Events helped at" value={data.events} />
        </div>
      )}
      <DataTable columns={['Event', 'Date', 'Organiser', 'Hours']} loading={loading}
        empty={data && data.entries.length === 0 && <p className="p-6 text-sm text-slate-500">No confirmed volunteer hours yet. When an organiser adds you as event staff and confirms your hours after the event, they appear here.</p>}>
        {(data?.entries || []).map((e) => (
          <tr key={e.eventId}><td className="td font-medium">{e.title}</td><td className="td whitespace-nowrap">{fmtDate(e.startsAt)}</td><td className="td">{e.organizer}</td><td className="td">{e.hours}</td></tr>
        ))}
      </DataTable>
    </DashboardShell>
  );
}
