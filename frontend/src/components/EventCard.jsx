import { Link } from 'react-router-dom';
import { fmtDate } from '../utils/format.js';

export default function EventCard({ event }) {
  const left = event.capacity - (event.registeredCount || 0);

  return (
    <Link to={`/events/${event.id}`} className="card flex flex-col overflow-hidden !p-0 transition hover:shadow-md">
      {event.bannerUrl ? (
        <img src={event.bannerUrl} alt="" className="h-40 w-full object-cover" loading="lazy" />
      ) : (
        <div className="flex h-40 items-center justify-center bg-gradient-to-br from-brand-500 to-purple-500 text-4xl font-bold text-white/80">
          {event.title.charAt(0).toUpperCase()}
        </div>
      )}
      <div className="flex flex-1 flex-col p-4">
        <span className="text-xs font-semibold uppercase tracking-wide text-brand-600">{event.category}</span>
        <h3 className="mt-1 text-lg font-semibold text-slate-900">{event.title}</h3>
        <p className="mt-1 text-sm text-slate-500">{fmtDate(event.startsAt)}</p>
        <p className="text-sm text-slate-500">{event.venue}</p>
        <p className={`mt-auto pt-3 text-xs font-medium ${left <= 0 ? 'text-red-600' : 'text-slate-500'}`}>
          {left <= 0 ? 'Event full' : `${left} seat${left === 1 ? '' : 's'} left`}
        </p>
      </div>
    </Link>
  );
}
