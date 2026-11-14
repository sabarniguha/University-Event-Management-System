import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowRight, BadgeCheck, CalendarCheck, ChevronDown, Mail, QrCode, Quote, Search, ShieldCheck, Sparkles, Star, Ticket, Users, Zap } from 'lucide-react';
import useFetch from '../../hooks/useFetch.js';
import useCountUp from '../../hooks/useCountUp.js';
import api from '../../services/api.js';
import { useToast } from '../../context/ToastContext.jsx';
import EventCard from '../../components/events/EventCard.jsx';
import CategoryIcon from '../../components/events/CategoryIcon.jsx';
import { CardSkeletons, EmptyState } from '../../components/common/Ui.jsx';
import { errMsg } from '../../utils/format.js';

const fade = { initial: { opacity: 0, y: 18 }, whileInView: { opacity: 1, y: 0 }, viewport: { once: true, margin: '-60px' }, transition: { duration: 0.4 } };

function Stat({ label, value }) {
  const shown = useCountUp(value);
  return (
    <div className="text-center">
      <p className="text-3xl font-extrabold tracking-tight text-slate-900 sm:text-4xl">{value === undefined ? '-' : shown.toLocaleString()}</p>
      <p className="mt-1 text-sm text-slate-500">{label}</p>
    </div>
  );
}

function Section({ title, subtitle, to, children, tinted = false }) {
  return (
    <section className={tinted ? 'bg-slate-100/60 py-14' : 'py-14'}>
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <motion.div {...fade} className="mb-8 flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">{title}</h2>
            {subtitle && <p className="mt-1 text-slate-500">{subtitle}</p>}
          </div>
          {to && <Link to={to} className="inline-flex items-center gap-1 text-sm font-medium text-brand-600 hover:underline">View all <ArrowRight className="h-4 w-4" /></Link>}
        </motion.div>
        {children}
      </div>
    </section>
  );
}

function EventRow({ path, params, emptyText }) {
  const { data, loading } = useFetch(path, params);
  if (loading) return <CardSkeletons count={3} />;
  const events = data?.events || [];
  if (events.length === 0) return <EmptyState icon={CalendarCheck} title="No events here yet">{emptyText}</EmptyState>;
  return (
    <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
      {events.map((e) => <motion.div key={e.id} {...fade}><EventCard event={e} /></motion.div>)}
    </div>
  );
}

const STEPS = [
  { icon: Search, title: 'Discover', text: 'Search and filter events by category, date, department and format.' },
  { icon: Ticket, title: 'Register', text: 'Register in one click and get a personal QR ticket instantly.' },
  { icon: QrCode, title: 'Check in', text: 'Show your QR at the venue. Organisers scan it to mark attendance.' },
  { icon: BadgeCheck, title: 'Get certified', text: 'Attended? Download a certificate that anyone can verify online.' },
];

const WHY = [
  { icon: Zap, title: 'Fast and simple', text: 'Register for an event in seconds and see everything you joined in one place.' },
  { icon: ShieldCheck, title: 'Trusted and verified', text: 'Events are reviewed by admins, and certificates carry a public verification ID.' },
  { icon: Users, title: 'Built for campus', text: 'Separate tools for students, organisers and admins, with department-level eligibility.' },
  { icon: Sparkles, title: 'Always in the loop', text: 'Reminders, waitlist promotions and updates arrive as in-app notifications.' },
];

const FAQ = [
  ['Who can register on UniEvents?', 'Anyone can create a student account. Organiser access is granted by an admin after you request it from your dashboard.'],
  ['How does check-in work?', 'Every confirmed registration gets a QR ticket. The organiser scans it at the venue, and each ticket can be used only once.'],
  ['What if an event is full?', 'If the organiser enabled a waitlist, you join the queue and are moved up automatically when a seat opens.'],
  ['How do certificates work?', 'After the event, organisers issue certificates to everyone marked present. You can download them and share a verification link.'],
  ['Does it cost anything?', 'The platform is free to use. Individual events may show a fee set by the organiser, which is paid to the organiser directly.'],
];

