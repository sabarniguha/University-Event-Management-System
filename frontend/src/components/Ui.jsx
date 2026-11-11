export function Loader({ label = 'Loading...' }) {
  return (
    <div className="flex items-center justify-center gap-3 py-16 text-slate-500">
      <span className="h-5 w-5 animate-spin rounded-full border-2 border-slate-300 border-t-brand-600" />
      <span className="text-sm">{label}</span>
    </div>
  );
}

export function ErrorBox({ message }) {
  if (!message) return null;
  return (
    <div role="alert" className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
      {message}
    </div>
  );
}

export function SuccessBox({ message }) {
  if (!message) return null;
  return (
    <div role="status" className="rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">
      {message}
    </div>
  );
}

const TONES = {
  green: 'bg-green-100 text-green-700',
  red: 'bg-red-100 text-red-700',
  yellow: 'bg-yellow-100 text-yellow-800',
  blue: 'bg-blue-100 text-blue-700',
  indigo: 'bg-indigo-100 text-indigo-700',
  gray: 'bg-slate-100 text-slate-600',
};

const STATUS_TONE = {
  PUBLISHED: 'green',
  DRAFT: 'gray',
  CANCELLED: 'red',
  REGISTERED: 'green',
  WAITLISTED: 'yellow',
  QR: 'indigo',
  MANUAL: 'gray',
  PRESENT: 'green',
  ABSENT: 'red',
  NORMAL: 'gray',
  IMPORTANT: 'yellow',
  URGENT: 'red',
  ADMIN: 'red',
  ORGANIZER: 'indigo',
  STUDENT: 'blue',
};

export function Badge({ children, tone }) {
  const t = tone || STATUS_TONE[children] || 'gray';
  return (
    <span className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-medium ${TONES[t]}`}>{children}</span>
  );
}

export function EmptyState({ children }) {
  return <div className="rounded-xl border border-dashed border-slate-300 p-10 text-center text-sm text-slate-500">{children}</div>;
}
