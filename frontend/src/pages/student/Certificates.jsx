import { Link } from 'react-router-dom';
import { Award } from 'lucide-react';
import { Download } from 'lucide-react';
import { downloadFile } from '../../services/api.js';
import { useToast } from '../../context/ToastContext.jsx';
import { errMsg } from '../../utils/format.js';
import useFetch from '../../hooks/useFetch.js';
import DashboardShell from '../../components/DashboardShell.jsx';
import { EmptyState, ErrorBox, Skeleton } from '../../components/common/Ui.jsx';
import { fmtDay } from '../../utils/format.js';

export default function Certificates() {
  const toast = useToast();
  const { data, loading, error } = useFetch('/certificates/my');
  const list = data?.certificates || [];
  return (
    <DashboardShell title="My certificates" subtitle="Issued by organisers after events you attended. Each one can be verified online.">
      <ErrorBox message={error} />
      {loading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-36" />)}</div>
      ) : list.length === 0 ? (
        <EmptyState icon={Award} title="No certificates yet">Attend an event and, once the organiser issues certificates, they will appear here.</EmptyState>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {list.map((c) => (
            <div key={c.certificateId} className="card flex flex-col">
              <Award className="mb-2 h-7 w-7 text-amber-500" />
              <h2 className="font-semibold text-slate-900">{c.eventTitle}</h2>
              <p className="text-sm text-slate-500">{c.title}</p>
              <p className="mt-1 text-xs text-slate-400">Issued {fmtDay(c.issuedAt)} &middot; <span className="font-mono">{c.certificateId}</span></p>
              <div className="mt-4 flex gap-2">
                <Link to={`/student/certificates/${c.certificateId}`} className="btn-outline btn-sm">View</Link>
                <button className="btn-primary btn-sm" onClick={() => downloadFile(`/certificates/${c.certificateId}/pdf`, `certificate-${c.certificateId}.pdf`).catch((e) => toast.error(errMsg(e)))}><Download className="h-3.5 w-3.5" /> PDF</button>
                <Link to={`/verify/${c.certificateId}`} className="btn-outline btn-sm">Verify</Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </DashboardShell>
  );
}
