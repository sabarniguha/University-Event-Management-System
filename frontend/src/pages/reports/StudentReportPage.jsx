import { useMemo, useState } from 'react';
import { Printer } from 'lucide-react';
import useFetch from '../../hooks/useFetch.js';
import { ErrorBox, Loader, PageHeader } from '../../components/common/Ui.jsx';
import usePrintPage from '../../components/reports/usePrintPage.js';
import { BarList, ColumnChart, Cover, Donut, Figure, Section, Table, num, pc, rupees, stars } from '../../components/reports/ReportParts.jsx';
import { MODE_LABEL, fmtDate } from '../../utils/format.js';

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const STATUS = { REGISTERED: 'Confirmed', WAITLISTED: 'Waitlisted', PENDING: 'Awaiting approval', AWAITING_PAYMENT: 'Awaiting payment', CANCELLED: 'Cancelled', REJECTED: 'Rejected' };
const short = (d) => new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });

const attendanceLabel = (e) => {
  if (e.status !== 'REGISTERED') return '-';
  if (!e.ended) return 'Upcoming';
  return e.attendance === 'PRESENT' ? 'Present' : e.attendance === 'ABSENT' ? 'Absent' : 'Not marked';
};

// Only facts from the student's own records; nothing is judged beyond comparing numbers.
function story(d) {
  const { kpis: k, meta, campus } = d;
  if (k.confirmed === 0 && k.waitlisted + k.pending + k.cancelled === 0) return `You have no event registrations ${meta.period.type === 'all' ? 'yet' : `in ${meta.period.label}`}.`;
  const bits = [`${meta.period.type === 'all' ? 'So far' : `In ${meta.period.label}`}, you had ${num(k.confirmed)} confirmed event${k.confirmed === 1 ? '' : 's'}.`];
  if (k.finished > 0) bits.push(`You attended ${num(k.attended)} of the ${num(k.finished)} that have finished (${k.attendanceRate}% attendance).`);
  else bits.push('None of them has finished yet, so attendance is not available.');
  if (k.finished > 0 && campus.attendanceRate !== null) bits.push(`The campus-wide attendance rate for the same period was ${campus.attendanceRate}%, so yours is ${k.attendanceRate > campus.attendanceRate ? 'above' : k.attendanceRate < campus.attendanceRate ? 'below' : 'the same as'} the average.`);
  if (k.certificates > 0) bits.push(`You earned ${num(k.certificates)} certificate${k.certificates === 1 ? '' : 's'}.`);
  if (k.topCategory) bits.push(`You attended ${k.topCategory} events most often.`);
  return bits.join(' ');
}

function notes(d) {
  const { kpis: k, events } = d;
  const out = [];
  if (k.notAttended > 0) out.push(`${num(k.notAttended)} finished event${k.notAttended === 1 ? ' was' : 's were'} not marked as attended. If you cannot go to an event, cancel your registration early so a waitlisted student can take your seat.`);
  if (k.feedbackPending > 0) out.push(`You attended ${num(k.feedbackPending)} event${k.feedbackPending === 1 ? '' : 's'} but have not given feedback yet. Feedback helps organisers improve and earns points.`);
  const noCert = events.filter((e) => e.attendance === 'PRESENT' && !e.certificateId).length;
  if (noCert > 0) out.push(`${num(noCert)} attended event${noCert === 1 ? ' has' : 's have'} no certificate yet. Organisers issue certificates after the event.`);
  if (k.waitlisted > 0) out.push(`${num(k.waitlisted)} registration${k.waitlisted === 1 ? ' is' : 's are'} on the waitlist; you will be notified if a seat opens.`);
  if (k.pending > 0) out.push(`${num(k.pending)} registration${k.pending === 1 ? ' is' : 's are'} waiting for approval or payment.`);
  return out;
}

