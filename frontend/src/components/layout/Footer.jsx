import { Link } from 'react-router-dom';
import { CalendarHeart } from 'lucide-react';

const col = 'text-sm text-slate-500 hover:text-brand-600';

export default function Footer() {
  return (
    <footer className="border-t border-slate-200 bg-white print:hidden">
      <div className="mx-auto grid max-w-7xl gap-8 px-4 py-10 sm:px-6 md:grid-cols-4 lg:px-8">
        <div className="md:col-span-2">
          <div className="flex items-center gap-2 text-lg font-bold text-slate-900">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-600 text-white"><CalendarHeart className="h-5 w-5" /></span>
            UniEvents
          </div>
          <p className="mt-3 max-w-sm text-sm text-slate-500">
            One place for everything happening on campus. Discover events, register in a click, check in with a QR ticket and collect verified certificates.
          </p>
        </div>
        <div>
          <h4 className="mb-3 text-sm font-semibold text-slate-900">Explore</h4>
          <ul className="space-y-2">
            <li><Link className={col} to="/events">Explore events</Link></li>
            <li><Link className={col} to="/categories">Categories</Link></li>
            <li><Link className={col} to="/verify">Verify a certificate</Link></li>
          </ul>
        </div>
        <div>
          <h4 className="mb-3 text-sm font-semibold text-slate-900">Company</h4>
          <ul className="space-y-2">
            <li><Link className={col} to="/about">About</Link></li>
            <li><Link className={col} to="/contact">Contact</Link></li>
            <li><Link className={col} to="/register">Create an account</Link></li>
          </ul>
        </div>
      </div>
      <div className="border-t border-slate-100 py-4 text-center text-xs text-slate-400">
        &copy; {new Date().getFullYear()} UniEvents. All rights reserved.
      </div>
    </footer>
  );
}
