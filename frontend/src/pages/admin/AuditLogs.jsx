import { useState } from 'react';
import useFetch from '../../hooks/useFetch.js';
import useDebounce from '../../hooks/useDebounce.js';
import DashboardShell from '../../components/DashboardShell.jsx';
import { DataTable, ErrorBox, Pagination, SearchInput } from '../../components/common/Ui.jsx';
import { fmtDate } from '../../utils/format.js';

export default function AuditLogs() {
  const [q, setQ] = useState('');
  const [page, setPage] = useState(1);
  const dq = useDebounce(q);
  const { data, loading, error } = useFetch('/admin/audit-logs', { q: dq, page, limit: 25 });
  return (
    <DashboardShell title="Audit logs" subtitle="Who changed what, newest first.">
      <ErrorBox message={error} />
      <SearchInput value={q} onChange={(v) => { setQ(v); setPage(1); }} placeholder="Search by action or person" className="max-w-md" />
      <DataTable columns={['When', 'Who', 'Action', 'Target', 'Details']} loading={loading}
        empty={(data?.logs || []).length === 0 && <p className="p-6 text-sm text-slate-500">No activity recorded yet.</p>}>
        {(data?.logs || []).map((l) => (
          <tr key={l.id}>
            <td className="td whitespace-nowrap">{fmtDate(l.createdAt)}</td>
            <td className="td">{l.actor ? <><span className="font-medium text-slate-900">{l.actor.name}</span><br /><span className="text-xs text-slate-500">{l.actor.email}</span></> : 'System'}</td>
            <td className="td font-mono text-xs">{l.action}</td>
            <td className="td text-xs">{l.entityType ? `${l.entityType} #${l.entityId ?? ''}` : '-'}</td>
            <td className="td max-w-xs truncate text-xs text-slate-500" title={l.details ? JSON.stringify(l.details) : ''}>{l.details ? JSON.stringify(l.details) : ''}</td>
          </tr>
        ))}
      </DataTable>
      <Pagination pagination={data?.pagination} onPage={setPage} />
    </DashboardShell>
  );
}
