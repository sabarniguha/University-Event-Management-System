import { useCallback, useEffect, useState } from 'react';
import { Camera, CameraOff, CheckCircle2, XCircle } from 'lucide-react';
import api from '../../services/api.js';
import useFetch from '../../hooks/useFetch.js';
import { useToast } from '../../context/ToastContext.jsx';
import DashboardShell from '../../components/DashboardShell.jsx';
import QrScanner from '../../components/tickets/QrScanner.jsx';
import { EmptyState, ErrorBox, Loader } from '../../components/common/Ui.jsx';
import { errMsg, fmtDate } from '../../utils/format.js';

// Event helpers: scan tickets and mark attendance for the events they were added to.
export default function StaffDuty() {
  const toast = useToast();
  const { data, loading, error } = useFetch('/staff/mine');
  const [eventId, setEventId] = useState(null);
  const [view, setView] = useState(null);
  const [camera, setCamera] = useState(false);
  const [code, setCode] = useState('');
  const [result, setResult] = useState(null);
  const events = data?.events || [];

  const load = useCallback(async () => {
    if (!eventId) return;
    try { const { data: r } = await api.get(`/staff/event/${eventId}/roster`); setView(r); } catch (e) { toast.error(errMsg(e)); }
  }, [eventId, toast]);
  useEffect(() => { load(); }, [load]);
  useEffect(() => { if (events.length === 1 && !eventId) setEventId(events[0].id); }, [events, eventId]);

  const scan = useCallback(async (ticketCode) => {
    try {
      const { data: r } = await api.post(`/staff/event/${eventId}/check-in`, { ticketCode });
      setResult({ ok: true, text: `${r.student.name}${r.alreadyCheckedIn ? ' was already checked in' : ' is checked in'}` });
      setCode(''); load();
    } catch (e) { setResult({ ok: false, text: errMsg(e) }); }
  }, [eventId, load]);

  const mark = async (registrationId, status) => {
    try { await api.post(`/staff/event/${eventId}/mark`, { registrationId, status }); load(); } catch (e) { toast.error(errMsg(e)); }
  };

  if (loading) return <Loader />;
  const open = view?.window === 'open';
  return (
    <DashboardShell title="Event staff duty" subtitle="Events you were asked to help with. Scanning and marking work only while the event is running.">
      <ErrorBox message={error} />
      {events.length === 0 ? <EmptyState icon={Camera} title="No duties yet">When an organiser adds you as event staff, the event appears here.</EmptyState> : (
        <>
          <select className="input max-w-md" value={eventId || ''} onChange={(e) => { setEventId(Number(e.target.value) || null); setView(null); setResult(null); }} aria-label="Event">
            <option value="">Choose an event</option>
            {events.map((e) => <option key={e.id} value={e.id}>{e.title} ({fmtDate(e.startsAt)})</option>)}
          </select>
          {view && (
            <div className="grid gap-4 lg:grid-cols-2">
              <div className="card space-y-3">
                <p className="text-sm text-slate-600">{open ? 'The event is running. You can check people in.' : view.window === 'before' ? 'This event has not started yet.' : 'This event has ended. Attendance is locked.'}</p>
                <p className="text-2xl font-semibold">{view.present} <span className="text-sm font-normal text-slate-500">of {view.total} checked in</span></p>
                {open && (
                  <>
                    <form className="flex gap-2" onSubmit={(e) => { e.preventDefault(); if (code.trim()) scan(code.trim()); }}>
                      <input className="input flex-1" placeholder="Type or paste the ticket ID" aria-label="Ticket ID" value={code} onChange={(e) => setCode(e.target.value)} />
                      <button className="btn-primary" disabled={!code.trim()}>Check in</button>
                    </form>
                    {camera ? (<><QrScanner onScan={scan} onError={(m) => { setResult({ ok: false, text: m }); setCamera(false); }} /><button className="btn-outline" onClick={() => setCamera(false)}><CameraOff className="h-4 w-4" /> Stop camera</button></>)
                      : <button className="btn-outline w-full" onClick={() => setCamera(true)}><Camera className="h-4 w-4" /> Start camera scan</button>}
                  </>
                )}
                {result && <p className={`flex items-center gap-2 text-sm font-medium ${result.ok ? 'text-green-700' : 'text-red-700'}`}>{result.ok ? <CheckCircle2 className="h-4 w-4" /> : <XCircle className="h-4 w-4" />}{result.text}</p>}
              </div>
              <div className="card max-h-[32rem] overflow-y-auto">
                <h2 className="mb-2 font-semibold text-slate-900">Registered students</h2>
                <ul className="divide-y divide-slate-100">
                  {view.roster.map((r) => (
                    <li key={r.id} className="flex items-center justify-between gap-2 py-1.5 text-sm">
                      <span>{r.name}<span className="ml-2 text-xs text-slate-400">{r.status === 'PRESENT' ? 'Present' : r.status === 'ABSENT' ? 'Absent' : ''}</span></span>
                      <span className="flex gap-1"><button className="btn-outline btn-sm" disabled={!open} onClick={() => mark(r.id, 'PRESENT')}>Present</button><button className="btn-outline btn-sm" disabled={!open} onClick={() => mark(r.id, 'ABSENT')}>Absent</button></span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          )}
        </>
      )}
    </DashboardShell>
  );
}
