import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import api from '../../services/api.js';
import QrCode from '../../components/QrCode.jsx';
import { ErrorBox, Loader } from '../../components/Ui.jsx';
import { errMsg } from '../../utils/format.js';

const day = (d) => new Date(d).toLocaleDateString([], { dateStyle: 'long' });

export default function Certificate() {
  const { registrationId } = useParams();
  const [cert, setCert] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    api
      .get(`/attendance/certificate/${registrationId}`)
      .then((res) => setCert(res.data.certificate))
      .catch((e) => setError(errMsg(e)));
  }, [registrationId]);

  if (error) {
    return (
      <div className="mx-auto max-w-xl px-4 py-12 space-y-4">
        <ErrorBox message={error} />
        <Link to="/student/attendance" className="text-sm text-brand-600 hover:underline">← Back to my attendance</Link>
      </div>
    );
  }
  if (!cert) return <Loader />;

  const verifyUrl = `${window.location.origin}/verify/${cert.certificateId}`;

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <div className="mb-4 flex items-center justify-between print:hidden">
        <Link to="/student/attendance" className="text-sm text-brand-600 hover:underline">← Back to my attendance</Link>
        <button className="btn-primary" onClick={() => window.print()}>Print / Save as PDF</button>
      </div>

      <div className="border-[10px] border-double border-brand-600 bg-white p-10 text-center shadow-sm print:shadow-none">
        <p className="text-sm font-semibold uppercase tracking-[0.3em] text-brand-600">Certificate of Attendance</p>
        <p className="mt-8 text-sm text-slate-500">This is to certify that</p>
        <h1 className="mt-2 text-4xl font-bold text-slate-900">{cert.studentName}</h1>
        {cert.department && <p className="mt-1 text-sm text-slate-500">{cert.department}</p>}

        <p className="mt-6 text-sm text-slate-500">attended</p>
        <h2 className="mt-2 text-2xl font-semibold text-brand-700">{cert.eventTitle}</h2>
        <p className="mt-2 text-sm text-slate-600">
          held on {day(cert.startsAt)} at {cert.venue}
        </p>
        <p className="mt-1 text-sm text-slate-500">organised by {cert.organizerName}</p>

        <div className="mt-10 flex items-end justify-between gap-6 text-left">
          <div>
            <p className="text-xs text-slate-400">Issued on</p>
            <p className="text-sm font-medium">{day(cert.issuedAt)}</p>
            <p className="mt-3 text-xs text-slate-400">Certificate ID</p>
            <p className="font-mono text-sm font-medium">{cert.certificateId}</p>
          </div>
          <div className="text-center">
            <QrCode value={verifyUrl} size={92} />
            <p className="mt-1 text-[11px] text-slate-400">Scan to verify</p>
          </div>
        </div>
      </div>
    </div>
  );
}
