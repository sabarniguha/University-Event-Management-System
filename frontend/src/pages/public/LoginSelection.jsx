import { Link, Navigate } from 'react-router-dom';
import { GraduationCap, ClipboardList, ShieldCheck } from 'lucide-react';
import { motion } from 'framer-motion';
import { useAuth } from '../../context/AuthContext.jsx';
import { ROLE_LOGINS, dashboardPath } from '../../utils/format.js';

const ICONS = { student: GraduationCap, organizer: ClipboardList, admin: ShieldCheck };

export default function LoginSelection() {
  const { user } = useAuth();
  if (user) return <Navigate to={dashboardPath(user.role)} replace />;

  return (
    <div className="mx-auto max-w-4xl px-4 py-12">
      <div className="mb-8 text-center">
        <h1 className="text-3xl font-bold tracking-tight text-slate-900">Choose how you want to sign in</h1>
        <p className="mt-2 text-sm text-slate-500">Each role has its own login page and dashboard.</p>
      </div>
      <div className="grid gap-5 md:grid-cols-3">
        {Object.entries(ROLE_LOGINS).map(([type, info], i) => {
          const Icon = ICONS[type];
          return (
            <motion.div key={type} initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.07 }}>
              <Link to={`/login/${type}`} className="card flex h-full flex-col items-center text-center transition hover:-translate-y-1 hover:shadow-lift">
                <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-50 text-brand-600"><Icon className="h-7 w-7" /></span>
                <h2 className="mt-3 text-lg font-semibold text-slate-900">{info.label} login</h2>
                <p className="mt-2 flex-1 text-sm text-slate-500">{info.description}</p>
                <span className="btn-primary mt-5 w-full">Continue as {info.label.toLowerCase()}</span>
              </Link>
            </motion.div>
          );
        })}
      </div>
      <p className="mt-8 text-center text-sm text-slate-500">
        New student? <Link to="/register" className="font-medium text-brand-600 hover:underline">Create an account</Link>
      </p>
    </div>
  );
}
