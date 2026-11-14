import {
  Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, Legend, Line, LineChart, Pie, PieChart,
  ResponsiveContainer, Tooltip, XAxis, YAxis,
} from 'recharts';

export const PALETTE = ['#6366f1', '#22c55e', '#f59e0b', '#ec4899', '#06b6d4', '#8b5cf6', '#ef4444', '#14b8a6'];
const AXIS = { fontSize: 12, fill: 'rgb(148 163 184)' };

function Frame({ title, subtitle, data, height = 260, children, emptyText = 'No data yet.', valueKey = 'count' }) {
  const empty = !data || data.length === 0 || data.every((d) => !(d[valueKey] ?? d.count ?? d.value));
  return (
    <div className="card">
      <h3 className="font-semibold text-slate-900">{title}</h3>
      {subtitle && <p className="text-xs text-slate-500">{subtitle}</p>}
      <div className="mt-4" style={{ height }}>
        {empty ? (
          <div className="flex h-full items-center justify-center text-sm text-slate-400">{emptyText}</div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">{children}</ResponsiveContainer>
        )}
      </div>
    </div>
  );
}

const tip = {
  contentStyle: { borderRadius: 12, border: '1px solid rgb(226 232 240)', fontSize: 12 },
};

export function TrendChart({ title, subtitle, data, dataKey = 'count', name = 'Count' }) {
  return (
    <Frame title={title} subtitle={subtitle} data={data} valueKey={dataKey}>
      <AreaChart data={data} margin={{ top: 5, right: 8, left: -20, bottom: 0 }}>
        <defs>
          <linearGradient id={`g-${title}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#6366f1" stopOpacity={0.35} />
            <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="rgb(148 163 184 / 0.25)" vertical={false} />
        <XAxis dataKey="label" tick={AXIS} tickLine={false} axisLine={false} />
        <YAxis tick={AXIS} tickLine={false} axisLine={false} allowDecimals={false} />
        <Tooltip {...tip} />
        <Area type="monotone" dataKey={dataKey} name={name} stroke="#6366f1" strokeWidth={2} fill={`url(#g-${title})`} />
      </AreaChart>
    </Frame>
  );
}

export function LineSeriesChart({ title, subtitle, data, lines }) {
  return (
    <Frame title={title} subtitle={subtitle} data={data}>
      <LineChart data={data} margin={{ top: 5, right: 8, left: -20, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="rgb(148 163 184 / 0.25)" vertical={false} />
        <XAxis dataKey="label" tick={AXIS} tickLine={false} axisLine={false} />
        <YAxis tick={AXIS} tickLine={false} axisLine={false} allowDecimals={false} />
        <Tooltip {...tip} />
        <Legend />
        {lines.map((l, i) => (
          <Line key={l.key} type="monotone" dataKey={l.key} name={l.name} stroke={PALETTE[i % PALETTE.length]} strokeWidth={2} dot={false} />
        ))}
      </LineChart>
    </Frame>
  );
}

export function BarsChart({ title, subtitle, data, dataKey = 'count', name = 'Count', horizontal = false, height }) {
  const h = height || (horizontal ? Math.max(220, data.length * 38) : 260);
  return (
    <Frame title={title} subtitle={subtitle} data={data} height={h} valueKey={dataKey}>
      <BarChart data={data} layout={horizontal ? 'vertical' : 'horizontal'} margin={{ top: 5, right: 8, left: horizontal ? 8 : -20, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="rgb(148 163 184 / 0.25)" horizontal={!horizontal} vertical={horizontal} />
        {horizontal ? (
          <>
            <XAxis type="number" tick={AXIS} tickLine={false} axisLine={false} allowDecimals={false} />
            <YAxis type="category" dataKey="label" tick={AXIS} tickLine={false} axisLine={false} width={110} />
          </>
        ) : (
          <>
            <XAxis dataKey="label" tick={AXIS} tickLine={false} axisLine={false} interval={0} />
            <YAxis tick={AXIS} tickLine={false} axisLine={false} allowDecimals={false} />
          </>
        )}
        <Tooltip {...tip} cursor={{ fill: 'rgb(148 163 184 / 0.12)' }} />
        <Bar dataKey={dataKey} name={name} radius={4} fill="#6366f1" maxBarSize={36} />
      </BarChart>
    </Frame>
  );
}

export function DonutChart({ title, subtitle, data }) {
  const rows = (data || []).map((d) => ({ name: d.label, value: d.count }));
  return (
    <Frame title={title} subtitle={subtitle} data={rows}>
      <PieChart>
        <Pie data={rows} dataKey="value" nameKey="name" innerRadius={55} outerRadius={85} paddingAngle={2} stroke="none">
          {rows.map((r, i) => (
            <Cell key={r.name} fill={PALETTE[i % PALETTE.length]} />
          ))}
        </Pie>
        <Tooltip {...tip} />
        <Legend wrapperStyle={{ fontSize: 12 }} />
      </PieChart>
    </Frame>
  );
}
