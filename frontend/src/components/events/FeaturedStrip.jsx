import { Link } from 'react-router-dom';
import { Star } from 'lucide-react';
import useFetch from '../../hooks/useFetch.js';
import EventCard from './EventCard.jsx';

// Featured events. When an admin has not starred any yet, shows the soonest upcoming events instead,
// so the section is never empty while events exist.
export default function FeaturedStrip({ limit = 3, title = 'Featured events' }) {
  const featured = useFetch('/events', { featured: 'true', limit });
  const fallback = useFetch('/events', { sort: 'upcoming', limit });
  const picked = featured.data?.events?.length ? featured.data.events : fallback.data?.events || [];
  const isFeatured = Boolean(featured.data?.events?.length);
  if (picked.length === 0) return null;
  return (
    <section className="card">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="flex items-center gap-2 font-semibold text-slate-900"><Star className="h-4 w-4 fill-amber-400 text-amber-500" /> {isFeatured ? title : 'Happening soon'}</h2>
        <Link to="/events" className="text-sm text-brand-600 hover:underline">All events</Link>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">{picked.map((e) => <EventCard key={e.id} event={e} />)}</div>
    </section>
  );
}
