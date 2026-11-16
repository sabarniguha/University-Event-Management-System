import useFetch from '../../hooks/useFetch.js';
import DashboardShell from '../../components/DashboardShell.jsx';
import { Badge, EmptyState, ErrorBox, Loader } from '../../components/common/Ui.jsx';
import { fmtDate } from '../../utils/format.js';

// A student's payment receipts.
export default function StudentPayments() {
  const { data, loading, error } = useFetch('/payments/mine');
  const list = data?.payments || [];
  return (
    <DashboardShell title="My payments" subtitle="Receipts for event fees you paid online.">
      <ErrorBox message={error} />
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
