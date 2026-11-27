import { Link } from 'react-router-dom';
import { ArrowLeft, Printer } from 'lucide-react';
import useFetch from '../../hooks/useFetch.js';
import { ErrorBox, Loader } from '../../components/common/Ui.jsx';
import { fmtDate } from '../../utils/format.js';

// A printable summary of confirmed volunteer service. Print it or save it as PDF from the browser.
export default function VolunteerCertificate() {
  const { data, loading, error } = useFetch('/volunteer/mine');
  if (loading) return <Loader />;
  if (!data) return <ErrorBox message={error || 'Could not load your volunteer record'} />;
  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3 print:hidden">
        <Link to="/student/volunteer" className="btn-ghost"><ArrowLeft className="h-4 w-4" /> Back</Link>
        <button className="btn-primary" onClick={() => window.print()}><Printer className="h-4 w-4" /> Print or save as PDF</button>
      </div>
      {data.entries.length === 0 ? <p className="text-sm text-slate-500">You have no confirmed volunteer hours yet.</p> : (
        <article className="mx-auto max-w-3xl rounded-2xl border-4 border-double border-brand-600 bg-white p-8 text-center text-slate-800">
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-brand-700">UniEvents</p>
          <h1 className="mt-2 text-3xl font-bold">Certificate of Volunteer Service</h1>
          <p className="mt-6 text-sm text-slate-500">This is to certify that</p>
          <p className="mt-1 text-2xl font-semibold">{data.person.name}</p>
          <p className="text-xs text-slate-500">{[data.person.studentId, data.person.department].filter(Boolean).join(' · ')}</p>
          <p className="mx-auto mt-4 max-w-xl text-sm">served as event staff at <b>{data.events}</b> campus event{data.events === 1 ? '' : 's'} for a total of</p>
          <p className="my-2 text-5xl font-extrabold text-brand-700">{data.total} <span className="text-xl font-semibold">hours</span></p>
          <table className="mx-auto mt-6 w-full max-w-xl border-collapse text-left text-xs">
            <thead><tr className="bg-slate-100 uppercase tracking-wide text-slate-600"><th className="px-2 py-1.5">Event</th><th className="px-2 py-1.5">Date</th><th className="px-2 py-1.5">Organiser</th><th className="px-2 py-1.5 text-right">Hours</th></tr></thead>
            <tbody>{data.entries.map((e) => <tr key={e.eventId} className="border-b border-slate-100"><td className="px-2 py-1.5">{e.title}</td><td className="px-2 py-1.5 whitespace-nowrap">{fmtDate(e.startsAt)}</td><td className="px-2 py-1.5">{e.organizer}</td><td className="px-2 py-1.5 text-right">{e.hours}</td></tr>)}</tbody>
          </table>
          <p className="mt-6 text-[11px] text-slate-500">Hours were confirmed by the event organisers in UniEvents. Issued on {fmtDate(data.issuedAt)}.</p>
        </article>
      )}
    </div>
  );
}
