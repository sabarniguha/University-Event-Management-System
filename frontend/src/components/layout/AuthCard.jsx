import { Link } from 'react-router-dom';
import { CalendarHeart } from 'lucide-react';
import { motion } from 'framer-motion';

// Centered card used by login, register and password pages.
export default function AuthCard({ title, subtitle, children, footer, wide = false }) {
  return (
    <div className="flex min-h-[calc(100vh-10rem)] items-center justify-center bg-gradient-to-b from-brand-50/60 to-transparent px-4 py-10">
      <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} className={`w-full ${wide ? 'max-w-xl' : 'max-w-md'}`}>
        <Link to="/" className="mx-auto mb-5 flex w-fit items-center gap-2 text-lg font-bold text-slate-900">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-600 text-white"><CalendarHeart className="h-5 w-5" /></span>
          UniEvents
        </Link>
        <div className="card space-y-4 !p-6">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">{title}</h1>
            {subtitle && <p className="mt-1 text-sm text-slate-500">{subtitle}</p>}
          </div>
          {children}
        </div>
        {footer && <div className="mt-4 text-center text-sm text-slate-500">{footer}</div>}
      </motion.div>
    </div>
  );
}
