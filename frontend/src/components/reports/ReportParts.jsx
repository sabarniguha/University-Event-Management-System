import { mediaUrl } from '../../services/api.js';

// Small, print-safe building blocks for the reports. Plain SVG and CSS (no animation, no hover) so the
// printed or saved PDF looks exactly like the screen.
export const COLORS = ['#4f46e5', '#16a34a', '#f59e0b', '#db2777', '#0891b2', '#7c3aed', '#dc2626', '#0d9488', '#64748b'];

export const num = (n) => (n === null || n === undefined ? '-' : Number(n).toLocaleString('en-IN'));
export const rupees = (n) => (n === null || n === undefined ? '-' : `₹${Number(n).toLocaleString('en-IN', { maximumFractionDigits: 2 })}`);
export const pc = (n) => (n === null || n === undefined ? '-' : `${n}%`);
export const stars = (n) => (n === null || n === undefined ? '-' : `${n} / 5`);

export function Section({ title, note, children, className = '', flow = false }) {
  return (
    <section className={`${flow ? '' : 'report-block '}mt-7 ${className}`}>
      <h2 className="border-b-2 border-brand-600 pb-1 text-base font-bold uppercase tracking-wide text-slate-900">{title}</h2>
      {note && <p className="mt-1 text-xs text-slate-500">{note}</p>}
      <div className="mt-3">{children}</div>
    </section>
  );
}

// A headline figure, optionally with how it moved against the previous period.
export function Figure({ label, value, sub, change }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-3">
      <p className="text-[11px] font-medium uppercase tracking-wide text-slate-500">{label}</p>
      <p className="mt-1 text-2xl font-bold text-slate-900">{value}</p>
      {change !== undefined && change !== null && (
        <p className={`text-xs font-semibold ${change > 0 ? 'text-emerald-600' : change < 0 ? 'text-red-600' : 'text-slate-500'}`}>
          {change > 0 ? '▲' : change < 0 ? '▼' : '='} {Math.abs(change)}% vs previous
        </p>
      )}
      {sub && <p className="text-xs text-slate-500">{sub}</p>}
    </div>
  );
}

// Columns for one or more series over time (days, months). series: [{ key, name }]
export function ColumnChart({ data, series, height = 180, emptyText = 'Nothing to show for this period.' }) {
  const max = Math.max(0, ...data.flatMap((d) => series.map((s) => d[s.key] || 0)));
  if (max === 0) return <p className="rounded-lg bg-slate-50 p-6 text-center text-sm text-slate-400">{emptyText}</p>;
  const W = 640;
  const H = height;
  const pad = { l: 34, r: 6, t: 8, b: 22 };
  const innerW = W - pad.l - pad.r;
  const innerH = H - pad.t - pad.b;
  const group = innerW / data.length;
  const bar = Math.min(18, (group * 0.8) / series.length);
  const ticks = [0, 0.5, 1].map((f) => Math.round(max * f));
  const every = data.length > 16 ? 2 : 1;
  return (
    <div>
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img" aria-label="Chart">
        {ticks.map((t) => {
          const y = pad.t + innerH - (t / max) * innerH;
          return (<g key={t}><line x1={pad.l} x2={W - pad.r} y1={y} y2={y} stroke="#e2e8f0" strokeWidth="1" /><text x={pad.l - 4} y={y + 3} textAnchor="end" fontSize="9" fill="#64748b">{num(t)}</text></g>);
        })}
        {data.map((d, i) => {
          const cx = pad.l + group * i + group / 2;
          return (
            <g key={d.label}>
              {series.map((s, k) => {
                const h = ((d[s.key] || 0) / max) * innerH;
                return <rect key={s.key} x={cx - (bar * series.length) / 2 + bar * k} y={pad.t + innerH - h} width={bar - 1} height={h} rx="2" fill={COLORS[k % COLORS.length]} />;
              })}
              {i % every === 0 && <text x={cx} y={H - 7} textAnchor="middle" fontSize="9" fill="#64748b">{d.label}</text>}
            </g>
          );
        })}
      </svg>
      {series.length > 1 && (
        <p className="mt-1 flex flex-wrap gap-4 text-xs text-slate-600">
          {series.map((s, k) => <span key={s.key} className="inline-flex items-center gap-1.5"><i className="inline-block h-2.5 w-2.5 rounded-sm" style={{ background: COLORS[k % COLORS.length] }} />{s.name}</span>)}
        </p>
      )}
    </div>
  );
}

