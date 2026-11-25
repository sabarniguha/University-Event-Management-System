import { useCallback, useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { QRCodeSVG } from 'qrcode.react';
import api from '../../services/api.js';
import DashboardShell from '../../components/DashboardShell.jsx';
import { ErrorBox, Loader } from '../../components/common/Ui.jsx';
import { errMsg } from '../../utils/format.js';

// Organiser / admin: show this on a projector. Students scan it with their phone to check themselves in.
// The code changes every 30 seconds, so a photo of the screen sent to a friend soon stops working.
export default function ScreenCheckin() {
  const { id } = useParams();
  const [data, setData] = useState(null);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    try { const { data: d } = await api.get(`/self-checkin/event/${id}/code`); setData(d); setError(''); } catch (e) { setError(errMsg(e)); }
  }, [id]);

  useEffect(() => { load(); const t = setInterval(load, 10000); return () => clearInterval(t); }, [load]);

  const url = data ? `${window.location.origin}/student/checkin?e=${data.event.id}&c=${data.code}` : '';
  const open = data?.window === 'open';
  return (
    <DashboardShell title="Screen check-in" subtitle="Show this QR on a projector. Registered students scan it with their phone camera and are marked present. It refreshes every 30 seconds."
      actions={<Link to={`/organizer/events/${id}/attendance`} className="btn-outline">Back to attendance</Link>}>
      <ErrorBox message={error} />
      {!data && !error ? <Loader /> : data && (
        <div className="mx-auto max-w-md space-y-4 text-center">
          <h2 className="text-xl font-semibold text-slate-900">{data.event.title}</h2>
          {open ? (
            <div className="card inline-block bg-white p-6"><QRCodeSVG value={url} size={320} level="M" includeMargin /></div>
          ) : (
            <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">{data.window}</div>
          )}
          <p className="text-3xl font-bold text-slate-900">{data.present} <span className="text-base font-normal text-slate-500">of {data.registered} checked in</span></p>
          <p className="text-xs text-slate-500">Students must be signed in and registered. Check-in works only while the event is running. Anyone without a phone can still be marked present from the attendance page.</p>
        </div>
      )}
    </DashboardShell>
  );
}