export default function Home() {
  const navigate = useNavigate();
  const toast = useToast();
  const [q, setQ] = useState('');
  const [email, setEmail] = useState('');
  const [open, setOpen] = useState(0);
  const { data: stats } = useFetch('/public/stats');
  const { data: cats } = useFetch('/categories');
  const { data: hl } = useFetch('/public/highlights');

  const search = (e) => {
    e.preventDefault();
    navigate(q.trim() ? `/events?q=${encodeURIComponent(q.trim())}` : '/events');
  };

  const subscribe = async (e) => {
    e.preventDefault();
    try {
      const { data } = await api.post('/public/newsletter', { email });
      toast.success(data.message);
      setEmail('');
    } catch (err) {
      toast.error(errMsg(err));
    }
  };

  return (
    <>
      {/* Hero */}
      <section className="relative overflow-hidden bg-gradient-to-b from-brand-50 to-slate-50">
        <div className="pointer-events-none absolute -top-24 right-0 h-80 w-80 rounded-full bg-fuchsia-300/30 blur-3xl" />
        <div className="pointer-events-none absolute -left-16 top-40 h-72 w-72 rounded-full bg-brand-300/30 blur-3xl" />
        <div className="relative mx-auto max-w-4xl px-4 pb-16 pt-16 text-center sm:px-6 sm:pt-24">
          <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mx-auto mb-4 inline-flex items-center gap-2 rounded-full border border-brand-200 bg-white px-3 py-1 text-xs font-medium text-brand-700">
            <Sparkles className="h-3.5 w-3.5" /> The campus event platform
          </motion.p>
          <motion.h1 initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }} className="text-4xl font-extrabold tracking-tight text-slate-900 sm:text-6xl">
            Discover. Connect. <span className="gradient-text">Experience Campus Life.</span>
          </motion.h1>
          <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.15 }} className="mx-auto mt-5 max-w-2xl text-lg text-slate-600">
            Find hackathons, workshops, fests and talks happening around you. Register in a click, check in with a QR ticket and collect verified certificates.
          </motion.p>
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.25 }} className="mt-8 flex flex-wrap justify-center gap-3">
            <Link to="/events" className="btn-primary btn-lg">Explore Events <ArrowRight className="h-4 w-4" /></Link>
            <Link to="/register" className="btn-outline btn-lg">Join UniEvents</Link>
          </motion.div>
          <form onSubmit={search} className="mx-auto mt-8 flex max-w-xl gap-2 rounded-2xl border border-slate-200 bg-white p-2 shadow-soft">
            <div className="relative flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input className="w-full rounded-xl bg-transparent py-2.5 pl-9 pr-3 text-sm outline-none placeholder:text-slate-400" placeholder="Search events, venues or topics" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Search events" />
            </div>
            <button className="btn-primary">Search</button>
          </form>
        </div>
        <div className="relative mx-auto grid max-w-4xl grid-cols-2 gap-6 px-4 pb-14 sm:grid-cols-4">
          <Stat label="Published events" value={stats?.events} />
          <Stat label="Upcoming" value={stats?.upcoming} />
          <Stat label="Students" value={stats?.students} />
          <Stat label="Registrations" value={stats?.registrations} />
        </div>
      </section>

      <Section title="Featured events" subtitle="Hand-picked by the UniEvents team" to="/events?featured=true">
        <EventRow path="/events" params={{ featured: 'true', limit: 3 }} emptyText="No featured events right now. Check out the upcoming ones below." />
      </Section>

      <Section title="Upcoming events" subtitle="Happening soon on campus" to="/events" tinted>
        <EventRow path="/events" params={{ sort: 'upcoming', limit: 6 }} emptyText="No upcoming events yet. Check back soon, or ask an organiser to publish one." />
      </Section>

      <Section title="Browse by category" to="/categories">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {(cats?.categories || []).slice(0, 8).map((c) => (
            <motion.div key={c.id} {...fade}>
              <Link to={`/events?category=${encodeURIComponent(c.name)}`} className="card flex items-center gap-3 !p-4 transition hover:-translate-y-0.5 hover:shadow-lift">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-600"><CategoryIcon name={c.icon} /></span>
                <span className="min-w-0">
                  <span className="block truncate text-sm font-semibold text-slate-900">{c.name}</span>
                  <span className="text-xs text-slate-500">{c.eventCount} upcoming</span>
                </span>
              </Link>
            </motion.div>
          ))}
        </div>
      </Section>

      <Section title="Popular events" subtitle="Most registrations" to="/events?sort=popular" tinted>
        <EventRow path="/events" params={{ sort: 'popular', limit: 3 }} emptyText="Popular events will show up here once students start registering." />
      </Section>

      <Section title="Recently added" to="/events?sort=newest">
        <EventRow path="/events" params={{ sort: 'newest', limit: 3 }} emptyText="Newly published events will appear here." />
      </Section>

      <Section title="How it works" tinted>
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {STEPS.map(({ icon: Icon, title, text }, i) => (
            <motion.div key={title} {...fade} className="card">
              <span className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-brand-600 text-white"><Icon className="h-5 w-5" /></span>
              <p className="text-xs font-semibold text-brand-600">Step {i + 1}</p>
              <h3 className="font-semibold text-slate-900">{title}</h3>
              <p className="mt-1 text-sm text-slate-500">{text}</p>
            </motion.div>
          ))}
        </div>
      </Section>

      <Section title="Why choose UniEvents">
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {WHY.map(({ icon: Icon, title, text }) => (
            <motion.div key={title} {...fade} className="card">
              <Icon className="mb-3 h-6 w-6 text-brand-600" />
              <h3 className="font-semibold text-slate-900">{title}</h3>
              <p className="mt-1 text-sm text-slate-500">{text}</p>
            </motion.div>
          ))}
        </div>
      </Section>

      <Section title="Community highlights" subtitle="Recently completed events" tinted>
        {(hl?.highlights || []).length === 0 ? (
          <EmptyState icon={Users} title="Highlights will appear here">Once events finish, their turnout shows up in this section.</EmptyState>
        ) : (
          <div className="grid gap-5 sm:grid-cols-3">
            {hl.highlights.map((h) => (
              <Link key={h.id} to={`/events/${h.id}`} className="card transition hover:-translate-y-0.5 hover:shadow-lift">
                <span className="text-xs font-semibold uppercase text-brand-600">{h.category}</span>
                <h3 className="mt-1 font-semibold text-slate-900">{h.title}</h3>
                <p className="mt-3 flex items-center gap-2 text-sm text-slate-500"><Users className="h-4 w-4" /> {h.attendees} registered</p>
              </Link>
            ))}
          </div>
        )}
      </Section>

      {(hl?.testimonials || []).length > 0 && (
        <Section title="What students say" subtitle="Feedback from people who attended">
          <div className="grid gap-5 md:grid-cols-3">
            {hl.testimonials.slice(0, 3).map((t, i) => (
              <motion.figure key={i} {...fade} className="card">
                <Quote className="mb-2 h-5 w-5 text-brand-400" />
                <blockquote className="text-sm text-slate-700">{t.comment}</blockquote>
                <div className="mt-3 flex items-center gap-1 text-amber-500">{Array.from({ length: t.rating }).map((_, k) => <Star key={k} className="h-4 w-4 fill-current" />)}</div>
                <figcaption className="mt-2 text-xs text-slate-500">{t.name}{t.department ? `, ${t.department}` : ''} &middot; {t.eventTitle}</figcaption>
              </motion.figure>
            ))}
          </div>
        </Section>
      )}

      <section className="py-14">
        <div className="mx-auto max-w-3xl px-4">
          <motion.div {...fade} className="rounded-3xl bg-gradient-to-br from-brand-600 to-fuchsia-600 p-8 text-center text-white shadow-lift">
            <Mail className="mx-auto mb-3 h-8 w-8" />
            <h2 className="text-2xl font-bold">Never miss an event</h2>
            <p className="mt-1 text-white/80">Subscribe to hear about new events on campus.</p>
            <form onSubmit={subscribe} className="mx-auto mt-5 flex max-w-md flex-col gap-2 sm:flex-row">
              <input type="email" required className="flex-1 rounded-xl border-0 bg-white px-4 py-2.5 text-sm text-slate-900 outline-none" placeholder="you@college.edu" value={email} onChange={(e) => setEmail(e.target.value)} aria-label="Email address" />
              <button className="rounded-xl bg-slate-900 px-5 py-2.5 text-sm font-medium text-white hover:bg-slate-800">Subscribe</button>
            </form>
          </motion.div>
        </div>
      </section>

      <Section title="Frequently asked questions" tinted>
        <div className="mx-auto max-w-3xl space-y-3">
          {FAQ.map(([question, answer], i) => (
            <div key={question} className="card !p-0">
              <button className="flex w-full items-center justify-between gap-3 px-5 py-4 text-left font-medium text-slate-900" aria-expanded={open === i} onClick={() => setOpen(open === i ? -1 : i)}>
                {question}
                <ChevronDown className={`h-5 w-5 shrink-0 text-slate-400 transition ${open === i ? 'rotate-180' : ''}`} />
              </button>
              {open === i && <p className="px-5 pb-4 text-sm text-slate-600">{answer}</p>}
            </div>
          ))}
        </div>
      </Section>
    </>
  );
}
