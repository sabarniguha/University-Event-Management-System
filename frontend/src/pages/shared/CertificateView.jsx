import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, Download, Printer } from 'lucide-react';
import { downloadFile } from '../../services/api.js';
import { useToast } from '../../context/ToastContext.jsx';
import { errMsg } from '../../utils/format.js';
import useFetch from '../../hooks/useFetch.js';
import CertificateSheet from '../../components/tickets/CertificateSheet.jsx';
import { ErrorBox, Loader } from '../../components/common/Ui.jsx';

// Shows one certificate. "Download PDF" fetches a server-generated PDF; "Print" uses the browser.
export default function CertificateView() {
  const { certificateId } = useParams();
  const toast = useToast();
  const { data, loading, error } = useFetch(`/certificates/${certificateId}`);
  if (loading) return <Loader />;
  if (!data) return <ErrorBox message={error || 'Certificate not found'} />;
  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3 print:hidden">
        <Link to={-1} className="btn-ghost"><ArrowLeft className="h-4 w-4" /> Back</Link>
        <div className="flex gap-2">
          <Link to={`/verify/${data.certificate.certificateId}`} className="btn-outline">Verification page</Link>
          <button className="btn-outline" onClick={() => window.print()}><Printer className="h-4 w-4" /> Print</button>
          {!data.certificate.revoked && (
            <button className="btn-primary" onClick={() => downloadFile(`/certificates/${certificateId}/pdf`, `certificate-${certificateId}.pdf`).catch((e) => toast.error(errMsg(e)))}><Download className="h-4 w-4" /> Download PDF</button>
          )}
        </div>
      </div>
      {data.certificate.revoked && <p className="mb-3 rounded-xl bg-red-100 px-4 py-3 text-sm text-red-700 print:hidden">This certificate has been revoked.</p>}
      <CertificateSheet cert={data.certificate} />
    </div>
  );
}
