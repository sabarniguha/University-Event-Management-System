import { Link } from 'react-router-dom';
import { Sparkles } from 'lucide-react';
import useFetch from '../../hooks/useFetch.js';
import EventCard from './EventCard.jsx';

// "Recommended for you": upcoming events ranked by the student's department and the kinds of events they joined before.
export default function RecommendedStrip() {
  const { data } = useFetch('/recommendations', { limit: 3 });
  const events = data?.events || [];
  if (events.length === 0) return null;
  return (
    <section className="card">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="flex items-center gap-2 font-semibold text-slate-900"><Sparkles className="h-4 w-4 text-brand-600" /> {data.personalized ? 'Recommended for you' : 'You might like'}</h2>
        <Link to="/events" className="text-sm text-brand-600 hover:underline">Browse all</Link>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {events.map((e) => (
          <div key={e.id} className="space-y-1.5">
            <EventCard event={e} />
            {e.reasons?.length > 0 && <p className="px-1 text-xs text-slate-500">{e.reasons.join(' · ')}</p>}
          </div>
        ))}
      </div>
    </section>
  );
}
