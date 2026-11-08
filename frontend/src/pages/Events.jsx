import { useEffect, useState } from 'react';
import api from '../services/api.js';
import EventCard from '../components/EventCard.jsx';
import { EmptyState, ErrorBox, Loader } from '../components/Ui.jsx';
import { CATEGORIES, errMsg } from '../utils/format.js';

export default function Events() {
  const [events, setEvents] = useState([]);
  const [q, setQ] = useState('');
  const [category, setCategory] = useState('');
  const [scope, setScope] = useState('upcoming');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Debounce typing in the search box.
  useEffect(() => {
    const timer = setTimeout(() => {
      setLoading(true);
      setError('');
      api
        .get('/events', { params: { q: q || undefined, category: category || undefined, scope } })
        .then((res) => setEvents(res.data.events))
        .catch((e) => setError(errMsg(e)))
        .finally(() => setLoading(false));
    }, 250);
    return () => clearTimeout(timer);
  }, [q, category, scope]);

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <h1 className="mb-6 text-2xl font-bold">Campus events</h1>

      <div className="mb-6 grid gap-3 sm:grid-cols-3">
        <input className="input" placeholder="Search events, venues..." value={q} onChange={(e) => setQ(e.target.value)} />
        <select className="input" value={category} onChange={(e) => setCategory(e.target.value)}>
          <option value="">All categories</option>
          {CATEGORIES.map((c) => <option key={c}>{c}</option>)}
        </select>
        <select className="input" value={scope} onChange={(e) => setScope(e.target.value)}>
          <option value="upcoming">Upcoming</option>
          <option value="past">Past</option>
          <option value="all">All</option>
        </select>
      </div>

      <ErrorBox message={error} />
      {loading ? (
        <Loader />
      ) : events.length === 0 ? (
        <EmptyState>No events match your filters.</EmptyState>
      ) : (
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {events.map((e) => <EventCard key={e.id} event={e} />)}
        </div>
      )}
    </div>
  );
}
