import { Link } from 'react-router-dom';
import { Compass } from 'lucide-react';

export default function NotFound() {
  return (
    <div className="mx-auto flex max-w-md flex-col items-center px-4 py-24 text-center">
      <span className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-50 text-brand-600"><Compass className="h-7 w-7" /></span>
      <h1 className="text-3xl font-bold text-slate-900">Page not found</h1>
      <p className="mt-2 text-slate-500">The page you are looking for does not exist or has moved.</p>
      <div className="mt-6 flex gap-3"><Link to="/" className="btn-primary">Go home</Link><Link to="/events" className="btn-outline">Explore events</Link></div>
    </div>
  );
}
