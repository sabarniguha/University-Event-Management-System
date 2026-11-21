import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Printer } from 'lucide-react';
import useFetch from '../../hooks/useFetch.js';
import { useAuth } from '../../context/AuthContext.jsx';
import { ErrorBox, Loader, PageHeader } from '../../components/common/Ui.jsx';
import PhotoGrid from '../../components/reports/PhotoGrid.jsx';
import usePrintPage from '../../components/reports/usePrintPage.js';
import { Banner, BarList, ColumnChart, Cover, Donut, Figure, Section, Table, num, pc, rupees, stars } from '../../components/reports/ReportParts.jsx';
import { MODE_LABEL, fmtDay, fmtDate } from '../../utils/format.js';

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const ROLE = { ADMIN: 'Admin', ORGANIZER: 'Organiser' };

// A plain-English summary written only from the numbers; nothing is claimed that the data does not show.
function story(d) {
  const { kpis: k, meta, previous: p } = d;
  const label = meta.period.label;
  if (k.events === 0) return `No published events started in ${label}.`;
  const bits = [`In ${label}, ${num(k.events)} event${k.events === 1 ? ' was' : 's were'} held with ${num(k.registrations)} confirmed registration${k.registrations === 1 ? '' : 's'} from ${num(k.uniqueStudents)} student${k.uniqueStudents === 1 ? '' : 's'}.`];
  if (k.attendanceRate !== null) bits.push(`Attendance was ${k.attendanceRate}% across the events that have ended (${num(k.attended)} attended, ${num(k.noShows)} did not show).`);
  else bits.push('None of these events has ended yet, so attendance is not available.');
  if (k.revenue > 0) bits.push(`Paid registrations brought in ${rupees(k.revenue)}${k.refunded > 0 ? `, with ${rupees(k.refunded)} refunded` : ''}.`);
  if (k.avgRating !== null) bits.push(`Students rated the events ${k.avgRating} out of 5 on average (${num(k.feedbackCount)} response${k.feedbackCount === 1 ? '' : 's'}).`);
  if (p.registrations.change !== null) bits.push(`Registrations ${p.registrations.change >= 0 ? 'rose' : 'fell'} ${Math.abs(p.registrations.change)}% compared with ${meta.previousLabel}.`);
  return bits.join(' ');
}

export default function ReportsPage() {
  const { user } = useAuth();
  const isAdmin = user.role === 'ADMIN';
  const now = new Date();
  const [type, setType] = useState('month');
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [organizerId, setOrganizerId] = useState('');
  const [details, setDetails] = useState(true);

  const params = useMemo(() => ({ type, year, month, ...(isAdmin && organizerId ? { organizerId } : {}), details: details ? '1' : '0' }), [type, year, month, organizerId, details, isAdmin]);
  const { data: d, loading, error } = useFetch('/reports/summary', params);
  const fileName = `UniEvents-${isAdmin ? 'Platform' : 'Organiser'}-Report-${type === 'year' ? year : `${year}-${String(month).padStart(2, '0')}`}`;
  const print = usePrintPage(fileName);
  const years = Array.from({ length: 6 }, (_, i) => now.getFullYear() - i);

  const toolbar = (
    <div className="card flex flex-wrap items-end gap-3 print:hidden">
      <div><label className="label" htmlFor="rp-type">Report</label><select id="rp-type" className="input" value={type} onChange={(e) => setType(e.target.value)}><option value="month">Monthly</option><option value="year">Yearly</option></select></div>
      {type === 'month' && <div><label className="label" htmlFor="rp-m">Month</label><select id="rp-m" className="input" value={month} onChange={(e) => setMonth(Number(e.target.value))}>{MONTHS.map((m, i) => <option key={m} value={i + 1}>{m}</option>)}</select></div>}
      <div><label className="label" htmlFor="rp-y">Year</label><select id="rp-y" className="input" value={year} onChange={(e) => setYear(Number(e.target.value))}>{years.map((y) => <option key={y}>{y}</option>)}</select></div>
      {isAdmin && d?.organiserOptions && (
        <div><label className="label" htmlFor="rp-o">Organiser</label>
          <select id="rp-o" className="input" value={organizerId} onChange={(e) => setOrganizerId(e.target.value)}><option value="">All (whole platform)</option>{d.organiserOptions.map((o) => <option key={o.id} value={o.id}>{o.name}</option>)}</select>
        </div>
      )}
      <label className="flex items-center gap-2 pb-2 text-sm"><input type="checkbox" checked={details} onChange={(e) => setDetails(e.target.checked)} /> Include event descriptions</label>
      <button className="btn-primary ml-auto" onClick={print} disabled={!d}><Printer className="h-4 w-4" /> Download PDF</button>
      <p className="basis-full text-xs text-slate-500">Click Download PDF, then choose <b>Save as PDF</b> as the destination in the print window.</p>
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="print:hidden"><PageHeader title="Reports" subtitle={isAdmin ? 'Monthly and yearly reports for the whole platform, or for one organiser.' : 'Monthly and yearly reports for your events.'} /></div>
      {toolbar}
      <ErrorBox message={error} />
      {loading && !d ? <Loader /> : d && <Document d={d} isAdmin={isAdmin} />}
    </div>
  );
}

