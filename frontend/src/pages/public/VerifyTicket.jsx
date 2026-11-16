import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { CheckCircle2, XCircle } from 'lucide-react';
import api from '../../services/api.js';
import { Loader } from '../../components/common/Ui.jsx';
import { errMsg, fmtDate } from '../../utils/format.js';

// Public page: /verify-ticket and /verify-ticket/:code
export default function VerifyTicket() {
  const { code } = useParams();
  const navigate = useNavigate();
  const [input, setInput] = useState(code || '');
  const [state, setState] = useState({ status: 'idle' });

  useEffect(() => {
    if (!code) { setState({ status: 'idle' }); return undefined; }
    setInput(code);
    setState({ status: 'loading' });
    api.get(`/tickets/verify/${encodeURIComponent(code)}`)
      .then((res) => setState({ status: res.data.valid ? 'valid' : 'inactive', data: res.data }))
      .catch((e) => setState({ status: e.response?.status === 404 ? 'invalid' : 'error', message: errMsg(e) }));
    return undefined;
  }, [code]);

  const submit = (e) => {
    e.preventDefault();
    if (input.trim()) navigate(`/verify-ticket/${encodeURIComponent(input.trim())}`);
  };

  return (
    <div className="mx-auto max-w-lg px-4 py-12">
      <form onSubmit={submit} className="card space-y-4">
        <h1 className="text-2xl font-bold text-slate-900">Verify a ticket</h1>
        <p className="text-sm text-slate-500">Enter the 32-character code printed under the QR code on a ticket.</p>
        <input className="input font-mono" placeholder="0123456789abcdef0123456789abcdef" value={input} onChange={(e) => setInput(e.target.value)} aria-label="Ticket code" />
        <button className="btn-primary w-full">Verify</button>
      </form>
      <div className="mt-6" aria-live="polite">
        {state.status === 'loading' && <Loader label="Checking..." />}
        {(state.status === 'valid' || state.status === 'inactive') && (
          <div className={`card border-2 ${state.status === 'valid' ? 'border-green-400' : 'border-yellow-400'}`}>
            <div className="flex items-center gap-2 text-lg font-semibold">
              {state.status === 'valid' ? <><CheckCircle2 className="h-6 w-6 text-green-600" /> Valid ticket</> : <><XCircle className="h-6 w-6 text-yellow-600" /> Ticket is not active ({state.data.registrationStatus.toLowerCase()})</>}
            </div>
            <dl className="mt-3 space-y-1 text-sm">
              <div><dt className="inline text-slate-500">Event: </dt><dd className="inline font-medium">{state.data.eventTitle}</dd></div>
              <div><dt className="inline text-slate-500">When: </dt><dd className="inline">{fmtDate(state.data.startsAt)}</dd></div>
              <div><dt className="inline text-slate-500">Where: </dt><dd className="inline">{state.data.venue}</dd></div>
              <div><dt className="inline text-slate-500">Holder: </dt><dd className="inline">{state.data.holder}</dd></div>
              <div><dt className="inline text-slate-500">Checked in: </dt><dd className="inline">{state.data.checkedIn ? 'Yes' : 'Not yet'}</dd></div>
            </dl>
          </div>
        )}
        {state.status === 'invalid' && <div className="card border-2 border-red-300"><div className="flex items-center gap-2 font-semibold text-red-700"><XCircle className="h-6 w-6" /> No ticket found with this code</div></div>}
        {state.status === 'error' && <p className="text-sm text-red-600">{state.message}</p>}
      </div>
    </div>
  );
}
