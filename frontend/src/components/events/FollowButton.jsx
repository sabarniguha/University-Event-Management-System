import { useState } from 'react';
import { BellPlus, BellRing } from 'lucide-react';
import api from '../../services/api.js';
import useFetch from '../../hooks/useFetch.js';
import { useAuth } from '../../context/AuthContext.jsx';
import { useToast } from '../../context/ToastContext.jsx';
import { errMsg } from '../../utils/format.js';

// Students only: follow an organiser to be notified when they publish a new event.
export default function FollowButton({ organizerId }) {
  const { user } = useAuth();
  const toast = useToast();
  const { data, reload } = useFetch(user?.role === 'STUDENT' && organizerId ? `/follows/organizer/${organizerId}` : null);
  const [busy, setBusy] = useState(false);
  if (user?.role !== 'STUDENT' || !data) return null;

  const toggle = async () => {
    setBusy(true);
    try {
      if (data.following) await api.delete(`/follows/organizer/${organizerId}`);
      else await api.post(`/follows/organizer/${organizerId}`);
      toast.success(data.following ? 'Unfollowed' : `Following ${data.organizer.name}. You will be told about their new events.`);
      reload();
    } catch (e) { toast.error(errMsg(e)); } finally { setBusy(false); }
  };
  return (
    <button onClick={toggle} disabled={busy} className={`btn-sm ${data.following ? 'btn-outline' : 'btn-primary'} inline-flex items-center gap-1`}>
      {data.following ? <BellRing className="h-3.5 w-3.5" /> : <BellPlus className="h-3.5 w-3.5" />}
      {data.following ? 'Following' : 'Follow'} <span className="opacity-70">· {data.followers}</span>
    </button>
  );
}
