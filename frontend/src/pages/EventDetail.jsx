import { useCallback, useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import api from '../services/api.js';
import { useAuth } from '../context/AuthContext.jsx';
import { Badge, ErrorBox, Loader, SuccessBox } from '../components/Ui.jsx';
import { errMsg, fmtDate } from '../utils/format.js';

export default function EventDetail() {
  const { id } = useParams();
  const { user } = useAuth();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  const load = useCallback(() => {
    return api
      .get(`/events/${id}`)
      .then((res) => setData(res.data))
      .catch((e) => setError(errMsg(e)))
      .finally(() => setLoading(false));
  }, [id]);

  // Re-load when the logged-in user changes so myRegistration is correct.
  useEffect(() => {
    setLoading(true);
    load();
  }, [load, user?.id]);

  const act = async (fn, okMessage) => {
    setBusy(true);
    setError('');
    setMessage('');
    try {
      await fn();
      setMessage(okMessage);
      await load();
    } catch (e) {
      setError(errMsg(e));
    } finally {
      setBusy(false);
    }
  };

  if (loading) return <Loader />;
  if (!data) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-12">
        <ErrorBox message={error || 'Event not found'} />
        <Link to="/events" className="mt-4 inline-block text-sm text-brand-600 hover:underline">← Back to events</Link>
      </div>
    );
  }

  const { event, myRegistration, canManage } = data;
  const isRegistered = myRegistration?.status === 'REGISTERED';
  const seatsLeft = event.capacity - event.registeredCount;
  const ended = new Date(event.endsAt) < new Date();
  const started = new Date(event.startsAt) < new Date();

  let action;
  if (!user) {
    action = <Link to="/login" state={{ from: `/events/${event.id}` }} className="btn-primary">Log in to register</Link>;
  } else if (user.role !== 'STUDENT') {
    action = <p className="text-sm text-slate-500">Only student accounts can register for events.</p>;
  } else if (event.status === 'CANCELLED') {
    action = <p className="text-sm font-medium text-red-600">This event has been cancelled.</p>;
  } else if (isRegistered) {
    action = (
      <button className="btn-danger" disabled={busy || started} onClick={() => act(() => api.delete(`/registrations/${event.id}`), 'Registration cancelled.')}>
        {started ? 'Event already started' : 'Cancel registration'}
      </button>
    );
  } else if (ended) {
    action = <p className="text-sm text-slate-500">This event has ended.</p>;
  } else if (seatsLeft <= 0) {
    action = <button className="btn-primary" disabled>Event full</button>;
  } else {
    action = (
      <button className="btn-primary" disabled={busy} onClick={() => act(() => api.post(`/registrations/${event.id}`), 'You are registered. See you there!')}>
        {busy ? 'Please wait...' : 'Register now'}
      </button>
    );
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <Link to="/events" className="text-sm text-brand-600 hover:underline">← All events</Link>

      <div className="card mt-4 overflow-hidden !p-0">
        {event.bannerUrl && <img src={event.bannerUrl} alt="" className="h-64 w-full object-cover" />}
        <div className="space-y-4 p-6">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-semibold uppercase tracking-wide text-brand-600">{event.category}</span>
            {event.status !== 'PUBLISHED' && <Badge>{event.status}</Badge>}
            {isRegistered && <Badge tone="green">You are registered</Badge>}
          </div>
          <h1 className="text-3xl font-bold">{event.title}</h1>

          <dl className="grid gap-3 text-sm sm:grid-cols-2">
            <div><dt className="text-slate-400">Starts</dt><dd className="font-medium">{fmtDate(event.startsAt)}</dd></div>
            <div><dt className="text-slate-400">Ends</dt><dd className="font-medium">{fmtDate(event.endsAt)}</dd></div>
            <div><dt className="text-slate-400">Venue</dt><dd className="font-medium">{event.venue}</dd></div>
            <div><dt className="text-slate-400">Organiser</dt><dd className="font-medium">{event.organizer?.name}</dd></div>
            <div><dt className="text-slate-400">Seats</dt><dd className="font-medium">{event.registeredCount} / {event.capacity} taken</dd></div>
          </dl>

          <p className="whitespace-pre-line text-slate-700">{event.description}</p>

          <ErrorBox message={error} />
          <SuccessBox message={message} />

          <div className="flex flex-wrap items-center gap-3 border-t border-slate-100 pt-4">
            {action}
            {canManage && (
              <>
                <Link to={`/organizer/events/${event.id}/edit`} className="btn-outline">Edit event</Link>
                <Link to={`/organizer/events/${event.id}/attendees`} className="btn-outline">Participants</Link>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
