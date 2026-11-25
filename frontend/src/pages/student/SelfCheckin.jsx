import { useEffect, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { CheckCircle2, XCircle } from 'lucide-react';
import api from '../../services/api.js';
import DashboardShell from '../../components/DashboardShell.jsx';
import { Loader } from '../../components/common/Ui.jsx';
import { errMsg } from '../../utils/format.js';

// Opened when a student scans the organiser's screen QR with their phone camera.
export default function SelfCheckin() {
  const [params] = useSearchParams();
  const [state, setState] = useState({ status: 'working' });
  const done = useRef(false);

  useEffect(() => {
    if (done.current) return;
    done.current = true;
    const eventId = params.get('e'); const code = params.get('c');
    if (!eventId || !code) { setState({ status: 'error', message: 'This is not a valid check-in link. Scan the QR on the screen again.' }); return; }
    api.post('/self-checkin', { eventId, code })
      .then(({ data }) => setState({ status: 'ok', ...data }))
      .catch((e) => setState({ status: 'error', message: errMsg(e) }));
  }, [params]);

  return (
    <DashboardShell title="Event check-in" subtitle="">
      {state.status === 'working' && <Loader />}
      {state.status === 'ok' && (
        <div className="card mx-auto max-w-md space-y-2 text-center">
          <CheckCircle2 className="mx-auto h-12 w-12 text-green-600" />
          <h2 className="text-lg font-semibold text-slate-900">{state.alreadyCheckedIn ? 'You were already checked in' : 'You are checked in'}</h2>
          <p className="text-sm text-slate-600">{state.event.title}</p>
          <Link to="/student/attendance" className="btn-primary mt-2 inline-flex">See my attendance</Link>
        </div>
      )}
      {state.status === 'error' && (
        <div className="card mx-auto max-w-md space-y-2 text-center">
          <XCircle className="mx-auto h-12 w-12 text-red-600" />
          <h2 className="text-lg font-semibold text-slate-900">Could not check you in</h2>
          <p className="text-sm text-slate-600">{state.message}</p>
          <Link to="/student/tickets" className="btn-outline mt-2 inline-flex">My tickets</Link>
        </div>
      )}
    </DashboardShell>
  );
}
