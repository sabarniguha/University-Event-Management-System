import { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import api from '../../services/api.js';
import DashboardShell, { StatCard } from '../../components/DashboardShell.jsx';
import { Badge, EmptyState, ErrorBox, Loader } from '../../components/Ui.jsx';
import { errMsg, fmtDate, pctLabel } from '../../utils/format.js';

const REFRESH_MS = 15000;
const FILTERS = [
  { key: 'all', label: 'All' },
  { key: 'present', label: 'Present' },
  { key: 'absent', label: 'Absent' },
  { key: 'unmarked', label: 'Not marked' },
];

const stateOf = (row) => (row.attendance ? row.attendance.status.toLowerCase() : 'unmarked');

export default function EventAttendance() {
  const { id } = useParams();
  const inputRef = useRef(null);
  const videoRef = useRef(null);
  const lastScan = useRef({ value: '', at: 0 });

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [q, setQ] = useState('');
  const [filter, setFilter] = useState('all');
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState(null);
  const [scanning, setScanning] = useState(false);

  const canScan = typeof window !== 'undefined' && 'BarcodeDetector' in window && Boolean(navigator.mediaDevices);

  const load = useCallback(() => {
    return api
      .get(`/attendance/event/${id}`)
      .then((res) => {
        setData(res.data);
        setError('');
      })
      .catch((e) => setError(errMsg(e)))
      .finally(() => setLoading(false));
  }, [id]);

  // Keep the roster fresh while the organiser works at the door.
  useEffect(() => {
    load();
    const t = setInterval(load, REFRESH_MS);
    return () => clearInterval(t);
  }, [load]);

  const submitCode = useCallback(
    async (value) => {
      const ticketCode = value.trim();
      if (!ticketCode) return;
      setBusy(true);
      try {
        const { data: r } = await api.post('/attendance/checkin', { eventId: Number(id), ticketCode });
        setResult({ kind: r.alreadyCheckedIn ? 'already' : 'ok', name: r.student.name, department: r.student.department });
        setCode('');
        await load();
      } catch (e) {
        setResult({ kind: 'error', message: errMsg(e) });
      } finally {
        setBusy(false);
        inputRef.current?.focus();
      }
    },
    [id, load]
  );

  // Camera scanning with the browser's built-in QR detector (Chrome / Edge / Android).
  useEffect(() => {
    if (!scanning) return undefined;
    let stopped = false;
    let timer;
    let stream;

    (async () => {
      try {
        const detector = new window.BarcodeDetector({ formats: ['qr_code'] });
        stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
        if (stopped) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        videoRef.current.srcObject = stream;
        await videoRef.current.play();

        const tick = async () => {
          if (stopped) return;
          try {
            const found = await detector.detect(videoRef.current);
            const value = found[0]?.rawValue;
            const now = Date.now();
            // Ignore the same code for a few seconds so one scan is not submitted repeatedly.
            if (value && (value !== lastScan.current.value || now - lastScan.current.at > 4000)) {
              lastScan.current = { value, at: now };
              await submitCode(value);
            }
          } catch {
            // a single bad frame is fine
          }
          timer = setTimeout(tick, 400);
        };
        tick();
      } catch {
        setResult({ kind: 'error', message: 'Could not start the camera. Check the browser permission and try again.' });
        setScanning(false);
      }
    })();

    return () => {
      stopped = true;
      clearTimeout(timer);
      if (stream) stream.getTracks().forEach((t) => t.stop());
    };
  }, [scanning, submitCode]);

  const mark = async (registrationId, status) => {
    setError('');
    try {
      await api.post('/attendance', { registrationId, status });
      await load();
    } catch (e) {
      setError(errMsg(e));
    }
  };

  const bulk = async (status) => {
    const word = status === 'PRESENT' ? 'present' : 'absent';
    if (!window.confirm(`Mark every student who is not marked yet as ${word}?`)) return;
    setError('');
    try {
      const { data: r } = await api.post('/attendance/bulk', { eventId: Number(id), status });
      setResult({ kind: 'ok', name: `${r.updated} student${r.updated === 1 ? '' : 's'}`, department: `marked ${word}` });
      await load();
    } catch (e) {
      setError(errMsg(e));
    }
  };

  const exportCsv = async () => {
    try {
      const res = await api.get(`/attendance/event/${id}/export`, { responseType: 'blob' });
      const url = URL.createObjectURL(res.data);
      const a = document.createElement('a');
      a.href = url;
      a.download = `attendance_event_${id}.csv`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch {
      setError('Could not export the attendance report');
    }
  };

  if (loading) return <Loader />;
  if (!data) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-12">
        <ErrorBox message={error || 'Event not found'} />
        <Link to="/organizer/attendance" className="mt-4 inline-block text-sm text-brand-600 hover:underline">← Back to attendance</Link>
      </div>
    );
  }

  const { event, roster, summary, recent } = data;
  const needle = q.trim().toLowerCase();
  const rows = roster.filter(
    (r) =>
      (filter === 'all' || stateOf(r) === filter) &&
      (!needle || r.user.name.toLowerCase().includes(needle) || r.user.email.toLowerCase().includes(needle))
  );

  return (
    <DashboardShell
      title={`Attendance: ${event.title}`}
      subtitle={`${fmtDate(event.startsAt)} · ${event.venue}`}
      actions={
        <>
          <Link to="/organizer/attendance" className="btn-outline">All events</Link>
          <Link to={`/organizer/events/${id}/feedback`} className="btn-outline">Feedback</Link>
          <button className="btn-primary" onClick={exportCsv}>Export CSV</button>
        </>
      }
    >
      <ErrorBox message={error} />

      <div className="grid gap-4 sm:grid-cols-3 lg:grid-cols-6">
        <StatCard label="Registered" value={`${summary.registered} / ${summary.capacity}`} />
        <StatCard label="Present" value={summary.present} />
        <StatCard label="Absent" value={summary.absent} />
        <StatCard label="Not marked" value={summary.unmarked} />
        <StatCard label="Attendance rate" value={pctLabel(summary.rate)} />
        <StatCard label="QR check-ins" value={summary.viaQr} />
      </div>

      <section className="card space-y-4">
        <div>
          <h2 className="font-semibold">Check-in</h2>
          <p className="text-sm text-slate-500">
            Scan a student's QR pass, or type or paste the ticket code (a USB barcode scanner works here too).
          </p>
        </div>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            submitCode(code);
          }}
          className="flex flex-wrap gap-2"
        >
          <input
            ref={inputRef}
            className="input min-w-0 flex-1 font-mono"
            placeholder="Ticket code"
            aria-label="Ticket code"
            autoComplete="off"
            value={code}
            onChange={(e) => setCode(e.target.value)}
          />
          <button className="btn-primary" disabled={busy || !code.trim()}>{busy ? 'Checking...' : 'Check in'}</button>
          {canScan ? (
            <button type="button" className="btn-outline" onClick={() => setScanning((s) => !s)}>
              {scanning ? 'Stop camera' : 'Scan with camera'}
            </button>
          ) : (
            <span className="self-center text-xs text-slate-400">Camera scanning is not supported in this browser.</span>
          )}
        </form>

        {scanning && (
          <video ref={videoRef} className="aspect-video w-full max-w-md rounded-xl bg-black object-cover" muted playsInline />
        )}

        <div aria-live="polite">
          {result?.kind === 'ok' && (
            <div className="rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-800">
              ✓ <strong>{result.name}</strong> {result.department ? `· ${result.department}` : ''} checked in
            </div>
          )}
          {result?.kind === 'already' && (
            <div className="rounded-lg border border-yellow-200 bg-yellow-50 px-4 py-3 text-sm text-yellow-800">
              <strong>{result.name}</strong> was already checked in.
            </div>
          )}
          {result?.kind === 'error' && (
            <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">✗ {result.message}</div>
          )}
        </div>

        {recent.length > 0 && (
          <div>
            <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-slate-400">Latest check-ins</p>
            <ul className="flex flex-wrap gap-2">
              {recent.map((r, i) => (
                <li key={`${r.name}-${i}`} className="rounded-full bg-slate-100 px-3 py-1 text-xs text-slate-700">
                  {r.name} · {new Date(r.checkedInAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} · {r.method}
                </li>
              ))}
            </ul>
          </div>
        )}
      </section>

      <section className="space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          <input
            className="input max-w-xs"
            placeholder="Search students..."
            aria-label="Search students"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
          <div className="flex flex-wrap gap-1">
            {FILTERS.map((f) => (
              <button
                key={f.key}
                onClick={() => setFilter(f.key)}
                className={`btn btn-sm ${filter === f.key ? 'bg-brand-600 text-white' : 'border border-slate-300 bg-white text-slate-700 hover:bg-slate-100'}`}
              >
                {f.label}
              </button>
            ))}
          </div>
          <div className="ml-auto flex gap-2">
            <button className="btn-outline btn-sm" onClick={() => bulk('PRESENT')} disabled={summary.unmarked === 0}>
              Mark remaining present
            </button>
            <button className="btn-outline btn-sm" onClick={() => bulk('ABSENT')} disabled={summary.unmarked === 0}>
              Mark remaining absent
            </button>
          </div>
        </div>

        {rows.length === 0 ? (
          <EmptyState>{roster.length === 0 ? 'No confirmed registrations yet.' : 'No students match this filter.'}</EmptyState>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
            <table className="min-w-full divide-y divide-slate-200">
              <thead className="bg-slate-50">
                <tr>
                  <th className="th">Student</th>
                  <th className="th">Department</th>
                  <th className="th">Status</th>
                  <th className="th">Checked in</th>
                  <th className="th">Mark</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {rows.map((r) => (
                  <tr key={r.id}>
                    <td className="td">
                      <div className="font-medium">{r.user.name}</div>
                      <div className="text-xs text-slate-400">{r.user.email}</div>
                    </td>
                    <td className="td">{r.user.department || '-'}</td>
                    <td className="td">
                      {r.attendance ? <Badge>{r.attendance.status}</Badge> : <span className="text-xs text-slate-400">Not marked</span>}
                    </td>
                    <td className="td">
                      {r.attendance?.checkedInAt ? (
                        <>
                          {new Date(r.attendance.checkedInAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}{' '}
                          <Badge>{r.attendance.method}</Badge>
                        </>
                      ) : '–'}
                    </td>
                    <td className="td">
                      <div className="flex gap-2">
                        <button className="btn-outline btn-sm" onClick={() => mark(r.id, 'PRESENT')}>Present</button>
                        <button className="btn-outline btn-sm" onClick={() => mark(r.id, 'ABSENT')}>Absent</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </DashboardShell>
  );
}
