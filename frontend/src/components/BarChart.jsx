// Lightweight horizontal bar chart built with plain divs (no chart library needed).
export default function BarChart({ title, data, unit = '', emptyText = 'No data yet.' }) {
  const max = Math.max(1, ...data.map((d) => d.count));

  return (
    <div className="card">
      <h3 className="mb-4 font-semibold text-slate-900">{title}</h3>
      {data.length === 0 || data.every((d) => d.count === 0) ? (
        <p className="text-sm text-slate-400">{emptyText}</p>
      ) : (
        <ul className="space-y-3">
          {data.map((d) => (
            <li key={d.label}>
              <div className="mb-1 flex items-center justify-between text-sm">
                <span className="truncate pr-2 text-slate-600">{d.label}</span>
                <span className="font-medium text-slate-900">{d.count}{unit}</span>
              </div>
              <div className="h-2.5 overflow-hidden rounded-full bg-slate-100" role="presentation">
                <div
                  className="h-full rounded-full bg-brand-600"
                  style={{ width: `${Math.max(2, (d.count / max) * 100)}%` }}
                />
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

// Small inline progress bar used in tables (value is 0-100 or null).
export function RateBar({ value }) {
  if (value === null || value === undefined) return <span className="text-xs text-slate-400">–</span>;
  const tone = value >= 75 ? 'bg-green-500' : value >= 40 ? 'bg-yellow-500' : 'bg-red-500';
  return (
    <div className="flex items-center gap-2">
      <div className="h-2 w-24 overflow-hidden rounded-full bg-slate-100">
        <div className={`h-full rounded-full ${tone}`} style={{ width: `${Math.min(100, value)}%` }} />
      </div>
      <span className="text-xs font-medium text-slate-700">{value}%</span>
    </div>
  );
}
