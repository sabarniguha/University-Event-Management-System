import { Link } from 'react-router-dom';
import useFetch from '../../hooks/useFetch.js';
import DashboardShell from '../../components/DashboardShell.jsx';
import StarRating from '../../components/StarRating.jsx';
import { EmptyState, ErrorBox, StatCard } from '../../components/common/Ui.jsx';
import { fmtDate } from '../../utils/format.js';

// Admin view: events and organisers ranked by what attending students rated them.
export default function EventRatings() {
  const { data, error } = useFetch('/feedback/ranking');
  return (
    <DashboardShell title="Event ratings" subtitle="Events and organisers ranked by ratings from students who attended.">
      <ErrorBox message={error} />
      {data && (
        <>
          <div className="grid gap-4 sm:grid-cols-3">
            <StatCard label="Reviews" value={data.totalReviews} />
            <StatCard label="Rated events" value={data.events.length} />
            <StatCard label="Rated organisers" value={data.organizers.length} />
          </div>

          <section className="card">
            <h2 className="mb-3 font-semibold text-slate-900">Top organisers</h2>
            {data.organizers.length === 0 ? <EmptyState>No ratings yet.</EmptyState> : (
              <ol className="divide-y divide-slate-100">
                {data.organizers.map((o, i) => (
                  <li key={o.organizerId} className="flex flex-wrap items-center justify-between gap-2 py-2 text-sm">
                    <span><span className="mr-2 text-slate-400">{i + 1}.</span><span className="font-medium">{o.organizer}</span> <span className="text-xs text-slate-400">{o.events} event{o.events === 1 ? '' : 's'}, {o.count} review{o.count === 1 ? '' : 's'}</span></span>
                    <span className="flex items-center gap-2"><b>{o.average}</b><StarRating value={o.average} size="text-base" /></span>
                  </li>
                ))}
              </ol>
            )}
          </section>

          <section className="card">
            <h2 className="mb-3 font-semibold text-slate-900">Events by rating</h2>
            {data.events.length === 0 ? <EmptyState>No ratings yet.</EmptyState> : (
              <ol className="divide-y divide-slate-100">
                {data.events.map((e, i) => (
                  <li key={e.eventId} className="flex flex-wrap items-center justify-between gap-2 py-2 text-sm">
                    <span className="min-w-0">
                      <span className="mr-2 text-slate-400">{i + 1}.</span>
                      <Link to={`/events/${e.eventId}`} className="font-medium text-brand-700 hover:underline">{e.title}</Link>
                      <span className="ml-2 text-xs text-slate-400">{e.organizer}{e.startsAt ? `, ${fmtDate(e.startsAt)}` : ''}, {e.count} review{e.count === 1 ? '' : 's'}</span>
                    </span>
                    <span className="flex items-center gap-2"><b>{e.average}</b><StarRating value={e.average} size="text-base" /></span>
                  </li>
                ))}
              </ol>
            )}
          </section>
        </>
      )}
    </DashboardShell>
  );
}
