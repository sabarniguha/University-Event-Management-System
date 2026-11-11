import { useCallback, useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import api from '../services/api.js';
import { useAuth } from '../context/AuthContext.jsx';
import QrCode from '../components/QrCode.jsx';
import StarRating from '../components/StarRating.jsx';
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
      const res = await fn();
      setMessage(typeof okMessage === 'function' ? okMessage(res) : okMessage);
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

  const { event, rating, myRegistration, canManage } = data;
  const status = myRegistration?.status;
  const isRegistered = status === 'REGISTERED';
  const isWaitlisted = status === 'WAITLISTED';
  const seatsLeft = event.capacity - event.registeredCount;
  const full = seatsLeft <= 0;
  const now = new Date();
  const ended = new Date(event.endsAt) < now;
  const started = new Date(event.startsAt) < now;
  const deadlinePassed = event.registrationDeadline && new Date(event.registrationDeadline) < now;

  const register = () =>
    act(
      () => api.post(`/registrations/${event.id}`),
      (res) =>
        res.data.registration.status === 'WAITLISTED'
          ? `You are on the waitlist (position #${res.data.waitlistPosition}). We will notify you if a seat opens up.`
          : 'You are registered. Your QR pass is below.'
    );

  const cancel = () =>
    act(() => api.delete(`/registrations/${event.id}`), isWaitlisted ? 'You left the waitlist.' : 'Registration cancelled.');

  let action;
  if (!user) {
    action = <Link to="/login/student" state={{ from: `/events/${event.id}` }} className="btn-primary">Log in to register</Link>;
  } else if (user.role !== 'STUDENT') {
    action = <p className="text-sm text-slate-500">Only student accounts can register for events.</p>;
  } else if (event.status === 'CANCELLED') {
    action = <p className="text-sm font-medium text-red-600">This event has been cancelled.</p>;
  } else if (isRegistered || isWaitlisted) {
    action = (
      <button className="btn-danger" disabled={busy || started} onClick={cancel}>
        {started ? 'Event already started' : isWaitlisted ? 'Leave waitlist' : 'Cancel registration'}
      </button>
    );
  } else if (ended) {
    action = <p className="text-sm text-slate-500">This event has ended.</p>;
  } else if (deadlinePassed) {
    action = <p className="text-sm text-slate-500">Registration for this event has closed.</p>;
  } else if (full && !event.waitlistEnabled) {
    action = <button className="btn-primary" disabled>Event full</button>;
  } else {
    action = (
      <button className="btn-primary" disabled={busy} onClick={register}>
        {busy ? 'Please wait...' : full ? 'Join waitlist' : 'Register now'}
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
            {isWaitlisted && <Badge tone="yellow">Waitlist #{myRegistration.waitlistPosition}</Badge>}
          </div>
          <h1 className="text-3xl font-bold">{event.title}</h1>

          {rating.count > 0 && (
            <p className="flex items-center gap-2 text-sm text-slate-600">
              <StarRating value={rating.average} size="text-base" />
              <span>{rating.average} ({rating.count} rating{rating.count === 1 ? '' : 's'})</span>
            </p>
          )}

          <dl className="grid gap-3 text-sm sm:grid-cols-2">
            <div><dt className="text-slate-400">Starts</dt><dd className="font-medium">{fmtDate(event.startsAt)}</dd></div>
            <div><dt className="text-slate-400">Ends</dt><dd className="font-medium">{fmtDate(event.endsAt)}</dd></div>
            <div><dt className="text-slate-400">Venue</dt><dd className="font-medium">{event.venue}</dd></div>
            <div><dt className="text-slate-400">Organiser</dt><dd className="font-medium">{event.organizer?.name}</dd></div>
            <div>
              <dt className="text-slate-400">Seats</dt>
              <dd className="font-medium">
                {event.registeredCount} / {event.capacity} taken
                {event.waitlistedCount > 0 && <span className="text-slate-400"> · {event.waitlistedCount} waiting</span>}
              </dd>
            </div>
            {event.registrationDeadline && (
              <div><dt className="text-slate-400">Register by</dt><dd className="font-medium">{fmtDate(event.registrationDeadline)}</dd></div>
            )}
          </dl>

          <p className="whitespace-pre-line text-slate-700">{event.description}</p>

          <ErrorBox message={error} />
          <SuccessBox message={message} />

          {isRegistered && event.status !== 'CANCELLED' && myRegistration.ticketCode && (
            <div className="flex flex-wrap items-center gap-6 rounded-xl border border-brand-100 bg-brand-50/50 p-4">
              <QrCode value={`UEMS:${myRegistration.ticketCode}`} size={140} />
              <div className="text-sm text-slate-600">
                <p className="font-semibold text-slate-900">Your entry pass</p>
                <p className="mt-1">Show this QR code at the venue. The organiser scans it to mark your attendance.</p>
                <Link to="/student/tickets" className="mt-2 inline-block font-medium text-brand-600 hover:underline">All my tickets</Link>
              </div>
            </div>
          )}

          <div className="flex flex-wrap items-center gap-3 border-t border-slate-100 pt-4">
            {action}
            {canManage && (
              <>
                <Link to={`/organizer/events/${event.id}/edit`} className="btn-outline">Edit event</Link>
                <Link to={`/organizer/events/${event.id}/attendees`} className="btn-outline">Participants</Link>
                <Link to={`/organizer/events/${event.id}/attendance`} className="btn-outline">Attendance</Link>
                <Link to={`/organizer/events/${event.id}/feedback`} className="btn-outline">Feedback</Link>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
