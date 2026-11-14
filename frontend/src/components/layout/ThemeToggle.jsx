import { Moon, Sun } from 'lucide-react';
import { useTheme } from '../../context/ThemeContext.jsx';

export default function ThemeToggle({ className = '' }) {
  const { dark, setTheme } = useTheme();
  return (
    <button
      onClick={() => setTheme(dark ? 'light' : 'dark')}
      className={`rounded-xl p-2 text-slate-500 transition hover:bg-slate-100 hover:text-slate-800 ${className}`}
      aria-label={dark ? 'Switch to light mode' : 'Switch to dark mode'}
      title={dark ? 'Light mode' : 'Dark mode'}
    >
      {dark ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
    </button>
  );
}
