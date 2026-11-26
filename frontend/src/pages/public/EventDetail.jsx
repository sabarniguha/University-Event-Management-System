import { useEffect, useState } from 'react';
import { Link, useLocation, useParams } from 'react-router-dom';
import { Calendar, Clock, Copy, ExternalLink, Info, MapPin, MessageCircle, Settings2, Ticket, Users, Video, Wallet } from 'lucide-react';
import api, { API_URL, mediaUrl } from '../../services/api.js';
import { useAuth } from '../../context/AuthContext.jsx';
import PromoBox from '../../components/events/PromoBox.jsx';
import FollowButton from '../../components/events/FollowButton.jsx';
import { useToast } from '../../context/ToastContext.jsx';
import useFetch from '../../hooks/useFetch.js';
import QrCode from '../../components/tickets/QrCode.jsx';
import StarRating from '../../components/StarRating.jsx';
import EventCard, { gradientFor } from '../../components/events/EventCard.jsx';
import TeamPanel from '../../components/events/TeamPanel.jsx';
import SurveyPanel from '../../components/events/SurveyPanel.jsx';
import GalleryStrip from '../../components/events/GalleryStrip.jsx';
import { DeadlineBox } from '../../components/events/Deadline.jsx';
import { Badge, ConfirmDialog, ErrorBox, Skeleton } from '../../components/common/Ui.jsx';
import { errMsg, fmtDate, money, MODE_LABEL } from '../../utils/format.js';

// Loads Razorpay's checkout script once, only when a student actually pays.
const loadCheckout = () =>
  new Promise((resolve, reject) => {
    if (window.Razorpay) return resolve();
    const el = document.createElement('script');
    el.src = 'https://checkout.razorpay.com/v1/checkout.js';
    el.onload = resolve;
    el.onerror = () => reject(new Error('Could not load the payment window. Check your connection.'));
    document.body.appendChild(el);
  });

const Block = ({ title, children }) => (
  <section className="card">
    <h2 className="mb-3 text-lg font-semibold text-slate-900">{title}</h2>
    {children}
  </section>
);

