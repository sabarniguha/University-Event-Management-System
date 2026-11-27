import AiInsights from '../../components/reports/AiInsights.jsx';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, Download, Printer } from 'lucide-react';
import useFetch from '../../hooks/useFetch.js';
import { useAuth } from '../../context/AuthContext.jsx';
import { ErrorBox, Loader, PageHeader } from '../../components/common/Ui.jsx';
import { downloadCsv } from '../../utils/csvDownload.js';
import PhotoGrid from '../../components/reports/PhotoGrid.jsx';
import usePrintPage from '../../components/reports/usePrintPage.js';
import { Banner, BarList, ColumnChart, Cover, Donut, Empty, Figure, Section, Table, num, pc, rupees, stars } from '../../components/reports/ReportParts.jsx';
import { mediaUrl } from '../../services/api.js';
import { MODE_LABEL, fmtDate } from '../../utils/format.js';

const ROLE = { ADMIN: 'Admin', ORGANIZER: 'Organiser' };
const STATUS_LABEL = { REGISTERED: 'Confirmed', WAITLISTED: 'Waitlisted', PENDING: 'Waiting for approval', AWAITING_PAYMENT: 'Approved, awaiting payment', CANCELLED: 'Cancelled by student', REJECTED: 'Rejected' };

// One event in full: description, schedule, who registered and attended, money, feedback, photos.
export default function EventReportPage() {
  const { id } = useParams();
  const { user } = useAuth();
  const base = user.role === 'ADMIN' ? '/admin' : '/organizer';
  const { data: d, loading, error } = useFetch(`/reports/event/${id}`);
  const print = usePrintPage(`UniEvents-Event-Report-${id}`);

  return (
    <div className="space-y-6">
      <div className="print:hidden"><PageHeader
        title="Event report"
        subtitle="Everything about this event in one document."
        actions={<>
        <Link to={`${base}/reports`} className="btn-outline"><ArrowLeft className="h-4 w-4" /> All reports</Link>
        <button className="btn-outline" onClick={() => downloadCsv(`UniEvents-Event-Report-${id}`, [
          { title: `${d.event.title} (Report ID ${d.seal?.code || '-'})`, head: ['Confirmed', 'Attended', 'Absent', 'Not marked', 'Seats', 'Fill %', 'Attendance %', 'Certificates', 'Revenue (INR)', 'Refunded (INR)', 'Average rating', 'Ratings'], rows: [[d.numbers.confirmed, d.numbers.present, d.numbers.absent, d.numbers.notMarked, d.numbers.capacity, d.numbers.fillRate ?? '', d.numbers.attendanceRate ?? '', d.numbers.certificates, d.payments.revenue, d.payments.refunded, d.feedback.average ?? '', d.feedback.count]] },
          { title: 'Confirmed attendees', head: ['Name', 'Student ID', 'Department', 'Attendance'], rows: d.attendees.map((a) => [a.name, a.studentId || '', a.department || '', a.attended]) },
          { title: 'Feedback comments', head: ['Rating', 'Comment'], rows: d.feedback.comments.map((c) => [c.rating, c.comment]) },
        ])} disabled={!d}><Download className="h-4 w-4" /> Download CSV</button>
        <button className="btn-primary" onClick={print} disabled={!d}><Printer className="h-4 w-4" /> Download PDF</button>
      </>}
      /></div>
      <p className="-mt-3 text-xs text-slate-500 print:hidden">Click Download PDF, then choose <b>Save as PDF</b> as the destination in the print window.</p>
      <ErrorBox message={error} />
      {loading && !d ? <Loader /> : d && <Document d={d} />}
    </div>
  );
}

function List({ items, render }) {
  return <ul className="space-y-2 text-xs">{items.map((x, i) => <li key={i} className="report-block">{render(x)}</li>)}</ul>;
}

