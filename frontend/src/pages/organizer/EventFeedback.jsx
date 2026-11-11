import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import api from '../../services/api.js';
import DashboardShell, { StatCard } from '../../components/DashboardShell.jsx';
import BarChart from '../../components/BarChart.jsx';
import StarRating from '../../components/StarRating.jsx';
import { EmptyState, ErrorBox, Loader } from '../../components/Ui.jsx';
import { errMsg, fmtDate } from '../../utils/format.js';

export default function EventFeedback() {
  const { id } = useParams();
  const [data, setData] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    api
      .get(`/feedback/event/${id}`)
      .then((res) => setData(res.data))
      .catch((e) => setError(errMsg(e)));
  }, [id]);

  if (!data) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-12">
        {error ? <ErrorBox message={error} /> : <Loader />}
        <Link to="/organizer" className="mt-4 inline-block text-sm text-brand-600 hover:underline">← Back to dashboard</Link>
      </div>
    );
  }

  const { event, summary, feedback } = data;

  return (
    <DashboardShell
      title={`Feedback: ${event.title}`}
      subtitle="Ratings and comments from students who attended"
      actions={<Link to={`/organizer/events/${id}/attendance`} className="btn-outline">Attendance</Link>}
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <StatCard label="Responses" value={summary.count} />
        <div className="card">
          <p className="text-sm text-slate-500">Average rating</p>
          <div className="mt-1 flex items-center gap-3">
            <span className="text-3xl font-bold text-slate-900">{summary.average ?? '–'}</span>
            {summary.average !== null && <StarRating value={summary.average} />}
          </div>
        </div>
      </div>

      <BarChart
        title="Rating distribution"
        data={[5, 4, 3, 2, 1].map((n) => ({ label: `${n} star${n === 1 ? '' : 's'}`, count: summary.distribution.find((d) => d.rating === n).count }))}
        emptyText="No ratings yet."
      />

      {feedback.length === 0 ? (
        <EmptyState>No feedback has been submitted yet.</EmptyState>
      ) : (
        <ul className="space-y-3">
          {feedback.map((f) => (
            <li key={f.id} className="card">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <span className="font-medium">{f.user.name}</span>
                  {f.user.department && <span className="ml-2 text-xs text-slate-400">{f.user.department}</span>}
                </div>
                <StarRating value={f.rating} size="text-base" />
              </div>
              {f.comment && <p className="mt-2 whitespace-pre-line text-sm text-slate-600">{f.comment}</p>}
              <p className="mt-2 text-xs text-slate-400">{fmtDate(f.createdAt)}</p>
            </li>
          ))}
        </ul>
      )}
    </DashboardShell>
  );
}