export default function EventDetail() {
  const { id } = useParams();
  const { user } = useAuth();
  const toast = useToast();
  const location = useLocation();
  const { data, loading, error, reload } = useFetch(`/events/${id}`, { u: user?.id || 0 });
  const [busy, setBusy] = useState(false);
  const [promo, setPromo] = useState('');
  const [confirmCancel, setConfirmCancel] = useState(false);
  const [payEnabled, setPayEnabled] = useState(false);
  useEffect(() => {
    api.get('/payments/config').then((r) => setPayEnabled(Boolean(r.data.enabled))).catch(() => {});
  }, []);

  if (loading && !data) {
    return (
      <div className="mx-auto max-w-5xl space-y-4 px-4 py-8">
        <Skeleton className="h-64 w-full" />
        <Skeleton className="h-8 w-2/3" />
        <Skeleton className="h-32 w-full" />
      </div>
    );
  }
  if (!data) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-12">
        <ErrorBox message={error || 'Event not found'} />
        <Link to="/events" className="mt-4 inline-block text-sm text-brand-600 hover:underline">&larr; Back to events</Link>
      </div>
    );
  }

  const { event, rating, myRegistration, eligibility, related, canManage } = data;
  const status = myRegistration?.status;
  const seatsLeft = event.capacity - event.registeredCount;
  const full = seatsLeft <= 0;
  const now = new Date();
  const ended = new Date(event.endsAt) < now;
  const deadlinePassed = event.registrationDeadline && new Date(event.registrationDeadline) < now;
  const published = event.status === 'PUBLISHED';
  const fillPct = Math.min(100, Math.round((event.registeredCount / event.capacity) * 100));

  const act = async (fn, okMessage) => {
    setBusy(true);
    try {
      const res = await fn();
      toast.success(typeof okMessage === 'function' ? okMessage(res) : okMessage);
      await reload();
    } catch (e) {
      toast.error(errMsg(e));
    } finally {
      setBusy(false);
      setConfirmCancel(false);
    }
  };

  const pay = async () => {
    setBusy(true);
    try {
      const { data: order } = await api.post(`/payments/${event.id}/order`, { code: promo.trim() || undefined });
      await loadCheckout();
      await new Promise((resolve, reject) => {
        const rz = new window.Razorpay({
          key: order.keyId,
          order_id: order.orderId,
          amount: order.amount,
          currency: order.currency,
          name: 'UniEvents',
          description: order.eventTitle,
          prefill: { name: user?.name, email: user?.email, contact: user?.phone || undefined },
          theme: { color: '#4f46e5' },
          // UPI first (QR code, GPay, PhonePe, Paytm), then every other method enabled on the Razorpay account.
          config: { display: { blocks: { upi: { name: 'Pay with UPI (QR, GPay, PhonePe, Paytm)', instruments: [{ method: 'upi' }] }, other: { name: 'Cards, netbanking, wallets', instruments: [{ method: 'card' }, { method: 'netbanking' }, { method: 'wallet' }] } }, sequence: ['block.upi', 'block.other'], preferences: { show_default_blocks: true } } },
          handler: async (r) => {
            try {
              await api.post('/payments/verify', { orderId: r.razorpay_order_id, paymentId: r.razorpay_payment_id, signature: r.razorpay_signature });
              toast.success('Payment received. You are registered!');
              resolve();
            } catch (e) { reject(e); }
          },
          modal: { ondismiss: () => resolve() },
        });
        rz.on('payment.failed', (f) => reject(new Error(f?.error?.description || 'Payment failed')));
        rz.open();
      });
      await reload();
    } catch (e) {
      toast.error(errMsg(e));
      reload();
    } finally {
      setBusy(false);
    }
  };

  const register = () =>
    act(
      () => api.post(`/registrations/${event.id}`),
      (res) =>
        res.data.pending
          ? 'Request sent. The organiser will review it.'
          : res.data.waitlisted
            ? `You are on the waitlist (position #${res.data.waitlistPosition}).`
            : 'You are registered! Your QR ticket is ready.'
    );

  const copyLink = () => navigator.clipboard?.writeText(window.location.href).then(() => toast.success('Link copied'), () => toast.error('Could not copy the link'));

  const action = () => {
    if (!published) return <p className="text-sm text-slate-500">This event is not open for registration.</p>;
    if (!user) {
      return <Link to="/login/student" state={{ from: location.pathname }} className="btn-primary w-full">Log in to register</Link>;
    }
    if (user.role !== 'STUDENT') {
      return <p className="flex items-start gap-2 text-sm text-slate-500"><Info className="mt-0.5 h-4 w-4 shrink-0" /> Only student accounts can register for events.</p>;
    }
    if (status === 'REGISTERED') {
      return (
        <div className="space-y-3 text-center">
          <Badge>REGISTERED</Badge>
          <QrCode value={`UEMS:${myRegistration.ticketCode}`} size={150} label="Show this at the venue" />
          {event.onlineUrl && event.onlineUrl !== 'hidden' && (
            <a href={event.onlineUrl} target="_blank" rel="noopener noreferrer" className="btn-outline w-full"><Video className="h-4 w-4" /> Join online</a>
          )}
          <Link to="/student/tickets" className="btn-outline w-full"><Ticket className="h-4 w-4" /> All my tickets</Link>
          {!ended && new Date(event.startsAt) > now && <button className="btn-ghost w-full text-red-600" onClick={() => setConfirmCancel(true)}>Cancel registration</button>}
        </div>
      );
    }
    if (status === 'WAITLISTED') {
      return (
        <div className="space-y-3 text-center">
          <Badge>WAITLISTED</Badge>
          <p className="text-sm text-slate-600">You are #{myRegistration.waitlistPosition} on the waitlist. We will notify you if a seat opens.</p>
          <button className="btn-outline w-full" onClick={() => setConfirmCancel(true)}>Leave waitlist</button>
        </div>
      );
    }
    if (status === 'AWAITING_PAYMENT') {
      return (
        <div className="space-y-3 text-center">
          <Badge>APPROVED: PAYMENT DUE</Badge>
          <p className="text-sm text-slate-600">The organiser approved your request. Pay {money(event.fee)} to confirm your seat and get your QR ticket.</p>
          <PromoBox eventId={event.id} code={promo} onCode={setPromo} />
          <button className="btn-primary w-full" disabled={busy} onClick={pay}>Pay now ({money(event.fee)})</button>
          <p className="text-xs text-slate-500">UPI (scan the QR code, Google Pay, PhonePe, Paytm), card or netbanking.</p>
          <button className="btn-ghost w-full text-red-600" onClick={() => setConfirmCancel(true)}>Withdraw request</button>
        </div>
      );
    }
    if (status === 'PENDING') {
      return (
        <div className="space-y-3 text-center">
          <Badge>PENDING</Badge>
          <p className="text-sm text-slate-600">Waiting for the organiser to approve your registration.{payEnabled && event.fee > 0 ? ` After approval you pay ${money(event.fee)} here to confirm your seat.` : ''}</p>
          <button className="btn-outline w-full" onClick={() => setConfirmCancel(true)}>Withdraw request</button>
        </div>
      );
    }
    if (status === 'REJECTED') return <p className="text-sm text-red-600">The organiser declined your registration.{myRegistration.decisionNote ? ` Note: ${myRegistration.decisionNote}` : ''}</p>;
    if (ended) return <p className="text-sm text-slate-500">This event has ended.</p>;
    if (deadlinePassed) return <p className="text-sm text-slate-500">Registration has closed.</p>;
    if (!eligibility.eligible) return <p className="text-sm text-red-600">{eligibility.reason} Update your department in your profile if this is wrong.</p>;
    if (full && !event.waitlistEnabled && !event.requiresRegistrationApproval) return <p className="text-sm font-medium text-red-600">This event is full.</p>;
    const online = payEnabled && event.fee > 0 && !event.requiresRegistrationApproval;
    return (
      <div className="space-y-2">
        {online && !full && <PromoBox eventId={event.id} code={promo} onCode={setPromo} />}
        <button className="btn-primary w-full" disabled={busy} onClick={online ? pay : register}>
          {event.requiresRegistrationApproval ? 'Request to join' : full ? 'Join waitlist' : event.fee > 0 ? `${online ? 'Pay' : 'Register'} (${money(event.fee)})` : 'Register for free'}
        </button>
        {online && <p className="text-center text-xs text-slate-500">Pay securely with UPI (scan the QR code, Google Pay, PhonePe, Paytm), card or netbanking.</p>}
        {event.fee > 0 && !online && (
          <p className="text-center text-xs text-slate-500">
            {event.requiresRegistrationApproval ? (payEnabled ? `The organiser approves your request first. After approval you pay ${money(event.fee)} online here.` : 'The organiser approves your request first and collects the fee in person.') : 'Online payment is not switched on for this site yet, so the organiser collects the fee in person.'}
          </p>
        )}
      </div>
    );
  };

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
      {!published && canManage && (
        <div className="mb-4 flex flex-wrap items-center gap-3 rounded-xl border border-yellow-200 bg-yellow-50 px-4 py-3 text-sm text-yellow-800">
          <Badge>{event.status}</Badge>
          {event.status === 'REJECTED' ? `Not approved: ${event.rejectionReason}` : 'Only you and admins can see this event until it is published.'}
        </div>
      )}

      <div className="overflow-hidden rounded-3xl">
        {event.bannerUrl ? (
          <img src={mediaUrl(event.bannerUrl)} alt="" className="h-56 w-full object-cover sm:h-72" />
        ) : (
          <div className={`flex h-56 items-center justify-center bg-gradient-to-br ${gradientFor(event)} text-7xl font-bold text-white/70 sm:h-72`}>{event.title.charAt(0)}</div>
        )}
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_340px]">
        <div className="space-y-6">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <Link to={`/events?category=${encodeURIComponent(event.category)}`} className="text-xs font-semibold uppercase tracking-wide text-brand-600">{event.category}</Link>
              <Badge>{event.mode}</Badge>
              {event.eventType && <Badge tone="gray">{event.eventType}</Badge>}
              {event.status === 'CANCELLED' && <Badge>CANCELLED</Badge>}
            </div>
            <h1 className="mt-2 text-3xl font-bold tracking-tight text-slate-900">{event.title}</h1>
            <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-slate-500">
              <span>Organised by {event.organizer.name}</span>
              <FollowButton organizerId={event.organizer.id} />
              {rating.count > 0 && <span className="flex items-center gap-1"><StarRating value={rating.average} size="text-base" /> {rating.average} ({rating.count})</span>}
            </div>
          </div>

          <Block title="About this event"><p className="whitespace-pre-line text-slate-600">{event.description}</p></Block>

          {event.agenda.length > 0 && (
            <Block title="Agenda">
              <ol className="space-y-4 border-l-2 border-brand-200 pl-5">
                {event.agenda.map((a, i) => (
                  <li key={i} className="relative">
                    <span className="absolute -left-[27px] top-1.5 h-2.5 w-2.5 rounded-full bg-brand-600" />
                    {a.time && <p className="text-xs font-semibold text-brand-600">{a.time}</p>}
                    <p className="font-medium text-slate-900">{a.title}</p>
                    {a.description && <p className="text-sm text-slate-500">{a.description}</p>}
                  </li>
                ))}
              </ol>
            </Block>
          )}

          {event.speakers.length > 0 && (
            <Block title="Speakers">
              <ul className="grid gap-4 sm:grid-cols-2">
                {event.speakers.map((s, i) => (
                  <li key={i} className="flex gap-3">
                    {s.photoUrl ? <img src={mediaUrl(s.photoUrl)} alt="" className="h-12 w-12 rounded-full object-cover" /> : <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-brand-100 font-semibold text-brand-700">{s.name[0]}</span>}
                    <div><p className="font-medium text-slate-900">{s.name}</p>{s.title && <p className="text-sm text-slate-500">{s.title}</p>}{s.bio && <p className="mt-1 text-sm text-slate-500">{s.bio}</p>}</div>
                  </li>
                ))}
              </ul>
            </Block>
          )}

          {event.team.length > 0 && (
            <Block title="Organising team">
              <ul className="grid gap-2 sm:grid-cols-2">{event.team.map((m, i) => <li key={i} className="text-sm"><span className="font-medium text-slate-900">{m.name}</span>{m.role && <span className="text-slate-500"> &middot; {m.role}</span>}</li>)}</ul>
            </Block>
          )}

          {(event.eligibility || event.requirements || event.department) && (
            <Block title="Eligibility and requirements">
              <dl className="space-y-3 text-sm">
                {event.department && <div><dt className="font-medium text-slate-900">Department</dt><dd className="text-slate-600">Open to {event.department} students</dd></div>}
                {event.eligibility && <div><dt className="font-medium text-slate-900">Who can join</dt><dd className="whitespace-pre-line text-slate-600">{event.eligibility}</dd></div>}
                {event.requirements && <div><dt className="font-medium text-slate-900">What to bring</dt><dd className="whitespace-pre-line text-slate-600">{event.requirements}</dd></div>}
              </dl>
            </Block>
          )}

          {event.faqs.length > 0 && (
            <Block title="FAQs">
              <div className="space-y-3">{event.faqs.map((f, i) => <details key={i} className="group rounded-xl border border-slate-200 px-4 py-3"><summary className="cursor-pointer font-medium text-slate-900">{f.question}</summary><p className="mt-2 text-sm text-slate-600">{f.answer}</p></details>)}</div>
            </Block>
          )}

          <GalleryStrip eventId={event.id} />

          {event.terms && <Block title="Terms and conditions"><p className="whitespace-pre-line text-sm text-slate-500">{event.terms}</p></Block>}
        </div>

        <aside className="space-y-4 lg:sticky lg:top-20 lg:self-start">
          <div className="card space-y-4">
            <ul className="space-y-3 text-sm text-slate-600">
              <li className="flex gap-3"><Calendar className="mt-0.5 h-4 w-4 shrink-0 text-brand-600" /><span><span className="block font-medium text-slate-900">{fmtDate(event.startsAt)}</span>to {fmtDate(event.endsAt)}</span></li>
              <li className="flex gap-3">{event.mode === 'ONLINE' ? <Video className="mt-0.5 h-4 w-4 shrink-0 text-brand-600" /> : <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-brand-600" />}<span><span className="block font-medium text-slate-900">{event.mode === 'ONLINE' ? 'Online event' : event.venue}</span>{MODE_LABEL[event.mode]}</span></li>
              {event.teamMax > 1 && <li className="flex gap-3"><Users className="mt-0.5 h-4 w-4 shrink-0 text-brand-600" /><span><span className="block font-medium text-slate-900">Team event</span>{event.teamMin === event.teamMax ? `${event.teamMax} members per team` : `${event.teamMin} to ${event.teamMax} members per team`}</span></li>}
              <li className="flex gap-3"><Wallet className="mt-0.5 h-4 w-4 shrink-0 text-brand-600" /><span className="font-medium text-slate-900">{money(event.fee)}</span></li>
            </ul>
            {published && !ended && <DeadlineBox deadline={event.registrationDeadline} />}
            {published && !ended && event.fee > 0 && event.refundCutoffHours !== null && event.refundCutoffHours !== undefined && (
              <p className="text-xs text-slate-500">Refund policy: cancel {event.refundCutoffHours === 0 ? 'before the event starts' : `at least ${event.refundCutoffHours} hour${event.refundCutoffHours === 1 ? '' : 's'} before it starts`} for an automatic refund of an online payment.</p>
            )}
            {published && !ended && event.registrationUrl && (
              deadlinePassed ? (
                <p className="text-center text-sm font-medium text-slate-500">The registration form is closed.</p>
              ) : (
                <div className="space-y-1">
                  <a href={event.registrationUrl} target="_blank" rel="noopener noreferrer" className="btn-primary w-full">
                    <ExternalLink className="h-4 w-4" /> {/^https:\/\/(docs\.google\.com\/forms|forms\.gle|forms\.office\.com)/i.test(event.registrationUrl) ? 'Open the registration form' : 'Open registration link'}
                  </a>
                  <p className="text-center text-xs text-slate-500">Fill the organiser's form first, then use the button below to get your QR ticket for check-in.</p>
                </div>
              )
            )}
            <div>
              <div className="mb-1 flex justify-between text-xs text-slate-500"><span className="flex items-center gap-1"><Users className="h-3 w-3" /> {event.registeredCount} / {event.capacity} registered</span><span>{full ? 'Full' : `${seatsLeft} left`}</span></div>
              <div className="h-2 overflow-hidden rounded-full bg-slate-100"><div className={`h-full rounded-full ${full ? 'bg-red-500' : 'bg-brand-600'}`} style={{ width: `${fillPct}%` }} /></div>
              {event.waitlistedCount > 0 && <p className="mt-1 text-xs text-slate-400">{event.waitlistedCount} on the waitlist</p>}
            </div>
            {action()}
            <button onClick={copyLink} className="btn-ghost w-full text-xs"><Copy className="h-3.5 w-3.5" /> Copy link to share</button>
            {published && <a href={`https://wa.me/?text=${encodeURIComponent(`${event.title} - ${window.location.href}`)}`} target="_blank" rel="noopener noreferrer" className="btn-ghost w-full text-xs"><MessageCircle className="h-3.5 w-3.5" /> Share on WhatsApp</a>}
            {published && <a href={`${API_URL}/calendar/${event.id}`} className="btn-ghost w-full text-xs"><Calendar className="h-3.5 w-3.5" /> Add to calendar (.ics)</a>}
          </div>

          <TeamPanel event={event} registration={myRegistration} />
          <SurveyPanel event={event} registration={myRegistration} />

          {canManage && (
            <div className="card space-y-2">
              <p className="flex items-center gap-2 text-sm font-semibold text-slate-900"><Settings2 className="h-4 w-4" /> Manage</p>
              <Link to={`/organizer/events/${event.id}/edit`} className="btn-outline w-full">Edit event</Link>
              <Link to={`/organizer/events/${event.id}/registrations`} className="btn-outline w-full">Registrations</Link>
              <Link to={`/organizer/events/${event.id}/attendance`} className="btn-outline w-full">Attendance and QR check-in</Link>
              <Link to={`/organizer/events/${event.id}/feedback`} className="btn-outline w-full">Feedback</Link>
              <Link to={`/organizer/events/${event.id}/survey`} className="btn-outline w-full">Survey questions</Link>
              <Link to={`/organizer/events/${event.id}/messages`} className="btn-outline w-full">Message attendees</Link>
              <Link to={`/organizer/events/${event.id}/gallery`} className="btn-outline w-full">Photos and sponsors</Link>
              <Link to={`${user?.role === 'ADMIN' ? '/admin' : '/organizer'}/reports/event/${event.id}`} className="btn-outline w-full">Event report (PDF)</Link>
            </div>
          )}

          {(event.contactEmail || event.contactPhone) && (
            <div className="card text-sm">
              <p className="mb-2 font-semibold text-slate-900">Contact</p>
              {event.contactEmail && <a className="flex items-center gap-2 text-brand-600 hover:underline" href={`mailto:${event.contactEmail}`}><ExternalLink className="h-3.5 w-3.5" /> {event.contactEmail}</a>}
              {event.contactPhone && <p className="mt-1 text-slate-600">{event.contactPhone}</p>}
            </div>
          )}
        </aside>
      </div>

      {related.length > 0 && (
        <section className="mt-12">
          <h2 className="mb-4 text-xl font-bold text-slate-900">Related events</h2>
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">{related.map((r) => <EventCard key={r.id} event={r} />)}</div>
        </section>
      )}

      <ConfirmDialog
        open={confirmCancel}
        onClose={() => setConfirmCancel(false)}
        title={status === 'REGISTERED' ? 'Cancel your registration?' : 'Withdraw?'}
        message={status === 'REGISTERED' ? 'Your seat will be given to the next person on the waitlist.' : 'You will be removed from this list.'}
        confirmLabel="Yes, continue"
        danger
        busy={busy}
        onConfirm={() => act(() => api.delete(`/registrations/${event.id}`), 'Done. Your registration was removed.')}
      />
    </div>
  );
}
