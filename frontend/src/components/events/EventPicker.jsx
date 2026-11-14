import { CalendarDays } from 'lucide-react';
import { Badge, EmptyState, Loader } from '../common/Ui.jsx';
import useFetch from '../../hooks/useFetch.js';
import { fmtDate } from '../../utils/format.js';

// Lists the organiser's events (all events for admins) and calls `renderAction(event)` for each.
export default function EventPicker({ filter = () => true, renderAction, empty = 'You have no events yet.' }) {
  const { data, loading, error } = useFetch('/events/mine');
  if (loading) return <Loader />;
  if (error) return <p className="text-sm text-red-600">{error}</p>;
  const events = (data?.events || []).filter(filter);
  if (events.length === 0) return <EmptyState icon={CalendarDays} title="No events">{empty}</EmptyState>;

  return (
    <ul className="space-y-3">
      {events.map((e) => (
        <li key={e.id} className="card flex flex-wrap items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="truncate font-semibold text-slate-900">{e.title}</p>
            <p className="text-sm text-slate-500">{fmtDate(e.startsAt)} &middot; {e.registeredCount}/{e.capacity} registered</p>
          </div>
          <div className="flex items-center gap-2">
            <Badge>{e.status}</Badge>
            {renderAction(e)}
          </div>
        </li>
      ))}
    </ul>
  );
}
