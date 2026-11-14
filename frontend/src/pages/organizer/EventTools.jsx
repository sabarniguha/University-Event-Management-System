import { Link } from 'react-router-dom';
import DashboardShell from '../../components/DashboardShell.jsx';
import EventPicker from '../../components/events/EventPicker.jsx';

// "Attendee Management": per-event attendance lists, feedback and registrations.
export function AttendeeManagement() {
  return (
    <DashboardShell title="Attendee management" subtitle="Open an event to see who is registered, who attended and what they said.">
      <EventPicker filter={(e) => e.status === 'PUBLISHED'} empty="Publish an event to manage its attendees."
        renderAction={(e) => (
          <div className="flex gap-2">
            <Link to={`/organizer/events/${e.id}/attendance`} className="btn-outline btn-sm">Attendance</Link>
            <Link to={`/organizer/events/${e.id}/registrations`} className="btn-outline btn-sm">Registrations</Link>
            <Link to={`/organizer/events/${e.id}/feedback`} className="btn-outline btn-sm">Feedback</Link>
          </div>
        )} />
    </DashboardShell>
  );
}

// "QR Attendance Scanner": pick the event, then use the scanner on its attendance page.
export function ScannerPicker() {
  const now = new Date();
  return (
    <DashboardShell title="QR attendance scanner" subtitle="Pick the event you are checking people into. The scanner uses your device camera, a USB scanner or a pasted ticket code, and rejects duplicate scans.">
      <EventPicker filter={(e) => e.status === 'PUBLISHED' && new Date(e.endsAt) >= new Date(now.getTime() - 24 * 3600 * 1000)} empty="No live or recent events to scan for."
        renderAction={(e) => <Link to={`/organizer/events/${e.id}/attendance`} className="btn-primary btn-sm">Open scanner</Link>} />
    </DashboardShell>
  );
}
