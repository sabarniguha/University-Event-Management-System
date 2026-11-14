import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Award, Eye } from 'lucide-react';
import useFetch from '../../hooks/useFetch.js';
import useDebounce from '../../hooks/useDebounce.js';
import DashboardShell from '../../components/DashboardShell.jsx';
import { Badge, DataTable, EmptyState, ErrorBox, Pagination, SearchInput } from '../../components/common/Ui.jsx';
import { fmtDay } from '../../utils/format.js';

export default function AdminCertificates() {
  const [q, setQ] = useState('');
  const [page, setPage] = useState(1);
  const dq = useDebounce(q);
  const { data, loading, error } = useFetch('/certificates', { q: dq, page, limit: 20 });
  const list = data?.certificates || [];
  return (
    <DashboardShell title="Certificates" subtitle="Every certificate issued on the platform.">
      <ErrorBox message={error} />
      <SearchInput value={q} onChange={(v) => { setQ(v); setPage(1); }} placeholder="Search by certificate ID, student or event" className="max-w-md" />
      <DataTable columns={['Certificate ID', 'Student', 'Event', 'Issued', 'Status', '']} loading={loading}
        empty={list.length === 0 && <div className="p-6"><EmptyState icon={Award} title="No certificates">None match yet.</EmptyState></div>}>
        {list.map((c) => (
          <tr key={c.certificateId}>
            <td className="td font-mono text-xs">{c.certificateId}</td>
            <td className="td font-medium text-slate-900">{c.studentName}</td>
            <td className="td">{c.eventTitle}</td>
            <td className="td">{fmtDay(c.issuedAt)}</td>
            <td className="td">{c.revoked ? <Badge tone="red">Revoked</Badge> : <Badge tone="green">Valid</Badge>}</td>
            <td className="td text-right"><Link to={`/admin/certificates/view/${c.certificateId}`} className="btn-ghost btn-sm" title="View"><Eye className="h-4 w-4" /></Link></td>
          </tr>
        ))}
      </DataTable>
      <Pagination pagination={data?.pagination} onPage={setPage} />
    </DashboardShell>
  );
}
