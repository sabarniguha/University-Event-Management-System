import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { SlidersHorizontal, X, CalendarX } from 'lucide-react';
import useFetch from '../../hooks/useFetch.js';
import useDebounce from '../../hooks/useDebounce.js';
import EventCard from '../../components/events/EventCard.jsx';
import { CardSkeletons, EmptyState, ErrorBox, Pagination, SearchInput } from '../../components/common/Ui.jsx';
import { DEPARTMENTS, EVENT_TYPES } from '../../utils/format.js';

const SORTS = [['upcoming', 'Upcoming first'], ['newest', 'Newest'], ['popular', 'Most popular']];
const DATES = [['', 'Any date'], ['today', 'Today'], ['week', 'Next 7 days'], ['month', 'Next 30 days']];

function Select({ label, value, onChange, children }) {
  return (
    <label className="block">
      <span className="label">{label}</span>
      <select className="input" value={value} onChange={(e) => onChange(e.target.value)}>{children}</select>
    </label>
  );
}

export default function Explore() {
  const [params, setParams] = useSearchParams();
  const [showFilters, setShowFilters] = useState(false);
  const [q, setQ] = useState(params.get('q') || '');
  const dq = useDebounce(q);
  const { data: cats } = useFetch('/categories');

  const get = (k, d = '') => params.get(k) || d;
  const set = (patch) => {
    const next = new URLSearchParams(params);
    Object.entries(patch).forEach(([k, v]) => (v ? next.set(k, v) : next.delete(k)));
    if (!('page' in patch)) next.delete('page');
    setParams(next, { replace: true });
  };

  // Keep the URL in sync with the debounced search box.
  useEffect(() => {
    if ((params.get('q') || '') !== dq) set({ q: dq });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dq]);

  const query = useMemo(() => {
    const o = { limit: 12, page: get('page', '1'), sort: get('sort', 'upcoming') };
    ['q', 'category', 'date', 'department', 'eventType', 'mode', 'price', 'featured', 'scope'].forEach((k) => {
      if (params.get(k)) o[k] = params.get(k);
    });
    return o;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.toString()]);

  const { data, loading, error } = useFetch('/events', query);
  const active = ['category', 'date', 'department', 'eventType', 'mode', 'price', 'featured', 'scope'].filter((k) => params.get(k));
  const clear = () => { setQ(''); setParams({}, { replace: true }); };

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-6">
        <h1 className="text-3xl font-bold tracking-tight text-slate-900">Explore events</h1>
        <p className="mt-1 text-slate-500">Search and filter everything happening on campus.</p>
      </div>

      <div className="mb-4 flex flex-col gap-3 sm:flex-row">
        <SearchInput className="flex-1" value={q} onChange={setQ} placeholder="Search by title, venue or topic" />
        <select className="input sm:w-48" value={get('sort', 'upcoming')} onChange={(e) => set({ sort: e.target.value })} aria-label="Sort events">
          {SORTS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
        </select>
        <button className="btn-outline sm:hidden" onClick={() => setShowFilters((s) => !s)}>
          <SlidersHorizontal className="h-4 w-4" /> Filters {active.length > 0 && `(${active.length})`}
        </button>
      </div>

      <div className="grid gap-6 lg:grid-cols-[260px_1fr]">
        <aside className={`${showFilters ? 'block' : 'hidden'} space-y-4 sm:block`} aria-label="Filters">
          <div className="card space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="font-semibold text-slate-900">Filters</h2>
              {(active.length > 0 || q) && <button onClick={clear} className="flex items-center gap-1 text-xs font-medium text-brand-600 hover:underline"><X className="h-3 w-3" /> Clear all</button>}
            </div>
            <Select label="Category" value={get('category')} onChange={(v) => set({ category: v })}>
              <option value="">All categories</option>
              {(cats?.categories || []).map((c) => <option key={c.id} value={c.name}>{c.name}</option>)}
            </Select>
            <Select label="Date" value={get('date')} onChange={(v) => set({ date: v })}>
              {DATES.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            </Select>
            <Select label="Department" value={get('department')} onChange={(v) => set({ department: v })}>
              <option value="">All departments</option>
              {DEPARTMENTS.map((d) => <option key={d}>{d}</option>)}
            </Select>
            <Select label="Event type" value={get('eventType')} onChange={(v) => set({ eventType: v })}>
              <option value="">Any type</option>
              {EVENT_TYPES.map((d) => <option key={d}>{d}</option>)}
            </Select>
            <Select label="Format" value={get('mode')} onChange={(v) => set({ mode: v })}>
              <option value="">Online and offline</option>
              <option value="OFFLINE">In person</option>
              <option value="ONLINE">Online</option>
              <option value="HYBRID">Hybrid</option>
            </Select>
            <Select label="Price" value={get('price')} onChange={(v) => set({ price: v })}>
              <option value="">Free and paid</option>
              <option value="free">Free</option>
              <option value="paid">Paid</option>
            </Select>
            <Select label="Show" value={get('scope')} onChange={(v) => set({ scope: v })}>
              <option value="">Upcoming events</option>
              <option value="past">Past events</option>
              <option value="all">All events</option>
            </Select>
          </div>
        </aside>

        <section aria-live="polite">
          <ErrorBox message={error} />
          {loading && !data ? (
            <CardSkeletons count={6} />
          ) : (data?.events || []).length === 0 ? (
            <EmptyState icon={CalendarX} title="No events found" action={(active.length > 0 || q) && <button className="btn-outline" onClick={clear}>Clear filters</button>}>
              {active.length > 0 || q ? 'Nothing matches your search. Try removing a filter.' : 'There are no upcoming events yet. Check back soon.'}
            </EmptyState>
          ) : (
            <>
              <div className={`grid gap-5 sm:grid-cols-2 xl:grid-cols-3 ${loading ? 'opacity-60' : ''}`}>
                {data.events.map((e) => <EventCard key={e.id} event={e} />)}
              </div>
              <Pagination pagination={data.pagination} onPage={(p) => set({ page: String(p) })} />
            </>
          )}
        </section>
      </div>
    </div>
  );
}
