import { NavLink } from 'react-router-dom';
import { CalendarHeart, LogOut } from 'lucide-react';
import { useAuth } from '../../context/AuthContext.jsx';
import { Avatar } from '../common/Ui.jsx';
import { NAV, ROLE_TITLE } from './navConfig.js';

// Role-aware navigation. `badges` maps a navConfig badgeKey to a number (e.g. pending approvals).
export default function Sidebar({ onNavigate, badges = {} }) {
  const { user, logout } = useAuth();
  const items = NAV[user.role] || [];

  return (
    <div className="flex h-full flex-col">
      <NavLink to="/" onClick={onNavigate} className="flex items-center gap-2 px-5 py-5 text-lg font-bold text-slate-900">
        <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-600 text-white">
          <CalendarHeart className="h-5 w-5" />
        </span>
        UniEvents
      </NavLink>

      <nav className="flex-1 space-y-0.5 overflow-y-auto px-3 pb-4" aria-label="Dashboard">
        {items.map(({ to, label, icon: Icon, end, badgeKey }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            onClick={onNavigate}
            className={({ isActive }) =>
              `flex items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium transition ${
                isActive ? 'bg-brand-50 text-brand-700' : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
              }`
            }
          >
            <Icon className="h-[18px] w-[18px] shrink-0" />
            <span className="flex-1 truncate">{label}</span>
            {badgeKey && badges[badgeKey] > 0 && (
              <span className="rounded-full bg-red-600 px-1.5 text-[10px] font-bold leading-4 text-white">{badges[badgeKey]}</span>
            )}
          </NavLink>
        ))}
      </nav>

      <div className="border-t border-slate-200 p-3">
        <div className="flex items-center gap-3 rounded-xl px-2 py-2">
          <Avatar user={user} size={36} />
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold text-slate-900">{user.name}</p>
            <p className="text-xs text-slate-500">{ROLE_TITLE[user.role]}</p>
          </div>
          <button onClick={logout} className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-red-600" aria-label="Log out" title="Log out">
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
