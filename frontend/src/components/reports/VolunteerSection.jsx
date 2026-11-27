import useFetch from '../../hooks/useFetch.js';
import { Section, Table, num } from './ReportParts.jsx';
import { fmtDate } from '../../utils/format.js';

// Extra section at the end of the activity transcript. Renders nothing unless the student has confirmed volunteer hours.
export default function VolunteerSection() {
  const { data } = useFetch('/volunteer/mine');
  if (!data || data.entries.length === 0) return null;
  return (
    <Section title="Volunteer service" note={`${num(data.total)} hour(s) across ${num(data.events)} event(s), served as event staff and confirmed by the organisers. Shown for all time.`}>
      <Table head={['Date', 'Event', 'Organiser', 'Hours']}>
        {data.entries.map((e) => <tr key={e.eventId}><td className="whitespace-nowrap">{fmtDate(e.startsAt)}</td><td className="font-medium text-slate-900">{e.title}</td><td>{e.organizer}</td><td>{e.hours}</td></tr>)}
      </Table>
    </Section>
  );
}