function Document({ d, isAdmin }) {
  const { kpis: k, meta, previous: p } = d;
  const yearly = meta.period.type === 'year';
  const ch = (key) => p[key]?.change;
  const scopeLine = meta.scope === 'platform' ? 'Platform-wide report' : `Organiser: ${meta.organiserName}`;
  const showOrganiser = isAdmin && meta.scope === 'platform';
  const detailed = d.events.filter((e) => e.detail);

  return (
    <article className="report-doc card mx-auto w-full max-w-[210mm] bg-white p-6 sm:p-8">
      <Cover
        kicker={yearly ? 'Annual event report' : 'Monthly event report'}
        title={meta.period.label}
        subtitle={scopeLine}
        lines={[`Generated ${fmtDate(meta.generatedAt)}`, `By ${meta.generatedBy.name} (${ROLE[meta.generatedBy.role]})`, `Times shown in ${meta.timezone}`]}
      />

      <Section title="Summary">
        <p className="text-sm leading-relaxed text-slate-700">{story(d)}</p>
        {meta.truncated && <p className="mt-2 rounded bg-amber-50 p-2 text-xs text-amber-800">This period has more than 1,000 events, so only the first 1,000 are included.</p>}
      </Section>

      <Section title="Key figures" note={`Percentages in green or red compare with ${meta.previousLabel}.`}>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 print:grid-cols-4">
          <Figure label="Events held" value={num(k.events)} change={ch('events')} sub={`${k.paidEvents} paid, ${k.freeEvents} free`} />
          <Figure label="Confirmed registrations" value={num(k.registrations)} change={ch('registrations')} sub={`${num(k.waitlisted)} waitlisted`} />
          <Figure label="Unique students" value={num(k.uniqueStudents)} change={ch('uniqueStudents')} />
          <Figure label="Attendance rate" value={pc(k.attendanceRate)} sub={`${num(k.attended)} attended, ${num(k.noShows)} no-shows`} />
          <Figure label="Average seats filled" value={pc(k.avgFillRate)} />
          <Figure label="Revenue" value={rupees(k.revenue)} change={ch('revenue')} sub={k.refunded > 0 ? `${rupees(k.refunded)} refunded` : undefined} />
          <Figure label="Average rating" value={stars(k.avgRating)} sub={`${num(k.feedbackCount)} response(s)`} />
          <Figure label="Certificates issued" value={num(k.certificates)} />
        </div>
      </Section>

      <Section title={yearly ? 'Month by month' : 'Day by day'} note="Registrations and attendance are counted on the day or month the event started.">
        <ColumnChart data={d.timeline} series={[{ key: 'registrations', name: 'Confirmed registrations' }, { key: 'attended', name: 'Attended' }]} />
        {yearly && (
          <Table head={['Month', 'Events', 'Registrations', 'Attended', 'Revenue']} className="mt-3">
            {d.timeline.map((t) => <tr key={t.label}><td>{t.label}</td><td>{num(t.events)}</td><td>{num(t.registrations)}</td><td>{num(t.attended)}</td><td>{rupees(t.revenue)}</td></tr>)}
          </Table>
        )}
      </Section>

      <div className="report-block mt-7 grid gap-6 sm:grid-cols-2 print:grid-cols-2">
        <div><h3 className="mb-2 border-b-2 border-brand-600 pb-1 text-sm font-bold uppercase tracking-wide">Events by category</h3><BarList rows={d.byCategory.map((r) => ({ label: r.label, count: r.events }))} unit=" events" unitOne=" event" /></div>
        <div><h3 className="mb-2 border-b-2 border-brand-600 pb-1 text-sm font-bold uppercase tracking-wide">Registrations by category</h3><BarList rows={d.byCategory.map((r) => ({ label: r.label, count: r.registrations }))} /></div>
        <div><h3 className="mb-2 border-b-2 border-brand-600 pb-1 text-sm font-bold uppercase tracking-wide">Student departments</h3><Donut rows={d.departments} /></div>
        <div><h3 className="mb-2 border-b-2 border-brand-600 pb-1 text-sm font-bold uppercase tracking-wide">Format of events</h3><Donut rows={d.byMode.map((r) => ({ label: MODE_LABEL[r.label] || r.label, count: r.events }))} /></div>
      </div>

      {d.topEvents.length > 0 && (
        <Section title="Most popular events" note="Ranked by confirmed registrations.">
          <div className="space-y-3">
            {d.topEvents.map((e, i) => (
              <div key={e.id} className="report-block flex gap-3 rounded-xl border border-slate-200 p-2">
                <Banner url={e.bannerUrl} className="h-20 w-32 shrink-0" />
                <div className="min-w-0 flex-1 text-xs">
                  <p className="font-bold text-slate-900">{i + 1}. {e.title}</p>
                  <p className="text-slate-500">{fmtDay(e.startsAt)} &middot; {e.venue} &middot; {e.category}{showOrganiser && e.organizer ? ` · ${e.organizer}` : ''}</p>
                  <p className="mt-1 text-slate-700"><b>{num(e.registered)}</b> of {num(e.capacity)} seats ({pc(e.fillRate)}) &middot; attendance {pc(e.attendanceRate)} &middot; rating {stars(e.rating)} &middot; revenue {rupees(e.revenue)}</p>
                </div>
              </div>
            ))}
          </div>
        </Section>
      )}

      {d.bestRated.length > 0 && (
        <Section title="Best rated events" note="Based on student feedback.">
          <Table head={['Event', 'Rating', 'Responses']}>{d.bestRated.map((e) => <tr key={e.id}><td>{e.title}</td><td>{stars(e.rating)}</td><td>{num(e.ratingCount)}</td></tr>)}</Table>
        </Section>
      )}

      <Section title="All events" note={`${num(d.events.length)} published event(s) that started in ${meta.period.label}.`}>
        {d.events.length === 0 ? <p className="rounded-lg bg-slate-50 p-4 text-center text-sm text-slate-400">No events in this period.</p> : (
          <Table head={['Date', 'Event', 'Category', ...(showOrganiser ? ['Organiser'] : []), 'Seats', 'Reg.', 'Wait', 'Att.', 'Att. %', 'Rating', 'Revenue']}>
            {d.events.map((e) => (
              <tr key={e.id}><td className="whitespace-nowrap">{new Date(e.startsAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}</td><td className="font-medium text-slate-900">{e.title}</td><td>{e.category}</td>{showOrganiser && <td>{e.organizer}</td>}
                <td>{num(e.capacity)}</td><td>{num(e.registered)}</td><td>{num(e.waitlisted)}</td><td>{num(e.attended)}</td><td>{pc(e.attendanceRate)}</td><td>{e.rating ?? '-'}</td><td>{e.revenue > 0 ? rupees(e.revenue) : e.fee > 0 ? '₹0' : 'Free'}</td></tr>
            ))}
          </Table>
        )}
      </Section>

      {showOrganiser && d.organisers?.length > 0 && (
        <Section title="Organiser performance">
          <Table head={['Organiser', 'Events', 'Registrations', 'Attended', 'Att. %', 'Avg rating', 'Revenue']}>
            {d.organisers.map((o) => <tr key={o.id}><td className="font-medium text-slate-900">{o.name}</td><td>{num(o.events)}</td><td>{num(o.registrations)}</td><td>{num(o.attended)}</td><td>{pc(o.attendanceRate)}</td><td>{o.avgRating ?? '-'}</td><td>{rupees(o.revenue)}</td></tr>)}
          </Table>
        </Section>
      )}

      {isAdmin && d.platform && (
        <Section title="Platform users" note="Accounts, whole platform.">
          <Table head={['', 'Students', 'Organisers', 'Admins']}>
            <tr><td>New accounts in {meta.period.label}</td><td>{num(d.platform.newUsers.STUDENT || 0)}</td><td>{num(d.platform.newUsers.ORGANIZER || 0)}</td><td>{num(d.platform.newUsers.ADMIN || 0)}</td></tr>
            <tr><td>Active accounts today</td><td>{num(d.platform.activeUsers.STUDENT || 0)}</td><td>{num(d.platform.activeUsers.ORGANIZER || 0)}</td><td>{num(d.platform.activeUsers.ADMIN || 0)}</td></tr>
          </Table>
        </Section>
      )}

      {d.gallery?.items.length > 0 && (
        <Section title="Event photos" note={`${num(d.gallery.total)} approved photo(s) from these events, ${num(d.gallery.byStudents)} added by students. Up to three per event are shown.`}>
          <PhotoGrid items={d.gallery.items} />
        </Section>
      )}

      <Section title="Event pipeline" note="All events that start in this period, whatever their status.">
        <Table head={['Published', 'Pending approval', 'Draft', 'Rejected', 'Cancelled']}>
          <tr>{['PUBLISHED', 'PENDING_APPROVAL', 'DRAFT', 'REJECTED', 'CANCELLED'].map((s) => <td key={s}>{num(d.pipeline[s] || 0)}</td>)}</tr>
        </Table>
      </Section>

      {detailed.length > 0 && (
        <Section title="Event details" className="report-break" note={d.meta.detailLimit && d.events.length > d.meta.detailLimit ? `Showing the first ${d.meta.detailLimit} of ${d.events.length} events.` : undefined}>
          <div className="space-y-4">
            {detailed.map((e) => (
              <div key={e.id} className="report-block rounded-xl border border-slate-200 p-3">
                <div className="flex gap-3">
                  <Banner url={e.bannerUrl} className="h-24 w-40 shrink-0" />
                  <div className="min-w-0 text-xs">
                    <p className="text-sm font-bold text-slate-900">{e.title}</p>
                    <p className="text-slate-500">{fmtDate(e.startsAt)} to {fmtDate(e.endsAt)}</p>
                    <p className="text-slate-500">{e.venue} &middot; {MODE_LABEL[e.mode] || e.mode} &middot; {e.category}{e.eventType ? ` · ${e.eventType}` : ''}{showOrganiser && e.organizer ? ` · by ${e.organizer}` : ''}</p>
                    <p className="mt-1 text-slate-800"><b>{num(e.registered)}</b> registered of {num(e.capacity)} &middot; {num(e.attended)} attended &middot; {e.fee > 0 ? `₹${e.fee} fee` : 'Free'}</p>
                  </div>
                </div>
                <p className="mt-2 whitespace-pre-line text-xs leading-relaxed text-slate-700">{e.detail.description}</p>
                {e.detail.eligibility && <p className="mt-1 text-xs text-slate-600"><b>Who can join:</b> {e.detail.eligibility}</p>}
                {e.detail.requirements && <p className="mt-1 text-xs text-slate-600"><b>Bring or prepare:</b> {e.detail.requirements}</p>}
                <p className="mt-2 text-right text-[11px]"><Link to={`${isAdmin ? '/admin' : '/organizer'}/reports/event/${e.id}`} className="text-brand-600 underline print:hidden">Open full event report</Link></p>
              </div>
            ))}
          </div>
        </Section>
      )}

      <Section title="How these numbers are worked out" className="text-[11px] text-slate-500">
        <ul className="list-disc space-y-0.5 pl-4">
          <li>Only <b>published</b> events that <b>start</b> within the period are counted. Months and days are cut at midnight {meta.timezone}.</li>
          <li><b>Registrations</b> are confirmed seats. Waitlisted, pending, rejected and cancelled registrations are not counted as attendees.</li>
          <li><b>Attendance rate</b> is students marked present divided by confirmed registrations, for events that have already ended.</li>
          <li><b>Revenue</b> is the sum of successful online payments; refunded payments are shown separately and are not counted as revenue.</li>
          <li><b>Ratings</b> are the average of the 1 to 5 star feedback students gave. A dash means there is nothing to calculate yet.</li>
          <li>All figures come from the live UniEvents database at the time of generation. Nothing is estimated.</li>
        </ul>
      </Section>
    </article>
  );
}
