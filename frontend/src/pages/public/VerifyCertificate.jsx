import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { CheckCircle2, XCircle } from 'lucide-react';
import api from '../../services/api.js';
import { Loader } from '../../components/common/Ui.jsx';
import { errMsg, fmtDay } from '../../utils/format.js';

// Public page: /verify and /verify/:code
export default function VerifyCertificate() {
  const { code } = useParams();
  const navigate = useNavigate();
  const [input, setInput] = useState(code || '');
  const [state, setState] = useState({ status: 'idle' });

  useEffect(() => {
    if (!code) return setState({ status: 'idle' });
    setInput(code);
    setState({ status: 'loading' });
    api.get(`/certificates/verify/${encodeURIComponent(code)}`)
      .then((res) => setState({ status: res.data.valid ? 'valid' : 'revoked', data: res.data }))
      .catch((e) => setState({ status: e.response?.status === 404 ? 'invalid' : 'error', message: errMsg(e) }));
    return undefined;
  }, [code]);

  const submit = (e) => {
    e.preventDefault();
    if (input.trim()) navigate(`/verify/${encodeURIComponent(input.trim())}`);
  };

  return (
    <div className="mx-auto max-w-lg px-4 py-12">
      <form onSubmit={submit} className="card space-y-4">
        <h1 className="text-2xl font-bold text-slate-900">Verify a certificate</h1>
        <p className="text-sm text-slate-500">Enter the certificate ID printed on a UniEvents certificate (for example UNI-1A2B3C4D5E6F).</p>
        <input className="input font-mono" placeholder="UNI-XXXXXXXXXXXX" value={input} onChange={(e) => setInput(e.target.value)} aria-label="Certificate ID" />
        <button className="btn-primary w-full">Verify</button>
      </form>
      <div className="mt-6" aria-live="polite">
        {state.status === 'loading' && <Loader label="Checking..." />}
        {(state.status === 'valid' || state.status === 'revoked') && (
          <div className={`card ${state.status === 'valid' ? 'border-green-300' : 'border-red-300'}`}>
            <p className={`flex items-center gap-2 font-semibold ${state.status === 'valid' ? 'text-green-700' : 'text-red-700'}`}>
              {state.status === 'valid' ? <><CheckCircle2 className="h-5 w-5" /> Genuine certificate</> : <><XCircle className="h-5 w-5" /> This certificate was revoked</>}
            </p>
            <dl className="mt-3 space-y-1 text-sm">
              <div><dt className="inline text-slate-500">Awarded to: </dt><dd className="inline font-medium text-slate-900">{state.data.studentName}</dd></div>
              <div><dt className="inline text-slate-500">Event: </dt><dd className="inline font-medium text-slate-900">{state.data.eventTitle}</dd></div>
              <div><dt className="inline text-slate-500">Date: </dt><dd className="inline font-medium text-slate-900">{fmtDay(state.data.startsAt)}</dd></div>
              <div><dt className="inline text-slate-500">Organiser: </dt><dd className="inline font-medium text-slate-900">{state.data.organizerName}</dd></div>
              <div><dt className="inline text-slate-500">Issued: </dt><dd className="inline font-medium text-slate-900">{fmtDay(state.data.issuedAt)}</dd></div>
              <div><dt className="inline text-slate-500">ID: </dt><dd className="inline font-mono text-slate-900">{state.data.certificateId}</dd></div>
            </dl>
          </div>
        )}
        {state.status === 'invalid' && <div className="card border-red-300 text-sm text-red-700">No certificate matches this ID. It may be mistyped or not genuine.</div>}
        {state.status === 'error' && <div className="card border-red-300 text-sm text-red-700">{state.message}</div>}
      </div>
    </div>
  );
}
