import { Link } from 'react-router-dom';
import { CalendarDays } from 'lucide-react';
import { Badge, EmptyState } from '../common/Ui.jsx';
import { fmtDate } from '../../utils/format.js';

// Compact list of events/registrations used on overview pages.
export default function EventList({ items, empty, action }) {
  if (items.length === 0) return <EmptyState icon={CalendarDays} action={action}>{empty}</EmptyState>;
  return (
    <ul className="divide-y divide-slate-100">
      {items.map((i) => (
        <li key={i.key} className="flex items-center justify-between gap-3 py-3">
          <div className="min-w-0">
            <Link to={i.to} className="block truncate font-medium text-slate-900 hover:text-brand-600">{i.title}</Link>
            <p className="text-xs text-slate-500">{fmtDate(i.date)}{i.meta ? ` · ${i.meta}` : ''}</p>
          </div>
          {i.status && <Badge>{i.status}</Badge>}
        </li>
      ))}
    </ul>
  );
}
