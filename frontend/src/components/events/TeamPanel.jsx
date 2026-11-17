import { useState } from 'react';
import { Copy, Users, X } from 'lucide-react';
import api from '../../services/api.js';
import useFetch from '../../hooks/useFetch.js';
import { useToast } from '../../context/ToastContext.jsx';
import { Badge, Loader } from '../common/Ui.jsx';
import { useAuth } from '../../context/AuthContext.jsx';
import { errMsg } from '../../utils/format.js';

const ACTIVE = ['REGISTERED', 'PENDING', 'WAITLISTED', 'AWAITING_PAYMENT'];

// Create or join a team for a team event. Students register for the event first, then group up here.
export default function TeamPanel({ event, registration }) {
  const toast = useToast();
  const { user } = useAuth();
  const eligible = event.teamMax >= 2 && registration && ACTIVE.includes(registration.status);
  const { data, loading, reload } = useFetch(eligible ? `/teams/event/${event.id}/mine` : null);
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);

  if (!eligible) return null;

  const run = async (fn, ok) => {
    setBusy(true);
    try {
      await fn();
      if (ok) toast.success(ok);
      reload();
    } catch (e) {
      toast.error(errMsg(e));
    } finally {
      setBusy(false);
    }
  };

  const team = data?.team;
  const meId = user?.id;
  const isLeader = team && team.leaderId === meId;

  return (
    <section className="card space-y-3">
      <h2 className="flex items-center gap-2 font-semibold text-slate-900"><Users className="h-4 w-4 text-brand-600" /> Your team</h2>
      <p className="text-xs text-slate-500">This is a team event: {event.teamMin === event.teamMax ? `${event.teamMax} members` : `${event.teamMin} to ${event.teamMax} members`} per team. Every member registers (and pays, if there is a fee) on their own.</p>
      {loading ? <Loader /> : team ? (
        <>
          <div className="flex items-center justify-between gap-2">
            <p className="font-medium text-slate-900">{team.name}</p>
            <Badge>{team.complete ? 'READY' : `NEEDS ${Math.max(0, team.teamMin - team.members.filter((m) => m.registrationStatus === 'REGISTERED').length)} MORE`}</Badge>
          </div>
          <div className="flex items-center gap-2 rounded-lg bg-slate-50 px-3 py-2 text-sm">
            <span className="text-slate-500">Team code</span>
            <span className="font-mono text-base font-bold tracking-widest text-slate-900">{team.inviteCode}</span>
            <button type="button" className="btn-ghost btn-sm ml-auto" title="Copy code" onClick={() => navigator.clipboard?.writeText(team.inviteCode).then(() => toast.success('Code copied'))}><Copy className="h-4 w-4" /></button>
          </div>
          <p className="text-xs text-slate-500">Share this code with teammates. They register for the event, then enter it here. {team.size}/{team.teamMax} members.</p>
          <ul className="divide-y divide-slate-100 text-sm">
            {team.members.map((m) => (
              <li key={m.userId} className="flex items-center justify-between gap-2 py-2">
                <span><span className="font-medium text-slate-900">{m.name}</span>{m.isLeader && <span className="ml-1 text-xs text-brand-600">(leader)</span>}<br /><span className="text-xs text-slate-500">{m.department || ''}</span></span>
                <span className="flex items-center gap-2">
                  <Badge>{m.registrationStatus}</Badge>
                  {isLeader && !m.isLeader && <button type="button" title="Remove" className="text-red-500" onClick={() => run(() => api.delete(`/teams/${team.id}/members/${m.userId}`), 'Member removed')}><X className="h-4 w-4" /></button>}
                </span>
              </li>
            ))}
          </ul>
          {isLeader
            ? <button className="btn-ghost w-full text-red-600" disabled={busy} onClick={() => window.confirm('Disband this team?') && run(() => api.delete(`/teams/${team.id}`), 'Team disbanded')}>Disband team</button>
            : <button className="btn-ghost w-full text-red-600" disabled={busy} onClick={() => run(() => api.post(`/teams/${team.id}/leave`), 'You left the team')}>Leave team</button>}
        </>
      ) : (
        <div className="space-y-4">
          <form className="space-y-2" onSubmit={(e) => { e.preventDefault(); run(() => api.post('/teams', { eventId: event.id, name }), 'Team created').then(() => setName('')); }}>
            <label className="label" htmlFor="team-name">Create a team</label>
            <div className="flex gap-2"><input id="team-name" className="input min-w-0 flex-1" placeholder="Team name" value={name} onChange={(e) => setName(e.target.value)} required minLength={2} maxLength={60} /><button className="btn-primary" disabled={busy}>Create</button></div>
          </form>
          <form className="space-y-2" onSubmit={(e) => { e.preventDefault(); run(() => api.post('/teams/join', { code }), 'You joined the team').then(() => setCode('')); }}>
            <label className="label" htmlFor="team-code">Or join with a team code</label>
            <div className="flex gap-2"><input id="team-code" className="input min-w-0 flex-1 font-mono uppercase tracking-widest" placeholder="ABC123" value={code} onChange={(e) => setCode(e.target.value.toUpperCase())} required maxLength={6} minLength={6} /><button className="btn-outline" disabled={busy}>Join</button></div>
          </form>
        </div>
      )}
    </section>
  );
}
