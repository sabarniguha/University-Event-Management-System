import { BarList, ColumnChart, Empty, Figure, Section, SubHead, Table, num, pc, rupees, stars } from './ReportParts.jsx';

const hrs = (h) => (h === null || h === undefined ? '-' : h < 48 ? `${h} h` : `${Math.round((h / 24) * 10) / 10} days`);

// Admin and organiser: the deeper analysis pages. Every figure comes from the records; empty parts say so instead of guessing.
export default function ReportInsights({ d, isAdmin }) {
  const i = d.insights;
  if (!i) return null;
  const platform = isAdmin && d.meta.scope === 'platform';
  const t = i.timing;
  const cert = i.certificates;

  return (
    <>
      <Section title="Students by department" note="Confirmed registrations. Attendance rate counts events that have ended.">
        {i.departments.length === 0 ? <Empty>No registrations in this period.</Empty> : (
          <Table head={['Department', 'Students', 'Registrations', 'Attended', 'Att. %']}>{i.departments.map((r) => <tr key={r.label}><td className="font-medium text-slate-900">{r.label}</td><td>{num(r.students)}</td><td>{num(r.registrations)}</td><td>{num(r.attended)}</td><td>{pc(r.attendanceRate)}</td></tr>)}</Table>
        )}
      </Section>

      <Section title="Cancellations and no-shows" note="Cancelled means the student gave up their seat. A no-show is a confirmed student who was not marked present at an event that has ended.">
        {i.dropOff.length === 0 ? <Empty>No events in this period.</Empty> : (
          <Table head={['Category', 'Confirmed', 'Cancelled', 'Cancel %', 'No-shows', 'No-show %']}>{i.dropOff.map((r) => <tr key={r.label}><td className="font-medium text-slate-900">{r.label}</td><td>{num(r.registered)}</td><td>{num(r.cancelled)}</td><td>{pc(r.cancelRate)}</td><td>{num(r.noShows)}</td><td>{pc(r.noShowRate)}</td></tr>)}</Table>
        )}
        <div className="report-block mt-4 grid gap-5 sm:grid-cols-2 print:grid-cols-2">
          <div><SubHead>Most cancellations</SubHead>{i.mostCancelled.length ? <BarList rows={i.mostCancelled.map((e) => ({ label: e.title, count: e.cancelled }))} /> : <Empty>None.</Empty>}</div>
          <div><SubHead>Most no-shows</SubHead>{i.mostNoShows.length ? <BarList rows={i.mostNoShows.map((e) => ({ label: `${e.title} (${pc(e.noShowRate)})`, count: e.noShows }))} /> : <Empty>None.</Empty>}</div>
        </div>
      </Section>

      <Section title="Demand: full events and waitlists" note="An event counts as full at 90% of seats or more.">
        <div className="grid grid-cols-3 gap-3 print:grid-cols-3">
          <Figure label="Full events" value={num(i.demand.fullEvents)} />
          <Figure label="On waitlists" value={num(i.demand.waitlisted)} sub="students waiting for a seat" />
          <Figure label="Under 30% full" value={num(i.demand.lowFill)} sub="events that have ended" />
        </div>
        {i.demand.list.length > 0 && (
          <div className="mt-3"><Table head={['Event', 'Seats', 'Registered', 'Fill %', 'Waitlisted']}>{i.demand.list.map((e) => <tr key={e.id}><td className="font-medium text-slate-900">{e.title}</td><td>{num(e.capacity)}</td><td>{num(e.registered)}</td><td>{pc(e.fillRate)}</td><td>{num(e.waitlisted)}</td></tr>)}</Table></div>
        )}
      </Section>

      <Section title="Busiest days and times" note="By when each event started (local time). Registrations are confirmed registrations for those events.">
        <ColumnChart data={i.peak.weekdays} series={[{ key: 'registrations', name: 'Registrations' }, { key: 'events', name: 'Events' }]} emptyText="No events in this period." />
        <div className="mt-3"><BarList rows={i.peak.parts.map((p) => ({ label: `${p.label} - ${num(p.events)} event(s)`, count: p.registrations }))} unit=" registrations" unitOne=" registration" empty="No events in this period." /></div>
      </Section>

      <Section title="Returning students" note="Students who attended two or more events in this period.">
        <div className="grid grid-cols-3 gap-3 print:grid-cols-3">
          <Figure label="Students who attended" value={num(i.returning.attendees)} />
          <Figure label="Came back" value={num(i.returning.returning)} sub="attended 2 or more events" />
          <Figure label="Share" value={pc(i.returning.share)} />
        </div>
        {i.returning.top.length > 0 && <div className="mt-3"><Table head={['Student', 'ID', 'Department', 'Events attended']}>{i.returning.top.map((s) => <tr key={`${s.studentId}-${s.name}`}><td className="font-medium text-slate-900">{s.name}</td><td>{s.studentId || '-'}</td><td>{s.department || '-'}</td><td>{num(s.events)}</td></tr>)}</Table></div>}
      </Section>

      <Section title="When students registered" note="Compared with each event's registration deadline (or its start time when it has none).">
        {t.total === 0 ? <Empty>No confirmed registrations.</Empty> : (
          <>
            <BarList rows={[{ label: 'In the last 24 hours', count: t.last24h }, { label: 'In the week before that', count: t.earlierWeek }, { label: 'Earlier', count: t.earlier }]} />
            <p className="mt-2 text-xs text-slate-600">{pc(t.shareLast24h)} of registrations arrived in the final 24 hours.</p>
          </>
        )}
      </Section>

      <Section title="What students said" note={`${num(i.feedback.comments)} written comment(s). A word is listed only if at least two comments use it.`}>
        {i.feedback.themes.length > 0 ? <p className="text-xs text-slate-700">{i.feedback.themes.map((w) => `${w.word} (${w.count})`).join(' · ')}</p> : <Empty>Not enough comments to find common words.</Empty>}
        {i.feedback.lowest.length > 0 && (
          <div className="mt-3">
            <SubHead>Lowest rated events</SubHead>
            <p className="mb-1 text-[11px] text-slate-500">Events with at least 3 ratings. The reasons are the comments left with a rating of 3 or less.</p>
            <ul className="space-y-2 text-xs">{i.feedback.lowest.map((e) => (
              <li key={e.id} className="report-block"><b>{e.title}</b> - {stars(e.rating)} from {num(e.ratingCount)} response(s)
                {e.reasons.length > 0 && <ul className="mt-0.5 list-disc pl-4 text-slate-600">{e.reasons.map((r) => <li key={r}>{r}</li>)}</ul>}
              </li>))}</ul>
          </div>
        )}
      </Section>

      <Section title="Certificates" note="For events that have ended.">
        <div className="grid grid-cols-3 gap-3 print:grid-cols-3">
          <Figure label="Attended" value={num(cert.attended)} />
          <Figure label="Certificates issued" value={num(cert.issued)} />
          <Figure label="Still to issue" value={num(cert.pending)} sub={cert.rate !== null ? `${cert.rate}% issued` : undefined} />
        </div>
      </Section>

      {platform && i.money.length > 0 && (
        <Section title="Revenue and refunds by organiser" note="Paid registrations and refunds for events in this period.">
          <Table head={['Organiser', 'Paid events', 'Revenue', 'Refunded', 'Net']}>{i.money.map((o) => <tr key={o.id}><td className="font-medium text-slate-900">{o.name}</td><td>{num(o.paidEvents)}</td><td>{rupees(o.revenue)}</td><td>{rupees(o.refunded)}</td><td>{rupees(o.net)}</td></tr>)}</Table>
        </Section>
      )}

      {isAdmin && i.approvals && (
        <Section title="Event approvals" note="Time from an organiser submitting an event to the admin's decision, for events decided in this period.">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 print:grid-cols-4">
            <Figure label="Decided" value={num(i.approvals.reviewed)} />
            <Figure label="Average wait" value={hrs(i.approvals.avgHours)} />
            <Figure label="Median wait" value={hrs(i.approvals.medianHours)} />
            <Figure label="Waiting now" value={num(i.approvals.pendingNow)} sub="not decided yet" />
          </div>
        </Section>
      )}

      {isAdmin && i.dormant && (
        <Section title="Student accounts that are not being used" note="As of today, not tied to the period. Active accounts only.">
          <div className="grid grid-cols-2 gap-3 print:grid-cols-2">
            <Figure label="Not signed in for 90 days" value={num(i.dormant.inactive90Days)} />
            <Figure label="Never signed in" value={num(i.dormant.neverSignedIn)} />
          </div>
        </Section>
      )}
    </>
  );
}

