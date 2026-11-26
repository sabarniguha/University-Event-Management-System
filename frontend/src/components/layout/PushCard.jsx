import { useEffect, useState } from 'react';
import { BellRing } from 'lucide-react';
import api from '../../services/api.js';
import { useToast } from '../../context/ToastContext.jsx';
import { errMsg } from '../../utils/format.js';

const b64ToBytes = (b64) => {
  const pad = '='.repeat((4 - (b64.length % 4)) % 4);
  const raw = atob((b64 + pad).replace(/-/g, '+').replace(/_/g, '/'));
  return Uint8Array.from([...raw].map((c) => c.charCodeAt(0)));
};

// Settings card: turn browser notifications on or off for this device. Hidden unless the server has push keys.
export default function PushCard() {
  const toast = useToast();
  const [cfg, setCfg] = useState(null);
  const [on, setOn] = useState(false);
  const [busy, setBusy] = useState(false);
  const supported = typeof window !== 'undefined' && 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;

  useEffect(() => {
    if (!supported) return;
    api.get('/push/config').then(({ data }) => setCfg(data)).catch(() => {});
    navigator.serviceWorker.ready.then((reg) => reg.pushManager.getSubscription()).then((s) => setOn(Boolean(s))).catch(() => {});
  }, [supported]);

  if (!supported || !cfg?.enabled) return null;

  const enable = async () => {
    setBusy(true);
    try {
      const permission = await Notification.requestPermission();
      if (permission !== 'granted') throw new Error('Notifications are blocked for this site. Allow them in your browser settings and try again.');
      const reg = await navigator.serviceWorker.ready;
      const sub = (await reg.pushManager.getSubscription()) || (await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: b64ToBytes(cfg.publicKey) }));
      await api.post('/push/subscribe', sub.toJSON());
      setOn(true);
      toast.success('Notifications are on for this device.');
    } catch (e) { toast.error(errMsg(e)); } finally { setBusy(false); }
  };
  const disable = async () => {
    setBusy(true);
    try {
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.getSubscription();
      if (sub) { await api.post('/push/unsubscribe', { endpoint: sub.endpoint }).catch(() => {}); await sub.unsubscribe(); }
      setOn(false);
      toast.success('Notifications are off for this device.');
    } catch (e) { toast.error(errMsg(e)); } finally { setBusy(false); }
  };
  const test = async () => { try { await api.post('/push/test'); } catch (e) { toast.error(errMsg(e)); } };

  return (
    <div className="card max-w-xl space-y-2">
      <h2 className="flex items-center gap-2 font-semibold text-slate-900"><BellRing className="h-4 w-4" /> Notifications on this device</h2>
      <p className="text-sm text-slate-600">Get reminders, messages from organisers and seat confirmations as a pop-up, even when UniEvents is closed. On iPhone, add UniEvents to the Home Screen first.</p>
      <div className="flex flex-wrap gap-2">
        {on ? <button className="btn-outline" disabled={busy} onClick={disable}>Turn off</button> : <button className="btn-primary" disabled={busy} onClick={enable}>Turn on</button>}
        {on && <button className="btn-outline" onClick={test}>Send a test</button>}
      </div>
    </div>
  );
}
