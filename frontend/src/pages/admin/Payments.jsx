import { useState } from 'react';
import useFetch from '../../hooks/useFetch.js';
import api from '../../services/api.js';
import { useAuth } from '../../context/AuthContext.jsx';
import { useToast } from '../../context/ToastContext.jsx';
import DashboardShell from '../../components/DashboardShell.jsx';
import { Badge, DataTable, ErrorBox } from '../../components/common/Ui.jsx';
import { errMsg, fmtDate } from '../../utils/format.js';

const FILTERS = [['', 'All'], ['NEEDS_REFUND', 'Needs refund'], ['PAID', 'Paid'], ['REFUNDED', 'Refunded'], ['CREATED', 'Pending']];

export default function Payments() {
  const toast = useToast();
  const { user } = useAuth();
  const isAdmin = user.role === 'ADMIN';
  const [status, setStatus] = useState('');
  const { data, loading, error, reload } = useFetch('/payments', { status });
  const rows = data?.payments || [];

  const refundNow = async (id) => {
    try {
      await api.post(`/payments/${id}/refund`);
      toast.success('Refund sent through Razorpay');
      reload();
    } catch (e) {
      toast.error(errMsg(e));
    }
  };

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
    <DashboardShell title="Payments" subtitle={isAdmin ? "Event fees paid online. Payments that could not get a seat are refunded automatically; if that fails, use Refund now." : "Who has paid for your events, with their Razorpay payment IDs."}>
      <ErrorBox message={error} />
      {data?.summary && (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {[['PAID', 'Collected'], ['CREATED', 'Pending (not completed)'], ['NEEDS_REFUND', 'Needs refund'], ['REFUNDED', 'Refunded']].map(([k, label]) => (
            <div key={k} className="card"><p className="text-xs uppercase tracking-wide text-slate-400">{label}</p><p className="mt-1 text-2xl font-bold text-slate-900">₹{((data.summary[k]?.amount || 0) / 100).toLocaleString('en-IN')}</p><p className="text-xs text-slate-500">{data.summary[k]?.count || 0} payment(s)</p></div>
          ))}
        </div>
      )}
      {data && !data.enabled && (
        <div className="rounded-xl border border-yellow-200 bg-yellow-50 px-4 py-3 text-sm text-yellow-900">
          <p className="font-semibold">Online payments are switched off</p>
          {isAdmin ? (
            <ol className="mt-1 list-decimal space-y-0.5 pl-5">
              <li>Create a Razorpay account at razorpay.com and open Dashboard, then Account &amp; Settings, then API Keys.</li>
              <li>Start with <b>Test mode</b>, generate keys (they start with <code>rzp_test_</code>) and copy the Key ID and Key Secret.</li>
              <li>In Render, open your service, then Environment, and add <code>RAZORPAY_KEY_ID</code> and <code>RAZORPAY_KEY_SECRET</code>. Save and redeploy.</li>
              <li>In Razorpay, under Payment Methods, make sure <b>UPI</b> (QR, Google Pay, PhonePe, Paytm), cards and netbanking are enabled.</li>
              <li>Give an event a fee. Students then see a <b>Pay</b> button with UPI first. Use live keys (<code>rzp_live_</code>) only after a successful test payment.</li>
            </ol>
          ) : <p>The administrator has not enabled payments yet. Past payments, if any, are listed below.</p>}
        </div>
      )}
      <div className="flex flex-wrap gap-2">
        {FILTERS.map(([v, label]) => (
          <button key={v} onClick={() => setStatus(v)} className={status === v ? 'btn-primary' : 'btn-outline'}>{label}</button>
        ))}
      </div>
      <DataTable columns={['When', 'Student', 'Event', 'Amount', 'Payment ID', 'Status', '']} loading={loading}
        empty={rows.length === 0 && <p className="p-6 text-sm text-slate-500">No payments yet.</p>}>
        {rows.map((p) => (
          <tr key={p.id}>
            <td className="td whitespace-nowrap">{fmtDate(p.createdAt)}</td>
            <td className="td"><span className="font-medium text-slate-900">{p.user.name}</span><br /><span className="text-xs text-slate-500">{p.user.email}{p.user.studentId ? ` · ${p.user.studentId}` : ''}</span></td>
            <td className="td">{p.event.title}</td>
            <td className="td">₹{(p.amount / 100).toLocaleString('en-IN')}</td>
            <td className="td font-mono text-xs">{p.paymentId || '-'}</td>
            <td className="td"><Badge>{p.status}</Badge></td>
            <td className="td">{isAdmin && p.status === 'NEEDS_REFUND' && <div className="flex gap-2"><button className="btn-primary" onClick={() => refundNow(p.id)}>Refund now</button><button className="btn-outline" onClick={() => refunded(p.id)}>Already refunded</button></div>}</td>
          </tr>
        ))}
      </DataTable>
    </DashboardShell>
  );
}
