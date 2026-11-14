import { Link } from 'react-router-dom';
import { Award, CalendarCheck, QrCode, ShieldCheck } from 'lucide-react';
import useFetch from '../../hooks/useFetch.js';

const POINTS = [
  { icon: CalendarCheck, title: 'Every event, one place', text: 'Hackathons, fests, workshops and talks are listed in one searchable calendar instead of scattered posters and group chats.' },
  { icon: QrCode, title: 'Check-in without the queue', text: 'Each registration gets a unique QR ticket. Organisers scan it at the door and duplicate scans are rejected automatically.' },
  { icon: Award, title: 'Certificates you can verify', text: 'Certificates are issued only to students marked present and carry an ID that anyone can check on the verification page.' },
  { icon: ShieldCheck, title: 'Reviewed and role-based', text: 'Students, organisers and admins each see their own tools. New events can be reviewed by an admin before they go live.' },
];

export default function About() {
  const { data } = useFetch('/public/settings');
  const name = data?.settings?.siteName || 'UniEvents';
  return (
    <div className="mx-auto max-w-5xl px-4 py-12 sm:px-6">
      <h1 className="text-4xl font-extrabold tracking-tight text-slate-900">About {name}</h1>
      <p className="mt-4 max-w-3xl text-lg text-slate-600">
        {name} is an event management platform for universities. It helps students find things to do, helps organisers run events without spreadsheets, and gives administrators a clear view of what is happening on campus.
      </p>
      <div className="mt-10 grid gap-5 sm:grid-cols-2">
        {POINTS.map(({ icon: Icon, title, text }) => (
          <div key={title} className="card">
            <span className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-brand-50 text-brand-600"><Icon className="h-5 w-5" /></span>
            <h2 className="font-semibold text-slate-900">{title}</h2>
            <p className="mt-1 text-sm text-slate-500">{text}</p>
          </div>
        ))}
      </div>
      <div className="mt-10 flex flex-wrap gap-3">
        <Link to="/events" className="btn-primary">Explore events</Link>
        <Link to="/contact" className="btn-outline">Get in touch</Link>
      </div>
    </div>
  );
}