// Horizontal bars with the figure written beside each one.
export function BarList({ rows, valueKey = 'count', unit = '', unitOne, empty = 'No data.' }) {
  const max = Math.max(0, ...rows.map((r) => r[valueKey] || 0));
  if (!rows.length || max === 0) return <p className="rounded-lg bg-slate-50 p-4 text-center text-sm text-slate-400">{empty}</p>;
  return (
    <ul className="space-y-1.5">
      {rows.map((r, i) => (
        <li key={r.label} className="text-xs">
          <div className="flex justify-between gap-2"><span className="truncate text-slate-700">{r.label}</span><span className="font-semibold text-slate-900">{num(r[valueKey])}{r[valueKey] === 1 && unitOne !== undefined ? unitOne : unit}</span></div>
          <div className="h-2 rounded-full bg-slate-100"><div className="h-2 rounded-full" style={{ width: `${((r[valueKey] || 0) / max) * 100}%`, background: COLORS[i % COLORS.length] }} /></div>
        </li>
      ))}
    </ul>
  );
}

export function Donut({ rows, valueKey = 'count', size = 130 }) {
  const total = rows.reduce((a, r) => a + (r[valueKey] || 0), 0);
  if (total === 0) return <p className="rounded-lg bg-slate-50 p-4 text-center text-sm text-slate-400">No data.</p>;
  const R = 40;
  const C = 2 * Math.PI * R;
  let offset = 0;
  return (
    <div className="flex items-center gap-4">
      <svg viewBox="0 0 100 100" width={size} height={size} role="img" aria-label="Chart" className="shrink-0 -rotate-90">
        {rows.map((r, i) => {
          const len = ((r[valueKey] || 0) / total) * C;
          const el = <circle key={r.label} cx="50" cy="50" r={R} fill="none" stroke={COLORS[i % COLORS.length]} strokeWidth="16" strokeDasharray={`${len} ${C - len}`} strokeDashoffset={-offset} />;
          offset += len;
          return el;
        })}
      </svg>
      <ul className="min-w-0 flex-1 space-y-1 text-xs">
        {rows.map((r, i) => <li key={r.label} className="flex items-center gap-2"><i className="inline-block h-2.5 w-2.5 shrink-0 rounded-sm" style={{ background: COLORS[i % COLORS.length] }} /><span className="truncate text-slate-700">{r.label}</span><span className="ml-auto font-semibold text-slate-900">{num(r[valueKey])} <span className="font-normal text-slate-500">({Math.round((r[valueKey] / total) * 100)}%)</span></span></li>)}
      </ul>
    </div>
  );
}

export function Banner({ url, className = '' }) {
  if (!url) return <div className={`flex items-center justify-center rounded-lg bg-gradient-to-br from-indigo-500 to-violet-500 text-xs font-semibold text-white ${className}`}>UniEvents</div>;
  return <img src={mediaUrl(url)} alt="" className={`rounded-lg object-cover ${className}`} />;
}

export function Table({ head, children, className = '' }) {
  return (
    <table className={`w-full border-collapse text-xs ${className}`}>
      <thead><tr className="bg-slate-100 text-left text-[11px] uppercase tracking-wide text-slate-600">{head.map((h) => <th key={h} className="py-1.5 font-semibold">{h}</th>)}</tr></thead>
      <tbody className="[&>tr]:border-b [&>tr]:border-slate-100 [&_td]:px-1.5 [&_td]:py-1.5 [&_th]:px-1.5 [&>tr]:break-inside-avoid">{children}</tbody>
    </table>
  );
}

export function Cover({ kicker, title, subtitle, lines }) {
  return (
    <header className="flex items-start justify-between gap-4 border-b-4 border-brand-600 pb-4">
      <div>
        <p className="text-xs font-bold uppercase tracking-[0.2em] text-brand-600">{kicker}</p>
        <h1 className="mt-1 text-3xl font-extrabold tracking-tight text-slate-900">{title}</h1>
        {subtitle && <p className="mt-1 text-lg text-slate-600">{subtitle}</p>}
      </div>
      <div className="shrink-0 text-right text-xs text-slate-500">
        <p className="text-base font-extrabold text-slate-900">UniEvents</p>
        {lines.map((l) => <p key={l}>{l}</p>)}
      </div>
    </header>
  );
}
