import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../../services/api.js';
import DashboardShell, { StatCard } from '../../components/DashboardShell.jsx';
import StarRating from '../../components/StarRating.jsx';
import { Badge, EmptyState, ErrorBox, Loader, SuccessBox } from '../../components/Ui.jsx';
import { errMsg, fmtDate, pctLabel } from '../../utils/format.js';

function FeedbackForm({ eventId, initial, onDone, onError }) {
  const [rating, setRating] = useState(initial?.rating || 0);
  const [comment, setComment] = useState(initial?.comment || '');
  const [busy, setBusy] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    if (!rating) return onError('Please choose a star rating first.');
    setBusy(true);
    try {
      await api.post(`/feedback/${eventId}`, { rating, comment });
      onDone('Thanks for your feedback!');
    } catch (err) {
      onError(errMsg(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <form onSubmit={submit} className="space-y-3 bg-slate-50 px-4 py-4">
      <StarRating value={rating} onChange={setRating} size="text-2xl" />
      <textarea
        className="input"
        rows={2}
        maxLength={1000}
        placeholder="What did you think? (optional)"
        value={comment}
        onChange={(e) => setComment(e.target.value)}
      />
      <div className="flex gap-2">
        <button className="btn-primary btn-sm" disabled={busy}>{busy ? 'Saving...' : 'Submit feedback'}</button>
        <button type="button" className="btn-outline btn-sm" onClick={() => onDone('')}>Close</button>
      </div>
    </form>
  );
}

export default function StudentAttendance() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [openFeedback, setOpenFeedback] = useState(null);

  const load = useCallback(() => {
    return api
      .get('/attendance/me')
      .then((res) => setData(res.data))
      .catch((e) => setError(errMsg(e)))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(); }, [load]);

  const statusCell = (r) => {
    if (r.attendance) return <Badge>{r.attendance.status}</Badge>;
    return r.hasEnded ? <Badge tone="gray">NOT MARKED</Badge> : <Badge tone="blue">UPCOMING</Badge>;
  };

  return (
    <DashboardShell
      title="My attendance"
      subtitle="Your attendance record for every event you registered for"
      actions={<Link to="/student/tickets" className="btn-primary">My tickets</Link>}
    >
      <ErrorBox message={error} />
      <SuccessBox message={message} />

      {loading || !data ? (
        <Loader />
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard label="Attendance rate (past events)" value={pctLabel(data.summary.rate)} />
            <StatCard label="Events attended" value={data.summary.attended} />
            <StatCard label="Events missed" value={data.summary.missed} />
            <StatCard label="Upcoming" value={data.summary.upcoming} />
          </div>

          {data.records.length === 0 ? (
            <EmptyState>
              Nothing here yet. <Link to="/events" className="font-medium text-brand-600 hover:underline">Register for an event</Link> to start building your record.
            </EmptyState>
          ) : (
            <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
              <table className="min-w-full divide-y divide-slate-200">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="th">Event</th>
                    <th className="th">Date</th>
                    <th className="th">Attendance</th>
                    <th className="th">Checked in</th>
                    <th className="th">Rating</th>
                    <th className="th" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {data.records.map((r) => {
                    const present = r.attendance?.status === 'PRESENT';
                    return (
                      <FragmentRow key={r.id}>
                        <tr>
                          <td className="td">
                            <Link to={`/events/${r.event.id}`} className="font-medium text-brand-700 hover:underline">{r.event.title}</Link>
                            <div className="text-xs text-slate-400">{r.event.venue}</div>
                          </td>
                          <td className="td">{fmtDate(r.event.startsAt)}</td>
                          <td className="td">{statusCell(r)}</td>
                          <td className="td">
                            {r.attendance?.checkedInAt ? (
                              <>
                                <div>{fmtDate(r.attendance.checkedInAt)}</div>
                                <div className="mt-0.5"><Badge>{r.attendance.method}</Badge></div>
                              </>
                            ) : '–'}
                          </td>
                          <td className="td">{r.feedback ? <StarRating value={r.feedback.rating} size="text-base" /> : '–'}</td>
                          <td className="td text-right">
                            {present && (
                              <div className="flex justify-end gap-2">
                                {r.certificateId && <Link to={`/student/certificates/${r.certificateId}`} className="btn-outline btn-sm">Certificate</Link>}
                                <button className="btn-outline btn-sm" onClick={() => setOpenFeedback(openFeedback === r.id ? null : r.id)}>
                                  {r.feedback ? 'Edit rating' : 'Rate event'}
                                </button>
                              </div>
                            )}
                          </td>
                        </tr>
                        {openFeedback === r.id && (
                          <tr>
                            <td colSpan={6} className="p-0">
                              <FeedbackForm
                                eventId={r.event.id}
                                initial={r.feedback}
                                onError={(m) => { setError(m); setMessage(''); }}
                                onDone={async (m) => { setOpenFeedback(null); setError(''); setMessage(m); await load(); }}
                              />
                            </td>
                          </tr>
                        )}
                      </FragmentRow>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </DashboardShell>
  );
}

// A table body can hold several rows per record; this keeps keys simple.
function FragmentRow({ children }) {
  return <>{children}</>;
}
