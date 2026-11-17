import { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { WifiOff } from 'lucide-react';
import { loadAllTickets } from '../../utils/offlineTickets.js';

// Shown only while the device is offline and has saved tickets.
export default function OfflineBanner() {
  const [online, setOnline] = useState(typeof navigator === 'undefined' ? true : navigator.onLine);
  const { pathname } = useLocation();
  useEffect(() => {
    const on = () => setOnline(true);
    const off = () => setOnline(false);
    window.addEventListener('online', on);
    window.addEventListener('offline', off);
    return () => { window.removeEventListener('online', on); window.removeEventListener('offline', off); };
  }, []);
  if (online || pathname === '/offline-tickets' || loadAllTickets().length === 0) return null;
  return (
    <div className="bg-amber-500 px-4 py-2 text-center text-sm font-medium text-white print:hidden" role="status">
      <WifiOff className="mr-2 inline h-4 w-4" /> You are offline. <Link to="/offline-tickets" className="underline">Show my saved tickets</Link>
    </div>
  );
}
