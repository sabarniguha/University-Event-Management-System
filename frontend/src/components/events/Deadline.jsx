import { useEffect, useState } from 'react';
import { Clock } from 'lucide-react';
import { fmtDate } from '../../utils/format.js';

// Plain-language time left until a deadline.
export const timeLeft = (deadline, now = Date.now()) => {
  const ms = new Date(deadline).getTime() - now;
  if (ms <= 0) return { closed: true, text: 'Registration closed', urgent: false };
  const mins = Math.floor(ms / 60000);
  const days = Math.floor(mins / 1440);
  const hours = Math.floor((mins % 1440) / 60);
  let text;
  if (days >= 1) text = `${days} day${days === 1 ? '' : 's'} ${hours}h left`;
  else if (hours >= 1) text = `${hours}h ${mins % 60}m left`;
  else text = `${Math.max(1, mins)} min left`;
  return { closed: false, text, urgent: days < 2 };
};

const useNow = () => {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 30000);
    return () => clearInterval(t);
  }, []);
  return now;
};

// Small pill for event cards.
export function DeadlinePill({ deadline }) {
  const now = useNow();
  if (!deadline) return null;
  const t = timeLeft(deadline, now);
  const tone = t.closed ? 'bg-slate-100 text-slate-500' : t.urgent ? 'bg-red-50 text-red-700' : 'bg-brand-50 text-brand-700';
  return <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold ${tone}`}><Clock className="h-3 w-3" />{t.closed ? 'Closed' : `Closes: ${t.text}`}</span>;
}

// Prominent box for the event page: exact date, live countdown.
export function DeadlineBox({ deadline }) {
  const now = useNow();
  if (!deadline) return <p className="rounded-xl bg-slate-50 px-3 py-2 text-sm text-slate-500">No registration deadline was set for this event.</p>;
  const t = timeLeft(deadline, now);
  const tone = t.closed ? 'border-slate-200 bg-slate-50 text-slate-600' : t.urgent ? 'border-red-200 bg-red-50 text-red-800' : 'border-brand-200 bg-brand-50 text-brand-800';
  return (
    <div className={`rounded-xl border px-3 py-2.5 text-sm ${tone}`}>
      <div className="flex items-center gap-2 font-semibold"><Clock className="h-4 w-4" /> {t.closed ? 'Registration closed' : 'Registration deadline'}</div>
      <div className="mt-0.5">{fmtDate(deadline)}</div>
      {!t.closed && <div className="mt-0.5 text-xs font-semibold">{t.text}</div>}
    </div>
  );
}
