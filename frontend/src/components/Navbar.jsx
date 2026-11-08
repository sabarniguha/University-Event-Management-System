import { useState } from 'react';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { dashboardPath } from '../utils/format.js';

const linkClass = ({ isActive }) =>
  `rounded-md px-3 py-2 text-sm font-medium ${isActive ? 'bg-brand-50 text-brand-700' : 'text-slate-600 hover:text-slate-900'}`;

export default function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);

  const handleLogout = () => {
    logout();
    setOpen(false);
    navigate('/');
  };

  const close = () => setOpen(false);

  const links = (
    <>
      <NavLink to="/events" className={linkClass} onClick={close}>Events</NavLink>
      {user && <NavLink to="/announcements" className={linkClass} onClick={close}>Announcements</NavLink>}
      {user && <NavLink to={dashboardPath(user.role)} className={linkClass} onClick={close}>Dashboard</NavLink>}
      {user && <NavLink to="/profile" className={linkClass} onClick={close}>Profile</NavLink>}
    </>
  );

  return (
    <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/90 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
        <Link to="/" className="text-lg font-bold text-brand-700">UEMS</Link>

        <nav className="hidden items-center gap-1 md:flex">{links}</nav>

        <div className="hidden items-center gap-2 md:flex">
          {user ? (
            <>
              <span className="text-sm text-slate-500">{user.name}</span>
              <button onClick={handleLogout} className="btn-outline btn-sm">Logout</button>
            </>
          ) : (
            <>
              <Link to="/login" className="btn-outline btn-sm">Login</Link>
              <Link to="/register" className="btn-primary btn-sm">Sign up</Link>
            </>
          )}
        </div>

        <button
          className="rounded-md p-2 text-slate-600 md:hidden"
          onClick={() => setOpen((o) => !o)}
          aria-label="Toggle menu"
          aria-expanded={open}
        >
          <span className="block text-xl leading-none">{open ? '✕' : '☰'}</span>
        </button>
      </div>

      {open && (
        <div className="space-y-1 border-t border-slate-200 bg-white px-4 py-3 md:hidden">
          <div className="flex flex-col">{links}</div>
          <div className="flex gap-2 pt-2">
            {user ? (
              <button onClick={handleLogout} className="btn-outline btn-sm">Logout</button>
            ) : (
              <>
                <Link to="/login" className="btn-outline btn-sm" onClick={close}>Login</Link>
                <Link to="/register" className="btn-primary btn-sm" onClick={close}>Sign up</Link>
              </>
            )}
          </div>
        </div>
      )}
    </header>
  );
}
