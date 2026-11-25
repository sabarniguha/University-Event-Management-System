import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import useFetch from '../../hooks/useFetch.js';
import { fmtTime } from '../../utils/format.js';

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const keyOf = (d) => `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
const ymd = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

// A month grid of published events. Each event appears on the day it starts; pick a day to list its events.
export default function MonthCalendar() {
  const today = new Date();
  const [month, setMonth] = useState(new Date(today.getFullYear(), today.getMonth(), 1));
  const [picked, setPicked] = useState(keyOf(today));

  // One day of slack each side so time-zone differences never hide an event; days are matched locally below.
  const from = new Date(month.getFullYear(), month.getMonth(), 0);
  const to = new Date(month.getFullYear(), month.getMonth() + 1, 1);
  const { data, loading } = useFetch('/events', { scope: 'all', dateFrom: ymd(from), dateTo: ymd(to), limit: 50, sort: 'upcoming' });

  const byDay = useMemo(() => {
    const m = new Map();
    for (const e of data?.events || []) {
      const k = keyOf(new Date(e.startsAt));
      m.set(k, [...(m.get(k) || []), e]);
    }
    return m;
  }, [data]);

  const first = month.getDay();
  const count = new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate();
  const cells = [...Array(first).fill(null), ...Array.from({ length: count }, (_, i) => new Date(month.getFullYear(), month.getMonth(), i + 1))];
  const shift = (n) => setMonth(new Date(month.getFullYear(), month.getMonth() + n, 1));
  const list = byDay.get(picked) || [];

  return (
    <div className="space-y-4">
      <div className="card">
        <div className="mb-3 flex items-center justify-between">
          <button className="btn-outline btn-sm" onClick={() => shift(-1)} aria-label="Previous month"><ChevronLeft className="h-4 w-4" /></button>
          <h2 className="font-semibold text-slate-900">{month.toLocaleDateString([], { month: 'long', year: 'numeric' })}{loading && <span className="ml-2 text-xs font-normal text-slate-400">loading...</span>}</h2>
          <button className="btn-outline btn-sm" onClick={() => shift(1)} aria-label="Next month"><ChevronRight className="h-4 w-4" /></button>
        </div>
        <div className="grid grid-cols-7 gap-1 text-center text-xs font-medium text-slate-500">{DAYS.map((d) => <div key={d}>{d}</div>)}</div>
        <div className="mt-1 grid grid-cols-7 gap-1">
          {cells.map((d, i) => {
            if (!d) return <div key={`b${i}`} />;
            const k = keyOf(d); const n = (byDay.get(k) || []).length;
            const isToday = k === keyOf(today); const sel = k === picked;
            return (
              <button key={k} onClick={() => setPicked(k)} aria-label={`${d.toDateString()}, ${n} event${n === 1 ? '' : 's'}`}
                className={`flex h-14 flex-col items-center justify-start rounded-lg border p-1 text-sm transition sm:h-20 ${sel ? 'border-brand-500 bg-brand-50' : 'border-slate-100 hover:bg-slate-50'} ${isToday ? 'font-bold text-brand-600' : 'text-slate-700'}`}>
                <span>{d.getDate()}</span>
                {n > 0 && <span className="mt-1 rounded-full bg-brand-600 px-1.5 text-[10px] font-semibold text-white">{n}<span className="hidden sm:inline"> event{n === 1 ? '' : 's'}</span></span>}
              </button>
            );
          })}
        </div>
        {(data?.pagination?.total || 0) > 50 && <p className="mt-2 text-xs text-slate-400">Showing the first 50 events of this month.</p>}
      </div>
      <div className="card">
        <h3 className="mb-2 font-semibold text-slate-900">Events on this day</h3>
        {list.length === 0 ? <p className="text-sm text-slate-500">No events on this day.</p> : (
          <ul className="divide-y divide-slate-100">
            {list.map((e) => (
              <li key={e.id} className="flex items-center justify-between gap-3 py-2">
                <div><Link to={`/events/${e.id}`} className="font-medium text-slate-900 hover:text-brand-600">{e.title}</Link><p className="text-xs text-slate-500">{fmtTime(e.startsAt)} to {fmtTime(e.endsAt)} · {e.venue || 'Online'} · {e.category}</p></div>
                <Link to={`/events/${e.id}`} className="btn-outline btn-sm">View</Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
