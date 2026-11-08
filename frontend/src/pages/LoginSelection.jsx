import { Link, Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { ROLE_LOGINS, dashboardPath } from '../utils/format.js';

const ICONS = { student: '🎓', organizer: '📋', admin: '🛡️' };

export default function LoginSelection() {
  const { user } = useAuth();
  if (user) return <Navigate to={dashboardPath(user.role)} replace />;

  return (
    <div className="mx-auto max-w-4xl px-4 py-12">
      <div className="mb-8 text-center">
        <h1 className="text-3xl font-bold">Choose how you want to sign in</h1>
        <p className="mt-2 text-sm text-slate-500">Each role has its own login page and dashboard.</p>
      </div>

      <div className="grid gap-5 md:grid-cols-3">
        {Object.entries(ROLE_LOGINS).map(([type, info]) => (
          <Link
            key={type}
            to={`/login/${type}`}
            className="card flex flex-col items-center text-center transition hover:-translate-y-0.5 hover:shadow-md"
          >
            <span className="text-4xl" aria-hidden="true">{ICONS[type]}</span>
            <h2 className="mt-3 text-lg font-semibold">{info.label} login</h2>
            <p className="mt-2 text-sm text-slate-500">{info.description}</p>
            <span className="btn-primary mt-5 w-full">Continue as {info.label.toLowerCase()}</span>
          </Link>
        ))}
      </div>

      <p className="mt-8 text-center text-sm text-slate-500">
        New student? <Link to="/register" className="font-medium text-brand-600 hover:underline">Create an account</Link>
      </p>
    </div>
  );
}
