import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../services/api.js';
import EventCard from '../components/EventCard.jsx';
import { Badge, Loader } from '../components/Ui.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { dashboardPath, fmtDate } from '../utils/format.js';

export default function Home() {
  const { user } = useAuth();
  const [events, setEvents] = useState([]);
  const [notices, setNotices] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([api.get('/events'), api.get('/announcements/public')])
      .then(([e, a]) => {
        setEvents(e.data.events.slice(0, 6));
        setNotices(a.data.announcements);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  return (
    <div>
      <section className="bg-gradient-to-br from-brand-700 via-brand-600 to-purple-600 text-white">
        <div className="mx-auto max-w-6xl px-4 py-16 text-center">
          <h1 className="text-4xl font-extrabold md:text-5xl">Discover. Register. Attend.</h1>
          <p className="mx-auto mt-4 max-w-2xl text-brand-100">
            One place for every campus event: browse what is coming up, reserve your seat in one click and track your attendance.
          </p>
          <div className="mt-8 flex justify-center gap-3">
            <Link to="/events" className="btn bg-white text-brand-700 hover:bg-brand-50">Browse events</Link>
            {user ? (
              <Link to={dashboardPath(user.role)} className="btn border border-white/60 text-white hover:bg-white/10">My dashboard</Link>
            ) : (
              <Link to="/register" className="btn border border-white/60 text-white hover:bg-white/10">Create account</Link>
            )}
          </div>
        </div>
      </section>

      <div className="mx-auto max-w-6xl space-y-10 px-4 py-10">
        {notices.length > 0 && (
          <section>
            <h2 className="mb-3 text-xl font-semibold">Latest announcements</h2>
            <div className="space-y-3">
              {notices.map((n) => (
                <div key={n.id} className="card">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="font-semibold">{n.title}</h3>
                    <Badge>{n.priority}</Badge>
                    <span className="ml-auto text-xs text-slate-400">{fmtDate(n.publishedAt || n.createdAt)}</span>
                  </div>
                  <p className="mt-2 whitespace-pre-line text-sm text-slate-600">{n.content}</p>
                </div>
              ))}
            </div>
          </section>
        )}

        <section>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-xl font-semibold">Upcoming events</h2>
            <Link to="/events" className="text-sm font-medium text-brand-600 hover:underline">View all</Link>
          </div>
          {loading ? (
            <Loader />
          ) : events.length === 0 ? (
            <p className="text-sm text-slate-500">No upcoming events yet. Check back soon.</p>
          ) : (
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {events.map((e) => <EventCard key={e.id} event={e} />)}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
