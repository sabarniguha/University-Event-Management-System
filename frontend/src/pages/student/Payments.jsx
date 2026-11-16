import useFetch from '../../hooks/useFetch.js';
import DashboardShell from '../../components/DashboardShell.jsx';
import { Badge, EmptyState, ErrorBox, Loader } from '../../components/common/Ui.jsx';
import { Link } from 'react-router-dom';
import { fmtDate } from '../../utils/format.js';

// A student's payment receipts.
export default function StudentPayments() {
  const { data, loading, error } = useFetch('/payments/mine');
  const all = data?.payments || [];
  const pending = all.filter((p) => p.status === 'CREATED');
  const list = all.filter((p) => p.status !== 'CREATED');
  return (
    <DashboardShell title="My payments" subtitle="Receipts for event fees you paid online.">
      <ErrorBox message={error} />
      {pending.length > 0 && (
        <section className="rounded-xl border border-yellow-200 bg-yellow-50 p-4">
          <h2 className="font-semibold text-yellow-900">Pending payments ({pending.length})</h2>
          <p className="text-sm text-yellow-800">You started paying for these but did not finish. Your seat is not booked until the payment is complete.</p>
          <ul className="mt-2 space-y-2">
            {pending.map((p) => (
              <li key={p.id} className="flex flex-wrap items-center justify-between gap-2 text-sm">
                <span><b>{p.event.title}</b> &middot; ₹{(p.amount / 100).toLocaleString('en-IN')} &middot; started {fmtDate(p.createdAt)}</span>
                <Link to={`/events/${p.event.id}`} className="btn-primary btn-sm">Complete payment</Link>
              </li>
            ))}
          </ul>
        </section>
      )}
      {loading ? <Loader /> : list.length === 0 ? (
        <EmptyState title="No payments yet">When you pay for an event, your receipt appears here.</EmptyState>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {list.map((p) => (
            <div key={p.id} className="card">
              <div className="flex items-start justify-between gap-2">
                <h2 className="font-semibold text-slate-900">{p.event.title}</h2>
                <Badge>{p.status === 'PAID' ? 'PAID' : p.status}</Badge>
              </div>
              <p className="mt-1 text-2xl font-bold text-slate-900">₹{(p.amount / 100).toLocaleString('en-IN')}</p>
              <p className="mt-1 text-xs text-slate-500">Paid {fmtDate(p.paidAt || p.createdAt)}</p>
              <p className="mt-1 break-all font-mono text-[11px] text-slate-400">Payment {p.paymentId || '-'} &middot; Order {p.orderId}</p>
            </div>
          ))}
        </div>
      )}
    </DashboardShell>
  );
}