export default function StudentReportPage() {
  const now = new Date();
  const [type, setType] = useState('year');
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);
  const params = useMemo(() => ({ type, year, month }), [type, year, month]);
  const { data: d, loading, error } = useFetch('/reports/student', params);
  const print = usePrintPage(`UniEvents-My-Report-${type === 'all' ? 'AllTime' : type === 'year' ? year : `${year}-${String(month).padStart(2, '0')}`}`);
  const years = Array.from({ length: 6 }, (_, i) => now.getFullYear() - i);

  return (
    <div className="space-y-6">
      <div className="print:hidden"><PageHeader title="My report" subtitle="Your attendance, certificates, points and activity in one document." /></div>
      <div className="card flex flex-wrap items-end gap-3 print:hidden">
        <div><label className="label" htmlFor="sr-type">Report</label><select id="sr-type" className="input" value={type} onChange={(e) => setType(e.target.value)}><option value="month">Monthly</option><option value="year">Yearly</option><option value="all">All time</option></select></div>
        {type === 'month' && <div><label className="label" htmlFor="sr-m">Month</label><select id="sr-m" className="input" value={month} onChange={(e) => setMonth(Number(e.target.value))}>{MONTHS.map((m, i) => <option key={m} value={i + 1}>{m}</option>)}</select></div>}
        {type !== 'all' && <div><label className="label" htmlFor="sr-y">Year</label><select id="sr-y" className="input" value={year} onChange={(e) => setYear(Number(e.target.value))}>{years.map((y) => <option key={y}>{y}</option>)}</select></div>}
        <button className="btn-primary ml-auto" onClick={print} disabled={!d}><Printer className="h-4 w-4" /> Download PDF</button>
        <p className="basis-full text-xs text-slate-500">Click Download PDF, then choose <b>Save as PDF</b> as the destination in the print window.</p>
      </div>
      <ErrorBox message={error} />
      {loading && !d ? <Loader /> : d && <Document d={d} />}
    </div>
  );
}

