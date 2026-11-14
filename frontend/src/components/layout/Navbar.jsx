import { useState } from 'react';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import { CalendarHeart, Menu, X } from 'lucide-react';
import { useAuth } from '../../context/AuthContext.jsx';
import { dashboardPath } from '../../utils/format.js';
import NotificationBell from '../notifications/NotificationBell.jsx';
import ThemeToggle from './ThemeToggle.jsx';
import { Avatar } from '../common/Ui.jsx';

const linkClass = ({ isActive }) =>
  `rounded-lg px-3 py-2 text-sm font-medium transition ${isActive ? 'bg-brand-50 text-brand-700' : 'text-slate-600 hover:text-slate-900'}`;

export default function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const close = () => setOpen(false);

  const links = (
    <>
      <NavLink to="/" end className={linkClass} onClick={close}>Home</NavLink>
      <NavLink to="/events" className={linkClass} onClick={close}>Explore Events</NavLink>
      <NavLink to="/categories" className={linkClass} onClick={close}>Categories</NavLink>
      <NavLink to="/about" className={linkClass} onClick={close}>About</NavLink>
      <NavLink to="/contact" className={linkClass} onClick={close}>Contact</NavLink>
    </>
  );

  return (
    <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/90 backdrop-blur print:hidden">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 sm:px-6 lg:px-8">
        <Link to="/" className="flex items-center gap-2 text-lg font-bold text-slate-900">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-600 text-white"><CalendarHeart className="h-5 w-5" /></span>
          UniEvents
        </Link>

        <nav className="hidden items-center gap-1 md:flex" aria-label="Main">{links}</nav>

        <div className="hidden items-center gap-2 md:flex">
          <ThemeToggle />
          {user ? (
            <>
              <NotificationBell />
              <Link to={dashboardPath(user.role)} className="flex items-center gap-2 rounded-xl px-2 py-1 hover:bg-slate-100">
                <Avatar user={user} size={28} />
                <span className="text-sm font-medium text-slate-700">Dashboard</span>
              </Link>
              <button onClick={() => { logout(); navigate('/'); }} className="btn-outline btn-sm">Logout</button>
            </>
          ) : (
            <>
              <Link to="/login" className="btn-ghost btn-sm">Login</Link>
              <Link to="/register" className="btn-primary btn-sm">Register</Link>
            </>
          )}
        </div>

        <div className="flex items-center gap-1 md:hidden">
          <ThemeToggle />
          {user && <NotificationBell />}
          <button className="rounded-xl p-2 text-slate-600" onClick={() => setOpen((o) => !o)} aria-label="Toggle menu" aria-expanded={open}>
            {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {open && (
        <div className="space-y-1 border-t border-slate-200 bg-white px-4 py-3 md:hidden">
          <div className="flex flex-col">{links}</div>
          <div className="flex gap-2 pt-2">
            {user ? (
              <>
                <Link to={dashboardPath(user.role)} className="btn-primary btn-sm" onClick={close}>Dashboard</Link>
                <button onClick={() => { close(); logout(); navigate('/'); }} className="btn-outline btn-sm">Logout</button>
              </>
            ) : (
              <>
                <Link to="/login" className="btn-outline btn-sm" onClick={close}>Login</Link>
                <Link to="/register" className="btn-primary btn-sm" onClick={close}>Register</Link>
              </>
            )}
          </div>
        </div>
      )}
    </header>
  );
}
