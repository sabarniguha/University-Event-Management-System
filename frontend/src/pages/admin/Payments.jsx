import { useState } from 'react';
import useFetch from '../../hooks/useFetch.js';
import api from '../../services/api.js';
import { useToast } from '../../context/ToastContext.jsx';
import DashboardShell from '../../components/DashboardShell.jsx';
import { Badge, DataTable, ErrorBox } from '../../components/common/Ui.jsx';
import { errMsg, fmtDate } from '../../utils/format.js';

const FILTERS = [['', 'All'], ['NEEDS_REFUND', 'Needs refund'], ['PAID', 'Paid'], ['REFUNDED', 'Refunded'], ['CREATED', 'Unpaid']];

export default function Payments() {
  const toast = useToast();
  const [status, setStatus] = useState('');
  const { data, loading, error, reload } = useFetch('/payments', { status });
  const rows = data?.payments || [];

  const refunded = async (id) => {
    try {
      await api.patch(`/payments/${id}/refunded`);
      toast.success('Marked as refunded');
      reload();
    } catch (e) {
      toast.error(errMsg(e));
    }
  };

  return (
    <DashboardShell title="Payments" subtitle="Event fees paid online. Refunds are made in the Razorpay dashboard, then marked here.">
      <ErrorBox message={error} />
      {data && !data.enabled && <p className="rounded-xl border border-yellow-200 bg-yellow-50 px-4 py-3 text-sm text-yellow-800">Online payments are switched off (no Razorpay keys set). Past payments, if any, are still listed.</p>}
      <div className="flex flex-wrap gap-2">
        {FILTERS.map(([v, label]) => (
          <button key={v} onClick={() => setStatus(v)} className={status === v ? 'btn-primary' : 'btn-outline'}>{label}</button>
        ))}
      </div>
      <DataTable columns={['When', 'Student', 'Event', 'Amount', 'Status', '']} loading={loading}
        empty={rows.length === 0 && <p className="p-6 text-sm text-slate-500">No payments yet.</p>}>
        {rows.map((p) => (
          <tr key={p.id}>
            <td className="td whitespace-nowrap">{fmtDate(p.createdAt)}</td>
            <td className="td"><span className="font-medium text-slate-900">{p.user.name}</span><br /><span className="text-xs text-slate-500">{p.user.email}</span></td>
            <td className="td">{p.event.title}</td>
            <td className="td">₹{(p.amount / 100).toLocaleString('en-IN')}</td>
            <td className="td"><Badge>{p.status}</Badge></td>
            <td className="td">{p.status === 'NEEDS_REFUND' && <button className="btn-outline" onClick={() => refunded(p.id)}>Mark refunded</button>}</td>
          </tr>
        ))}
      </DataTable>
    </DashboardShell>
  );
}
