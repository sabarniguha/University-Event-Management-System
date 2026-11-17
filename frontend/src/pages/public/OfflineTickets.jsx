import { Link } from 'react-router-dom';
import { WifiOff } from 'lucide-react';
import QrCode from '../../components/QrCode.jsx';
import { loadAllTickets } from '../../utils/offlineTickets.js';
import { fmtDate } from '../../utils/format.js';

// Works with no connection and no sign-in: shows the tickets saved on this device.
export default function OfflineTickets() {
  const tickets = loadAllTickets();
  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <h1 className="flex items-center gap-2 text-2xl font-bold text-slate-900"><WifiOff className="h-6 w-6 text-brand-600" /> Saved tickets</h1>
      <p className="mt-1 text-sm text-slate-500">These were saved on this phone the last time you opened My Tickets. Show the QR code at the venue.</p>
      {tickets.length === 0 ? (
        <div className="card mt-6 text-center text-sm text-slate-500">
          No saved tickets on this device. Open <Link to="/student/tickets" className="text-brand-600 underline">My Tickets</Link> once while online and they will be saved.
        </div>
      ) : (
        <div className="mt-6 grid gap-5 sm:grid-cols-2">
          {tickets.map((t) => (
            <div key={t.id} className="card flex flex-col items-center text-center">
              <QrCode value={`UEMS:${t.ticketCode}`} size={176} />
              <p className="mt-4 text-lg font-semibold text-slate-900">{t.title}</p>
              <p className="mt-1 text-sm text-slate-500">{fmtDate(t.startsAt)}</p>
              <p className="text-sm text-slate-500">{t.venue}</p>
              <p className="mt-3 break-all font-mono text-[11px] text-slate-400">{t.ticketCode}</p>
              <p className="mt-1 text-[11px] text-slate-400">Saved {fmtDate(t.savedAt)}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