function Document({ d }) {
  const { event: e, numbers: n, payments: pay, feedback: f, meta } = d;
  const agenda = e.agenda || [];
  const speakers = e.speakers || [];
  const faqs = e.faqs || [];
  const statuses = Object.entries(n.byStatus).map(([label, count]) => ({ label: STATUS_LABEL[label] || label, count }));

  return (
    <article className="report-doc card mx-auto w-full max-w-[210mm] bg-white p-6 sm:p-8">
      <Cover
        kicker="Event report"
        title={e.title}
        subtitle={`${e.category}${e.eventType ? ` · ${e.eventType}` : ''}`}
        lines={[`Generated ${fmtDate(meta.generatedAt)}`, `By ${meta.generatedBy.name} (${ROLE[meta.generatedBy.role]})`, `Organiser: ${e.organizer}`]}
        seal={d.seal}
      />

      <Banner url={e.bannerUrl} className="mt-4 h-52 w-full" />

      <Section title="At a glance">
        <div className="grid grid-cols-2 gap-x-6 gap-y-1 text-xs sm:grid-cols-3 print:grid-cols-3">
          <p><b>Starts:</b> {fmtDate(e.startsAt)}</p><p><b>Ends:</b> {fmtDate(e.endsAt)}</p>
          <p><b>Status:</b> {e.status}{meta.ended ? ' (ended)' : ''}</p>
          <p><b>Venue:</b> {e.venue}</p><p><b>Format:</b> {MODE_LABEL[e.mode] || e.mode}</p><p><b>Fee:</b> {e.fee > 0 ? `₹${e.fee}` : 'Free'}</p>
          <p><b>Capacity:</b> {num(e.capacity)}</p>
          <p><b>Registration deadline:</b> {e.registrationDeadline ? fmtDate(e.registrationDeadline) : 'None set'}</p>
          <p><b>Approval:</b> {e.requiresRegistrationApproval ? 'Organiser approves each registration' : 'Automatic'}</p>
          {e.teamMax > 1 && <p><b>Team size:</b> {e.teamMin === e.teamMax ? e.teamMax : `${e.teamMin} to ${e.teamMax}`}</p>}
          {e.department && <p><b>Department:</b> {e.department}</p>}
          {e.contactEmail && <p><b>Contact:</b> {e.contactEmail}{e.contactPhone ? `, ${e.contactPhone}` : ''}</p>}
        </div>
      </Section>

      <Section title="About this event" flow><p className="whitespace-pre-line text-sm leading-relaxed text-slate-700">{e.description}</p>
        {e.eligibility && <p className="mt-2 text-xs"><b>Who can join:</b> {e.eligibility}</p>}
        {e.requirements && <p className="mt-1 text-xs"><b>Bring or prepare:</b> {e.requirements}</p>}
      </Section>

      {agenda.length > 0 && <Section title="Agenda"><List items={agenda} render={(a) => <><b>{a.time ? `${a.time} · ` : ''}{a.title}</b>{a.description && <span className="text-slate-600"> {a.description}</span>}</>} /></Section>}
      {speakers.length > 0 && <Section title="Speakers"><List items={speakers} render={(s) => <><b>{s.name}</b>{s.title && <span className="text-slate-600">, {s.title}</span>}{s.bio && <span className="block text-slate-600">{s.bio}</span>}</>} /></Section>}

      <Section title="Registration and attendance">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 print:grid-cols-4">
          <Figure label="Confirmed" value={num(n.confirmed)} sub={`of ${num(n.capacity)} seats (${pc(n.fillRate)})`} />
          <Figure label="Attended" value={num(n.present)} sub={n.attendanceRate !== null ? `${n.attendanceRate}% of confirmed` : 'Event not over yet'} />
          <Figure label="Absent" value={num(n.absent)} sub={`${num(n.notMarked)} not marked`} />
          <Figure label="Certificates" value={num(n.certificates)} sub="issued" />
        </div>
        <div className="mt-4 grid gap-6 sm:grid-cols-2 print:grid-cols-2">
          <div><h3 className="mb-2 text-xs font-bold uppercase tracking-wide text-slate-700">All registrations by status</h3><BarList rows={statuses} /></div>
          <div><h3 className="mb-2 text-xs font-bold uppercase tracking-wide text-slate-700">Registered students by department</h3><Donut rows={d.departments} /></div>
        </div>
        <h3 className="mb-1 mt-5 text-xs font-bold uppercase tracking-wide text-slate-700">When people registered</h3>
        <ColumnChart data={d.registrationTrend} series={[{ key: 'count', name: 'Registrations' }]} emptyText="No registrations yet." />
        {d.checkInByHour.length > 0 && <><h3 className="mb-1 mt-5 text-xs font-bold uppercase tracking-wide text-slate-700">Check-ins by hour</h3><ColumnChart data={d.checkInByHour} series={[{ key: 'count', name: 'Check-ins' }]} /></>}
        {n.teams && <p className="mt-3 text-xs text-slate-700"><b>Teams formed:</b> {num(n.teams.count)}{n.teams.avgSize ? ` (average ${n.teams.avgSize} members)` : ''}</p>}
      </Section>

      {(e.fee > 0 || pay.paidCount > 0) && (
        <Section title="Payments">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 print:grid-cols-4">
            <Figure label="Paid registrations" value={num(pay.paidCount)} /><Figure label="Revenue" value={rupees(pay.revenue)} />
            <Figure label="Refunded" value={rupees(pay.refunded)} /><Figure label="Unfinished payments" value={num(pay.pending)} />
          </div>
        </Section>
      )}

      <Section title="Feedback">
        {f.count === 0 ? <p className="rounded-lg bg-slate-50 p-4 text-center text-sm text-slate-400">No feedback yet.</p> : (
          <div className="grid gap-6 sm:grid-cols-2 print:grid-cols-2">
            <div><Figure label="Average rating" value={stars(f.average)} sub={`${num(f.count)} response(s)`} /><div className="mt-3"><BarList rows={f.distribution} /></div></div>
            <div>
              <h3 className="mb-2 text-xs font-bold uppercase tracking-wide text-slate-700">Comments (anonymous)</h3>
              {f.comments.length === 0 ? <p className="text-xs text-slate-500">No written comments.</p> : <List items={f.comments} render={(c) => <><b>{c.rating}/5</b> <span className="text-slate-700">{c.comment}</span></>} />}
            </div>
          </div>
        )}
      </Section>

      {faqs.length > 0 && <Section title="Questions and answers"><List items={faqs} render={(q) => <><b>{q.question}</b><span className="block text-slate-600">{q.answer}</span></>} /></Section>}

      <Section title="Compared with your earlier events" note={d.compare.pastEvents ? `Average of the ${d.compare.pastEvents} published event(s) this organiser held before this one.` : undefined}>
        {!d.compare.average ? <Empty>No earlier events to compare with.</Empty> : (
          <Table head={['', 'This event', 'Earlier average']}>
            <tr><td>Confirmed registrations</td><td>{num(n.confirmed)}</td><td>{num(d.compare.average.registrations)}</td></tr>
            <tr><td>Seats filled</td><td>{pc(n.fillRate)}</td><td>{pc(d.compare.average.fillRate)}</td></tr>
            <tr><td>Attendance rate</td><td>{pc(n.attendanceRate)}</td><td>{pc(d.compare.average.attendanceRate)}</td></tr>
            <tr><td>Average rating</td><td>{stars(f.average)}</td><td>{stars(d.compare.average.rating)}</td></tr>
          </Table>
        )}
      </Section>

      <Section title="Audience and timing">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 print:grid-cols-4">
          <Figure label="Attended" value={num(d.returning.attended)} />
          <Figure label="Came to an earlier event too" value={d.returning.hasHistory ? num(d.returning.returning) : '-'} sub={d.returning.hasHistory ? undefined : 'no earlier events'} />
          <Figure label="New to this organiser" value={d.returning.hasHistory ? num(d.returning.newcomers) : '-'} />
          <Figure label="Registered in last 24h" value={pc(d.timing.shareLast24h)} sub="before the deadline" />
        </div>
        {d.timing.total > 0 && <div className="mt-3"><BarList rows={[{ label: 'In the last 24 hours', count: d.timing.last24h }, { label: 'In the week before that', count: d.timing.earlierWeek }, { label: 'Earlier', count: d.timing.earlier }]} /></div>}
        {n.pendingCertificates !== null && <p className="mt-3 text-xs text-slate-700">Certificates: <b>{num(n.certificates)}</b> issued, <b>{num(n.pendingCertificates)}</b> attended student(s) still without one.</p>}
        {d.themes.length > 0 && <p className="mt-2 text-xs text-slate-700"><b>Words that came up in feedback:</b> {d.themes.map((w) => `${w.word} (${w.count})`).join(' · ')}</p>}
      </Section>

      {d.sponsors.length > 0 && (
        <Section title="Sponsors"><div className="flex flex-wrap items-center gap-6">{d.sponsors.map((s) => <img key={s.url} src={mediaUrl(s.url)} alt={s.title} title={s.title} className="h-10 max-w-[8rem] object-contain" />)}</div></Section>
      )}
      {d.photos.length > 0 && (
        <Section title="Photos" note={`${num(d.photoCounts.approved)} approved photo(s)${d.photoCounts.pending ? `; ${num(d.photoCounts.pending)} more waiting for approval are not shown` : ''}.`}><PhotoGrid items={d.photos} /></Section>
      )}

      <Section title="Confirmed attendees" className="report-break" note={d.attendeesTotal > d.attendees.length ? `Showing the first ${d.attendees.length} of ${d.attendeesTotal}.` : `${num(d.attendeesTotal)} student(s).`}>
        {d.attendees.length === 0 ? <p className="text-xs text-slate-500">No confirmed attendees.</p> : (
          <Table head={['#', 'Name', 'Student ID', 'Department', 'Attendance']}>
            {d.attendees.map((a, i) => <tr key={i}><td>{i + 1}</td><td className="font-medium text-slate-900">{a.name}</td><td>{a.studentId || '-'}</td><td>{a.department || '-'}</td><td>{a.attended || '-'}</td></tr>)}
          </Table>
        )}
      </Section>

      <AiInsights kind="event" d={d} />

      <p className="mt-6 border-t border-slate-200 pt-2 text-[11px] text-slate-500">Figures come from the live UniEvents database at {fmtDate(meta.generatedAt)}. Feedback comments are shown without names.</p>
    </article>
  );
}
