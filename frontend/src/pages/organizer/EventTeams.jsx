import { Link, useParams } from 'react-router-dom';
import { Download, Users } from 'lucide-react';
import useFetch from '../../hooks/useFetch.js';
import { downloadFile } from '../../services/api.js';
import { useToast } from '../../context/ToastContext.jsx';
import DashboardShell from '../../components/DashboardShell.jsx';
import { Badge, EmptyState, ErrorBox, Loader } from '../../components/common/Ui.jsx';
import { errMsg } from '../../utils/format.js';

// Organiser/admin view of every team in an event.
export default function EventTeams() {
  const { id } = useParams();
  const toast = useToast();
  const { data, loading, error } = useFetch(`/teams/event/${id}`);
  const teams = data?.teams || [];
  const isTeamEvent = data ? data.event.teamMax > 1 : true;

  return (
    <DashboardShell
      title={data ? `Teams: ${data.event.title}` : 'Teams'}
      subtitle={data && isTeamEvent ? `${data.event.teamMin === data.event.teamMax ? data.event.teamMax : `${data.event.teamMin} to ${data.event.teamMax}`} members per team. ${teams.length} team(s).` : undefined}
      actions={isTeamEvent && teams.length > 0 && <button className="btn-outline" onClick={() => downloadFile(`/teams/event/${id}/export`, 'teams.csv').catch((e) => toast.error(errMsg(e)))}><Download className="h-4 w-4" /> CSV</button>}
    >
      <ErrorBox message={error} />
      {loading ? <Loader /> : !isTeamEvent ? (
        <EmptyState icon={Users} title="This is not a team event">Edit the event and set the maximum team size above 1 to let students form teams. <Link to={`/organizer/events/${id}/edit`} className="text-brand-600 underline">Edit event</Link></EmptyState>
      ) : teams.length === 0 ? (
        <EmptyState icon={Users} title="No teams yet">Students register for the event, then create or join a team on the event page.</EmptyState>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {teams.map((t) => (
            <div key={t.id} className="card">
              <div className="flex items-center justify-between gap-2">
                <h2 className="font-semibold text-slate-900">{t.name}</h2>
                <Badge>{t.complete ? 'READY' : 'INCOMPLETE'}</Badge>
              </div>
              <p className="text-xs text-slate-500">{t.size}/{t.teamMax} members &middot; code <span className="font-mono">{t.inviteCode}</span></p>
              <ul className="mt-2 divide-y divide-slate-100 text-sm">
                {t.members.map((m) => (
                  <li key={m.userId} className="flex items-center justify-between gap-2 py-1.5">
                    <span>{m.name}{m.isLeader && <span className="ml-1 text-xs text-brand-600">(leader)</span>}{m.studentId && <span className="ml-1 text-xs text-slate-400">{m.studentId}</span>}</span>
                    <Badge>{m.registrationStatus}</Badge>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      )}
    </DashboardShell>
  );
}
