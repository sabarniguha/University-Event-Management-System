import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api.js';
import DashboardShell from '../components/DashboardShell.jsx';
import { EmptyState, ErrorBox, Loader } from '../components/Ui.jsx';
import { errMsg, fmtDate } from '../utils/format.js';

export default function Notifications() {
  const navigate = useNavigate();
  const [items, setItems] = useState([]);
  const [unread, setUnread] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(() => {
    return api
      .get('/notifications')
      .then((res) => {
        setItems(res.data.notifications);
        setUnread(res.data.unreadCount);
      })
      .catch((e) => setError(errMsg(e)))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(); }, [load]);

  const open = async (n) => {
    if (!n.readAt) await api.patch(`/notifications/${n.id}/read`).catch(() => {});
    if (n.link) navigate(n.link);
    else load();
  };

  const readAll = async () => {
    await api.post('/notifications/read-all').catch(() => {});
    load();
  };

  return (
    <DashboardShell
      title="Notifications"
      subtitle={unread ? `${unread} unread` : 'You are all caught up'}
      actions={unread > 0 && <button className="btn-outline" onClick={readAll}>Mark all as read</button>}
    >
      <ErrorBox message={error} />
      {loading ? (
        <Loader />
      ) : items.length === 0 ? (
        <EmptyState>No notifications yet.</EmptyState>
      ) : (
        <ul className="divide-y divide-slate-100 overflow-hidden rounded-xl border border-slate-200 bg-white">
          {items.map((n) => (
            <li key={n.id}>
              <button onClick={() => open(n)} className={`block w-full px-5 py-4 text-left hover:bg-slate-50 ${n.readAt ? '' : 'bg-brand-50/60'}`}>
                <div className="flex items-center justify-between gap-3">
                  <p className="font-medium text-slate-900">{n.title}</p>
                  <span className="shrink-0 text-xs text-slate-400">{fmtDate(n.createdAt)}</span>
                </div>
                <p className="mt-1 text-sm text-slate-600">{n.message}</p>
              </button>
            </li>
          ))}
        </ul>
      )}
    </DashboardShell>
  );
}