// The same data as plain tables, for the Download CSV button.
export function summaryCsvBlocks(d, isAdmin) {
  const i = d.insights || {};
  const platform = isAdmin && d.meta.scope === 'platform';
  const blocks = [
    { title: `UniEvents report - ${d.meta.period.label}`, head: ['Report ID'], rows: d.seal?.code ? [[d.seal.code]] : [] },
    { title: 'Events', head: ['Date', 'Event', 'Category', 'Organiser', 'Seats', 'Registered', 'Waitlisted', 'Cancelled', 'Attended', 'Attendance %', 'Fill %', 'Rating', 'Revenue (INR)', 'Refunded (INR)', 'Certificates', 'Photos'],
      rows: d.events.map((e) => [new Date(e.startsAt).toISOString().slice(0, 10), e.title, e.category, e.organizer || '', e.capacity, e.registered, e.waitlisted, e.cancelled, e.attended, e.attendanceRate ?? '', e.fillRate ?? '', e.rating ?? '', e.revenue, e.refunded, e.certificates, e.photos ?? 0]) },
    { title: 'Students by department', head: ['Department', 'Students', 'Registrations', 'Attended', 'Attendance %'], rows: (i.departments || []).map((r) => [r.label, r.students, r.registrations, r.attended, r.attendanceRate ?? '']) },
    { title: 'Cancellations and no-shows by category', head: ['Category', 'Confirmed', 'Cancelled', 'Cancel %', 'No-shows', 'No-show %'], rows: (i.dropOff || []).map((r) => [r.label, r.registered, r.cancelled, r.cancelRate ?? '', r.noShows, r.noShowRate ?? '']) },
    { title: 'Full events and waitlists', head: ['Event', 'Seats', 'Registered', 'Fill %', 'Waitlisted'], rows: (i.demand?.list || []).map((e) => [e.title, e.capacity, e.registered, e.fillRate ?? '', e.waitlisted]) },
    { title: 'Registrations by weekday', head: ['Day', 'Events', 'Registrations'], rows: (i.peak?.weekdays || []).map((w) => [w.label, w.events, w.registrations]) },
    { title: 'Returning students', head: ['Student', 'ID', 'Department', 'Events attended'], rows: (i.returning?.top || []).map((s) => [s.name, s.studentId || '', s.department || '', s.events]) },
    { title: 'Common words in feedback', head: ['Word', 'Comments'], rows: (i.feedback?.themes || []).map((w) => [w.word, w.count]) },
  ];
  if (platform) {
    blocks.push({ title: 'Organisers', head: ['Organiser', 'Events', 'Registrations', 'Attended', 'Attendance %', 'Average rating', 'Revenue (INR)'], rows: (d.organisers || []).map((o) => [o.name, o.events, o.registrations, o.attended, o.attendanceRate ?? '', o.avgRating ?? '', o.revenue]) });
    blocks.push({ title: 'Revenue and refunds by organiser', head: ['Organiser', 'Paid events', 'Revenue (INR)', 'Refunded (INR)', 'Net (INR)'], rows: (i.money || []).map((o) => [o.name, o.paidEvents, o.revenue, o.refunded, o.net]) });
  }
  return blocks;
}
