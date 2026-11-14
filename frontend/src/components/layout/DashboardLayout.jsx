import { useEffect, useState } from 'react';
import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { Globe, Menu, X } from 'lucide-react';
import { useAuth } from '../../context/AuthContext.jsx';
import api from '../../services/api.js';
import Sidebar from '../navigation/Sidebar.jsx';
import NotificationBell from '../notifications/NotificationBell.jsx';
import ThemeToggle from './ThemeToggle.jsx';

// Sidebar + top bar + animated page area for every signed-in role.
export default function DashboardLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [open, setOpen] = useState(false);
  const [badges, setBadges] = useState({});

  useEffect(() => setOpen(false), [location.pathname]);

  // Admins see how many events are waiting for approval next to the menu item.
  useEffect(() => {
    if (user.role !== 'ADMIN') return;
    api.get('/events/pending').then((r) => setBadges({ pendingEvents: r.data.events.length })).catch(() => {});
  }, [user.role, location.pathname]);

  return (
    <div className="min-h-screen lg:pl-64 print:pl-0">
      {/* Desktop sidebar */}
      <aside className="fixed inset-y-0 left-0 hidden w-64 border-r border-slate-200 bg-white lg:block print:hidden">
        <Sidebar badges={badges} />
      </aside>

      {/* Mobile drawer */}
      <AnimatePresence>
        {open && (
          <>
            <motion.div className="fixed inset-0 z-40 bg-slate-950/50 lg:hidden" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setOpen(false)} />
            <motion.aside
              className="fixed inset-y-0 left-0 z-50 w-72 max-w-[85vw] bg-white shadow-lift lg:hidden"
              initial={{ x: '-100%' }} animate={{ x: 0 }} exit={{ x: '-100%' }} transition={{ type: 'tween', duration: 0.2 }}
            >
              <button onClick={() => setOpen(false)} className="absolute right-3 top-4 rounded-lg p-1 text-slate-400 hover:bg-slate-100" aria-label="Close menu">
                <X className="h-5 w-5" />
              </button>
              <Sidebar badges={badges} onNavigate={() => setOpen(false)} />
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      <header className="sticky top-0 z-30 flex items-center justify-between border-b border-slate-200 bg-white/90 px-4 py-3 backdrop-blur print:hidden">
        <button onClick={() => setOpen(true)} className="rounded-xl p-2 text-slate-600 hover:bg-slate-100 lg:hidden" aria-label="Open menu">
          <Menu className="h-5 w-5" />
        </button>
        <Link to="/" className="hidden items-center gap-2 text-sm text-slate-500 hover:text-slate-800 lg:flex">
          <Globe className="h-4 w-4" /> Back to website
        </Link>
        <div className="flex items-center gap-1">
          <ThemeToggle />
          <NotificationBell />
          <button
            onClick={() => { logout(); navigate('/'); }}
            className="ml-1 hidden rounded-xl px-3 py-1.5 text-sm font-medium text-slate-600 hover:bg-slate-100 sm:block"
          >
            Log out
          </button>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8 print:p-0">
        <AnimatePresence mode="wait">
          <motion.div key={location.pathname} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.18 }}>
            <Outlet />
          </motion.div>
        </AnimatePresence>
      </main>
    </div>
  );
}
