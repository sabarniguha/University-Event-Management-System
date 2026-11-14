import { Link } from 'react-router-dom';
import { CalendarDays, MapPin, Video, Users } from 'lucide-react';
import { mediaUrl } from '../../services/api.js';
import { dayParts, fmtTime, money, MODE_LABEL } from '../../utils/format.js';

const GRADIENTS = [
  'from-indigo-500 to-purple-500', 'from-sky-500 to-indigo-500', 'from-emerald-500 to-teal-500',
  'from-rose-500 to-orange-400', 'from-fuchsia-500 to-pink-500', 'from-amber-500 to-red-500',
];

export const gradientFor = (event) => GRADIENTS[(event.id || 0) % GRADIENTS.length];

export default function EventCard({ event }) {
  const left = event.capacity - (event.registeredCount || 0);
  const { day, month } = dayParts(event.startsAt);
  const past = new Date(event.endsAt) < new Date();

  return (
    <Link
      to={`/events/${event.id}`}
      className="card group flex flex-col overflow-hidden !p-0 transition duration-200 hover:-translate-y-1 hover:shadow-lift"
    >
      <div className="relative h-40 w-full overflow-hidden">
        {event.bannerUrl ? (
          <img src={mediaUrl(event.bannerUrl)} alt="" className="h-full w-full object-cover transition duration-300 group-hover:scale-105" loading="lazy" />
        ) : (
          <div className={`flex h-full items-center justify-center bg-gradient-to-br ${gradientFor(event)} text-5xl font-bold text-white/70`}>
            {event.title.charAt(0).toUpperCase()}
          </div>
        )}
        <div className="absolute left-3 top-3 rounded-xl bg-white px-2.5 py-1 text-center shadow">
          <div className="text-lg font-bold leading-none text-slate-900">{day}</div>
          <div className="text-[10px] font-semibold uppercase text-brand-600">{month}</div>
        </div>
        <div className="absolute right-3 top-3 flex gap-1.5">
          {event.featured && <span className="rounded-full bg-amber-400 px-2 py-0.5 text-[10px] font-bold uppercase text-amber-950">Featured</span>}
          <span className="rounded-full bg-slate-900/70 px-2 py-0.5 text-[10px] font-semibold text-white">{money(event.fee)}</span>
        </div>
      </div>
      <div className="flex flex-1 flex-col p-4">
        <span className="text-xs font-semibold uppercase tracking-wide text-brand-600">{event.category}</span>
        <h3 className="mt-1 line-clamp-2 text-lg font-semibold leading-snug text-slate-900">{event.title}</h3>
        <ul className="mt-3 space-y-1 text-sm text-slate-500">
          <li className="flex items-center gap-2"><CalendarDays className="h-4 w-4 shrink-0" /> {fmtTime(event.startsAt)} {event.mode !== 'OFFLINE' && `- ${MODE_LABEL[event.mode]}`}</li>
          <li className="flex items-center gap-2">
            {event.mode === 'ONLINE' ? <Video className="h-4 w-4 shrink-0" /> : <MapPin className="h-4 w-4 shrink-0" />}
            <span className="truncate">{event.mode === 'ONLINE' ? 'Online event' : event.venue}</span>
          </li>
        </ul>
        <p className={`mt-auto flex items-center gap-2 pt-3 text-xs font-medium ${left <= 0 && !past ? 'text-red-600' : 'text-slate-500'}`}>
          <Users className="h-4 w-4" />
          {past ? 'Event ended' : left <= 0 ? 'Event full' : `${left} seat${left === 1 ? '' : 's'} left`}
        </p>
      </div>
    </Link>
  );
}
