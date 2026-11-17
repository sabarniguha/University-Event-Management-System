import { Lock, Medal, Trophy } from 'lucide-react';
import useFetch from '../../hooks/useFetch.js';
import DashboardShell, { StatCard } from '../../components/DashboardShell.jsx';
import { Badge, EmptyState, ErrorBox, Loader } from '../../components/common/Ui.jsx';

// Points, badges and the leaderboard. Everything is calculated from real attendance, feedback and team records.
export default function Rewards() {
  const me = useFetch('/rewards/me');
  const board = useFetch('/rewards/leaderboard');
  const d = me.data;
  const rules = d?.rules;

  return (
    <DashboardShell title="Points and badges" subtitle="Earn points by taking part in campus events.">
      <ErrorBox message={me.error || board.error} />
      {me.loading && !d ? <Loader /> : d && (
        <>
          <div className="grid gap-4 sm:grid-cols-3">
            <StatCard label="Your points" value={d.points} icon={Trophy} />
            <StatCard label="Level" value={d.level} icon={Medal} />
            <StatCard label="Your rank" value={d.rank ? `#${d.rank}` : 'Not ranked yet'} />
          </div>
          <p className="text-sm text-slate-500">{rules.attended} points for each event you attend, {rules.feedback} for each feedback you give, {rules.team} for joining a team. Levels: Bronze 10, Silver 60, Gold 150 points.</p>

          <div className="card">
            <h2 className="mb-3 font-semibold text-slate-900">Badges</h2>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {d.badges.map((b) => (
                <div key={b.key} className={`flex items-start gap-3 rounded-xl border p-3 ${b.earned ? 'border-amber-300 bg-amber-50' : 'border-slate-200 opacity-70'}`}>
                  <span className={`mt-0.5 rounded-full p-2 ${b.earned ? 'bg-amber-400 text-white' : 'bg-slate-200 text-slate-500'}`}>{b.earned ? <Medal className="h-4 w-4" /> : <Lock className="h-4 w-4" />}</span>
                  <div><p className="font-medium text-slate-900">{b.name}</p><p className="text-xs text-slate-500">{b.description}</p></div>
                </div>
              ))}
            </div>
          </div>
        </>
      )}

      <div className="card">
        <h2 className="mb-3 font-semibold text-slate-900">Leaderboard</h2>
        {board.loading && !board.data ? <Loader /> : (board.data?.leaderboard || []).length === 0 ? (
          <EmptyState icon={Trophy} title="No one is on the board yet">Attend an event to be the first.</EmptyState>
        ) : (
          <ol className="divide-y divide-slate-100">
            {board.data.leaderboard.map((r) => (
              <li key={r.rank} className={`flex items-center gap-3 py-2.5 text-sm ${r.isMe ? 'font-semibold text-brand-700' : ''}`}>
                <span className="w-8 text-center text-slate-500">{r.rank}</span>
                <span className="flex-1">{r.name}{r.isMe && ' (you)'}{r.department && <span className="ml-2 text-xs font-normal text-slate-400">{r.department}</span>}</span>
                <Badge>{r.level}</Badge>
                <span className="w-16 text-right">{r.points} pts</span>
              </li>
            ))}
          </ol>
        )}
        <p className="mt-3 text-xs text-slate-400">Names are shortened on the leaderboard.</p>
      </div>
    </DashboardShell>
  );
}