function Document({ d }) {
  const { kpis: k, meta, student: s, standing: st, campus } = d;
  const ch = (key) => d.previous?.[key]?.change;
  const certs = d.events.filter((e) => e.certificateId);
  const upcoming = d.events.filter((e) => e.status === 'REGISTERED' && !e.ended);
  const tips = notes(d);
  const earned = st.badges.filter((b) => b.earned);

  return (
    <article className="report-doc card mx-auto w-full max-w-[210mm] bg-white p-6 sm:p-8">
      <Cover
        kicker="Student performance report"
        title={s.name}
        subtitle={[s.studentId, s.department].filter(Boolean).join(' · ') || 'UniEvents student'}
        lines={[meta.period.label, `Generated ${fmtDate(meta.generatedAt)}`, `Student since ${new Date(s.memberSince).toLocaleDateString('en-IN', { month: 'short', year: 'numeric' })}`, `Times shown in ${meta.timezone}`]}
      />

      <Section title="Summary"><p className="text-sm leading-relaxed text-slate-700">{story(d)}</p></Section>

      <Section title="Key figures" note={meta.previousLabel ? `Percentages in green or red compare with ${meta.previousLabel}.` : undefined}>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 print:grid-cols-4">
          <Figure label="Events joined" value={num(k.confirmed)} change={ch('confirmed')} sub={`${num(k.upcoming)} coming up`} />
          <Figure label="Events attended" value={num(k.attended)} change={ch('attended')} sub={`of ${num(k.finished)} finished`} />
          <Figure label="Attendance rate" value={pc(k.attendanceRate)} sub={campus.attendanceRate !== null ? `Campus average ${campus.attendanceRate}%` : 'Campus average not available'} />
          <Figure label="Certificates earned" value={num(k.certificates)} change={ch('certificates')} />
          <Figure label="Feedback given" value={num(k.feedbackGiven)} change={ch('feedbackGiven')} sub={k.avgRatingGiven !== null ? `You rated ${stars(k.avgRatingGiven)} on average` : undefined} />
          <Figure label="Categories explored" value={num(k.categoriesExplored)} sub={k.topCategory ? `Most often: ${k.topCategory}` : undefined} />
          <Figure label="Amount paid" value={rupees(k.spent)} sub="for paid events" />
          <Figure label="Not attended" value={num(k.notAttended)} sub="finished events you joined" />
        </div>
      </Section>

      <Section title="My standing" note="Points and badges are for all time, not only this period.">
        <div className="grid grid-cols-3 gap-3 print:grid-cols-3">
          <Figure label="Points" value={num(st.points)} />
          <Figure label="Level" value={st.level} />
          <Figure label="Rank on campus" value={st.rank ? `#${st.rank}` : '-'} sub={st.rank ? `of ${num(st.ranked)} ranked students` : 'Attend an event to be ranked'} />
        </div>
        <p className="mt-3 text-xs text-slate-700"><b>Badges earned ({earned.length} of {st.badges.length}):</b> {earned.length ? earned.map((b) => b.name).join(', ') : 'none yet'}.</p>
        <p className="mt-1 text-[11px] text-slate-500">Still to earn: {st.badges.filter((b) => !b.earned).map((b) => `${b.name} (${b.description.toLowerCase()})`).join('; ') || 'nothing, you have them all'}.</p>
      </Section>

      <Section title={meta.period.type === 'month' ? 'Day by day' : meta.period.type === 'year' ? 'Month by month' : 'Last 12 months'} note="Counted on the day or month each event started.">
        <ColumnChart data={d.timeline} series={[{ key: 'registered', name: 'Events joined' }, { key: 'attended', name: 'Attended' }]} />
      </Section>

      <div className="report-block mt-7 grid gap-6 sm:grid-cols-2 print:grid-cols-2">
        <div><h3 className="mb-2 border-b-2 border-brand-600 pb-1 text-sm font-bold uppercase tracking-wide">What you attend</h3><BarList rows={d.categories} unit=" attended" empty="No attended events yet." /></div>
        <div><h3 className="mb-2 border-b-2 border-brand-600 pb-1 text-sm font-bold uppercase tracking-wide">How you attend</h3><Donut rows={d.byMode.map((r) => ({ label: MODE_LABEL[r.label] || r.label, count: r.count }))} /></div>
      </div>

      <Section title="My events" note={`${num(d.events.length)} registration(s) for events that started in ${meta.period.label}.`}>
        {d.events.length === 0 ? <p className="rounded-lg bg-slate-50 p-4 text-center text-sm text-slate-400">No events in this period.</p> : (
          <Table head={['Date', 'Event', 'Category', 'Status', 'Attendance', 'Certificate', 'Paid', 'My rating']}>
            {d.events.map((e) => (
              <tr key={`${e.eventId}`}><td className="whitespace-nowrap">{short(e.startsAt)}</td><td className="font-medium text-slate-900">{e.title}</td><td>{e.category}</td><td>{STATUS[e.status] || e.status}</td><td>{attendanceLabel(e)}</td><td>{e.certificateId ? 'Yes' : '-'}</td><td>{e.paid > 0 ? rupees(e.paid) : e.fee > 0 ? '-' : 'Free'}</td><td>{e.rating ?? '-'}</td></tr>
            ))}
          </Table>
        )}
      </Section>

      {certs.length > 0 && (
        <Section title="Certificates" note="Each can be verified by anyone on the Verify page using its ID.">
          <Table head={['Event', 'Date', 'Certificate ID']}>{certs.map((e) => <tr key={e.certificateId}><td className="font-medium text-slate-900">{e.title}</td><td>{short(e.startsAt)}</td><td className="font-mono">{e.certificateId}</td></tr>)}</Table>
        </Section>
      )}

      {upcoming.length > 0 && (
        <Section title="Coming up"><Table head={['Date', 'Event', 'Venue']}>{upcoming.map((e) => <tr key={e.eventId}><td className="whitespace-nowrap">{fmtDate(e.startsAt)}</td><td className="font-medium text-slate-900">{e.title}</td><td>{e.venue}</td></tr>)}</Table></Section>
      )}

      {tips.length > 0 && (
        <Section title="Things to note"><ul className="list-disc space-y-1 pl-4 text-xs text-slate-700">{tips.map((t) => <li key={t}>{t}</li>)}</ul></Section>
      )}

      <Section title="How these numbers are worked out" className="text-[11px] text-slate-500">
        <ul className="list-disc space-y-0.5 pl-4">
          <li>Only published events that <b>start</b> within the period are counted, cut at midnight {meta.timezone}. Your own records only.</li>
          <li><b>Attendance rate</b> is the events you were marked present at divided by confirmed events that have already finished. &quot;Not attended&quot; includes events where nothing was recorded.</li>
          <li>The <b>campus average</b> is the same calculation over every student for the same period. No other student is named or identifiable.</li>
          <li><b>Points</b>: 10 per attended event, 5 per feedback, 3 for joining a team. Levels: Bronze 10, Silver 60, Gold 150.</li>
          <li>A dash means there is nothing to calculate yet. Nothing is estimated.</li>
        </ul>
      </Section>
    </article>
  );
}
