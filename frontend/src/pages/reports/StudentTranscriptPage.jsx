import VolunteerSection from '../../components/reports/VolunteerSection.jsx';
import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Download, Printer } from 'lucide-react';
import useFetch from '../../hooks/useFetch.js';
import { ErrorBox, Loader, PageHeader } from '../../components/common/Ui.jsx';
import usePrintPage from '../../components/reports/usePrintPage.js';
import { Cover, Empty, Figure, Table, num } from '../../components/reports/ReportParts.jsx';
import { downloadCsv } from '../../utils/csvDownload.js';
import { fmtDate } from '../../utils/format.js';

const day = (d) => new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
const hoursOf = (e) => Math.round((Math.max(0, new Date(e.endsAt) - new Date(e.startsAt)) / 3600e3) * 10) / 10;

// A formal, one-document record of the events a student attended, with a Report ID anyone can check.
export default function StudentTranscriptPage() {
  const now = new Date();
  const [type, setType] = useState('all');
  const [year, setYear] = useState(now.getFullYear());
  const [from, setFrom] = useState(`${now.getFullYear()}-01-01`);
  const [to, setTo] = useState(now.toISOString().slice(0, 10));
  const params = useMemo(() => ({ type, year, form: 'transcript', ...(type === 'range' ? { from, to } : {}) }), [type, year, from, to]);
  const { data: d, loading, error } = useFetch('/reports/student', params);
  const fileName = `UniEvents-Activity-Transcript-${type === 'all' ? 'AllTime' : type === 'range' ? `${from}_to_${to}` : year}`;
  const print = usePrintPage(fileName);
  const years = Array.from({ length: 6 }, (_, i) => now.getFullYear() - i);
  const attended = d ? d.events.filter((e) => e.attendance === 'PRESENT').sort((a, b) => new Date(a.startsAt) - new Date(b.startsAt)) : [];

  return (
    <div className="space-y-6">
      <div className="print:hidden"><PageHeader title="Activity transcript" subtitle="A formal record of the events you attended, with a Report ID that anyone can verify." actions={<Link to="/student/reports" className="btn-outline"><ArrowLeft className="h-4 w-4" /> My report</Link>} /></div>
      <div className="card flex flex-wrap items-end gap-3 print:hidden">
        <div><label className="label" htmlFor="tr-type">Covers</label><select id="tr-type" className="input" value={type} onChange={(e) => setType(e.target.value)}><option value="all">All time</option><option value="year">One year</option><option value="range">Custom range</option></select></div>
        {type === 'year' && <div><label className="label" htmlFor="tr-y">Year</label><select id="tr-y" className="input" value={year} onChange={(e) => setYear(Number(e.target.value))}>{years.map((y) => <option key={y}>{y}</option>)}</select></div>}
        {type === 'range' && <><div><label className="label" htmlFor="tr-f">From</label><input id="tr-f" type="date" className="input" value={from} max={to} onChange={(e) => e.target.value && setFrom(e.target.value)} /></div><div><label className="label" htmlFor="tr-t">To</label><input id="tr-t" type="date" className="input" value={to} min={from} onChange={(e) => e.target.value && setTo(e.target.value)} /></div></>}
        <button className="btn-outline ml-auto" disabled={!d} onClick={() => downloadCsv(fileName, [{ title: `${d.student.name} - activity transcript (Report ID ${d.seal?.code || '-'})`, head: ['Date', 'Event', 'Category', 'Hours', 'Certificate ID'], rows: attended.map((e) => [new Date(e.startsAt).toISOString().slice(0, 10), e.title, e.category, hoursOf(e), e.certificateId || '']) }])}><Download className="h-4 w-4" /> Download CSV</button>
        <button className="btn-primary" onClick={print} disabled={!d}><Printer className="h-4 w-4" /> Download PDF</button>
        <p className="basis-full text-xs text-slate-500">Click Download PDF, then choose <b>Save as PDF</b> as the destination in the print window.</p>
      </div>
      <ErrorBox message={error} />
      {loading && !d ? <Loader /> : d && (
        <article className="report-doc card mx-auto w-full max-w-[210mm] bg-white p-6 sm:p-8">
          <Cover
            kicker="Activity transcript"
            title={d.student.name}
            subtitle={[d.student.studentId, d.student.department].filter(Boolean).join(' · ') || 'UniEvents student'}
            lines={[d.meta.period.label, `Issued ${fmtDate(d.meta.generatedAt)}`]}
            seal={d.seal}
          />
          <div className="report-block mt-6 grid grid-cols-3 gap-3 print:grid-cols-3">
            <Figure label="Events attended" value={num(d.kpis.attended)} />
            <Figure label="Hours at events" value={num(d.activityHours)} sub="scheduled length" />
            <Figure label="Certificates" value={num(d.kpis.certificates)} />
          </div>
          <div className="mt-6">
            {attended.length === 0 ? <Empty>No attended events in this period.</Empty> : (
              <Table head={['#', 'Date', 'Event', 'Category', 'Hours', 'Certificate ID']}>
                {attended.map((e, i) => <tr key={e.eventId}><td>{i + 1}</td><td className="whitespace-nowrap">{day(e.startsAt)}</td><td className="font-medium text-slate-900">{e.title}</td><td>{e.category}</td><td>{hoursOf(e)}</td><td className="font-mono">{e.certificateId || '-'}</td></tr>)}
              </Table>
            )}
          </div>
          <VolunteerSection />
          <p className="report-block mt-6 text-[11px] leading-relaxed text-slate-500">
            This transcript lists only events at which the student was marked present by the organiser, as recorded in UniEvents. Hours are the scheduled length of each event.
            Its authenticity can be checked at <b>/verify-report</b> using the Report ID above; the ID changes if any figure changes. Times are in {d.meta.timezone}.
          </p>
        </article>
      )}
    </div>
  );
}
