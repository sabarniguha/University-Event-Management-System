import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import api from '../services/api.js';
import { Loader } from '../components/Ui.jsx';
import { errMsg } from '../utils/format.js';

const day = (d) => new Date(d).toLocaleDateString([], { dateStyle: 'long' });

// Public page: /verify and /verify/:code
export default function VerifyCertificate() {
  const { code } = useParams();
  const navigate = useNavigate();
  const [input, setInput] = useState(code || '');
  const [state, setState] = useState({ status: 'idle' });

  useEffect(() => {
    if (!code) {
      setState({ status: 'idle' });
      return;
    }
    setInput(code);
    setState({ status: 'loading' });
    api
      .get(`/attendance/verify/${encodeURIComponent(code)}`)
      .then((res) => setState({ status: 'valid', data: res.data }))
      .catch((e) =>
        setState({ status: e.response?.status === 404 ? 'invalid' : 'error', message: errMsg(e) })
      );
  }, [code]);

  const submit = (e) => {
    e.preventDefault();
    if (input.trim()) navigate(`/verify/${encodeURIComponent(input.trim())}`);
  };

  return (
    <div className="mx-auto max-w-lg px-4 py-12">
      <form onSubmit={submit} className="card space-y-4">
        <h1 className="text-2xl font-bold">Verify a certificate</h1>
        <p className="text-sm text-slate-500">Enter the certificate ID printed on an attendance certificate (e.g. UEMS-1A2B3C4D5E6F).</p>
        <input className="input font-mono" placeholder="UEMS-XXXXXXXXXXXX" value={input} onChange={(e) => setInput(e.target.value)} />
        <button className="btn-primary w-full">Verify</button>
      </form>

      <div className="mt-6" aria-live="polite">
        {state.status === 'loading' && <Loader label="Checking..." />}

        {state.status === 'valid' && (
          <div className="card border-green-300 bg-green-50">
            <p className="font-semibold text-green-700">✓ Genuine certificate</p>
            <dl className="mt-3 space-y-1 text-sm">
              <div><dt className="inline text-slate-500">Student: </dt><dd className="inline font-medium">{state.data.studentName}</dd></div>
              <div><dt className="inline text-slate-500">Event: </dt><dd className="inline font-medium">{state.data.eventTitle}</dd></div>
              <div><dt className="inline text-slate-500">Date: </dt><dd className="inline font-medium">{day(state.data.startsAt)}</dd></div>
              <div><dt className="inline text-slate-500">Venue: </dt><dd className="inline font-medium">{state.data.venue}</dd></div>
              <div><dt className="inline text-slate-500">ID: </dt><dd className="inline font-mono">{state.data.certificateId}</dd></div>
            </dl>
          </div>
        )}

        {state.status === 'invalid' && (
          <div className="card border-red-300 bg-red-50 text-sm text-red-700">
            ✗ No attendance record matches this certificate ID. It may be mistyped or not genuine.
          </div>
        )}
        {state.status === 'error' && (
          <div className="card border-red-300 bg-red-50 text-sm text-red-700">{state.message}</div>
        )}
      </div>
    </div>
  );
}
