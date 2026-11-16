import { useState } from 'react';
import { Camera, CameraOff, CheckCircle2, XCircle } from 'lucide-react';
import api from '../../services/api.js';
import useFetch from '../../hooks/useFetch.js';
import DashboardShell from '../../components/DashboardShell.jsx';
import QrScanner from '../../components/tickets/QrScanner.jsx';
import { ErrorBox, Loader } from '../../components/common/Ui.jsx';
import { errMsg } from '../../utils/format.js';

// Scan student tickets with the camera (or type the ticket ID) and mark them present.
export default function ScanTickets() {
  const { data, loading, error } = useFetch('/events/mine');
  const events = (data?.events || []).filter((e) => e.status === 'PUBLISHED');
  const [eventId, setEventId] = useState('');
  const [camera, setCamera] = useState(false);
  const [camError, setCamError] = useState('');
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState(null);
  const [history, setHistory] = useState([]);

  const selected = eventId || (events[0] ? String(events[0].id) : '');

  const checkIn = async (raw) => {
    const ticketCode = String(raw || '').trim();
    if (!ticketCode || !selected) return;
    setBusy(true);
    try {
      const { data: r } = await api.post('/attendance/checkin', { eventId: Number(selected), ticketCode });
      const entry = { kind: r.alreadyCheckedIn ? 'already' : 'ok', name: r.student.name, department: r.student.department, ticket: ticketCode.replace(/^UEMS:/i, ''), at: new Date() };
      setResult(entry);
      setHistory((h) => [entry, ...h].slice(0, 8));
      setCode('');
    } catch (e) {
      const entry = { kind: 'error', message: errMsg(e), ticket: ticketCode.replace(/^UEMS:/i, ''), at: new Date() };
      setResult(entry);
      setHistory((h) => [entry, ...h].slice(0, 8));
    } finally {
      setBusy(false);
    }
  };

  return (
    <DashboardShell title="Scan tickets" subtitle="Point the camera at a student's QR ticket, or type the ticket ID, to mark them present.">
      <ErrorBox message={error} />
      {loading ? <Loader /> : events.length === 0 ? (
        <p className="card text-sm text-slate-500">You have no published events to check people into yet.</p>
      ) : (
        <div className="grid gap-6 lg:grid-cols-2">
          <section className="card space-y-4">
            <div>
              <label className="label" htmlFor="scan-event">Event</label>
              <select id="scan-event" className="input" value={selected} onChange={(e) => setEventId(e.target.value)}>
                {events.map((e) => <option key={e.id} value={e.id}>{e.title}</option>)}
              </select>
            </div>

            {camera ? (
              <>
                <QrScanner onScan={checkIn} onError={(m) => { setCamError(m); setCamera(false); }} />
                <button className="btn-outline" onClick={() => setCamera(false)}><CameraOff className="h-4 w-4" /> Stop camera</button>
              </>
            ) : (
              <button className="btn-primary w-full" onClick={() => { setCamError(''); setCamera(true); }}><Camera className="h-4 w-4" /> Start camera scan</button>
            )}
            {camError && <p className="text-sm text-red-600" role="alert">{camError}</p>}

            <form onSubmit={(e) => { e.preventDefault(); checkIn(code); }} className="space-y-2">
              <label className="label" htmlFor="ticket-id">Or enter the ticket ID</label>
              <div className="flex gap-2">
                <input id="ticket-id" className="input min-w-0 flex-1 font-mono" placeholder="Ticket ID (32 characters)" autoComplete="off" value={code} onChange={(e) => setCode(e.target.value)} />
                <button className="btn-primary" disabled={busy || !code.trim()}>{busy ? 'Checking...' : 'Check in'}</button>
              </div>
            </form>
          </section>

          <section className="card space-y-4" aria-live="polite">
            <h2 className="font-semibold text-slate-900">Result</h2>
            {!result && <p className="text-sm text-slate-500">Scan a ticket to see the result here.</p>}
            {result?.kind === 'ok' && <div className="rounded-xl border border-green-200 bg-green-50 p-4 text-green-800"><p className="flex items-center gap-2 font-semibold"><CheckCircle2 className="h-5 w-5" /> {result.name} checked in</p>{result.department && <p className="text-sm">{result.department}</p>}<p className="mt-1 break-all font-mono text-xs">Ticket {result.ticket}</p></div>}
            {result?.kind === 'already' && <div className="rounded-xl border border-yellow-200 bg-yellow-50 p-4 text-yellow-800"><p className="font-semibold">{result.name} was already checked in</p><p className="mt-1 break-all font-mono text-xs">Ticket {result.ticket}</p></div>}
            {result?.kind === 'error' && <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-red-700"><p className="flex items-center gap-2 font-semibold"><XCircle className="h-5 w-5" /> {result.message}</p><p className="mt-1 break-all font-mono text-xs">Ticket {result.ticket}</p></div>}
            {history.length > 0 && (
              <div>
                <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-slate-400">This session</p>
                <ul className="space-y-1 text-sm">
                  {history.map((h, i) => (
                    <li key={i} className="flex justify-between gap-2"><span>{h.kind === 'error' ? 'Invalid ticket' : h.name}</span><span className="text-slate-400">{h.at.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} · {h.kind === 'ok' ? 'in' : h.kind === 'already' ? 'repeat' : 'rejected'}</span></li>
                  ))}
                </ul>
              </div>
            )}
          </section>
        </div>
      )}
    </DashboardShell>
  );
}
