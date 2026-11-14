import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, Printer } from 'lucide-react';
import useFetch from '../../hooks/useFetch.js';
import CertificateSheet from '../../components/tickets/CertificateSheet.jsx';
import { ErrorBox, Loader } from '../../components/common/Ui.jsx';

// Shows one certificate. "Download PDF" uses the browser's print dialog (choose "Save as PDF").
export default function CertificateView() {
  const { certificateId } = useParams();
  const { data, loading, error } = useFetch(`/certificates/${certificateId}`);
  if (loading) return <Loader />;
  if (!data) return <ErrorBox message={error || 'Certificate not found'} />;
  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3 print:hidden">
        <Link to={-1} className="btn-ghost"><ArrowLeft className="h-4 w-4" /> Back</Link>
        <div className="flex gap-2">
          <Link to={`/verify/${data.certificate.certificateId}`} className="btn-outline">Verification page</Link>
          <button className="btn-primary" onClick={() => window.print()}><Printer className="h-4 w-4" /> Download / print PDF</button>
        </div>
      </div>
      {data.certificate.revoked && <p className="mb-3 rounded-xl bg-red-100 px-4 py-3 text-sm text-red-700 print:hidden">This certificate has been revoked.</p>}
      <CertificateSheet cert={data.certificate} />
    </div>
  );
}
