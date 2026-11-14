import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import useFetch from '../../hooks/useFetch.js';
import CategoryIcon from '../../components/events/CategoryIcon.jsx';
import { ErrorBox, Skeleton } from '../../components/common/Ui.jsx';

export default function Categories() {
  const { data, loading, error } = useFetch('/categories');
  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <h1 className="text-3xl font-bold tracking-tight text-slate-900">Categories</h1>
      <p className="mb-6 mt-1 text-slate-500">Pick a topic to see its upcoming events.</p>
      <ErrorBox message={error} />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {loading
          ? Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-28" />)
          : (data?.categories || []).map((c) => (
              <Link key={c.id} to={`/events?category=${encodeURIComponent(c.name)}`} className="card group flex gap-4 transition hover:-translate-y-1 hover:shadow-lift">
                <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-600"><CategoryIcon name={c.icon} className="h-6 w-6" /></span>
                <span className="min-w-0 flex-1">
                  <span className="block font-semibold text-slate-900">{c.name}</span>
                  <span className="mt-0.5 block text-sm text-slate-500">{c.description}</span>
                  <span className="mt-2 inline-flex items-center gap-1 text-xs font-medium text-brand-600">
                    {c.eventCount} upcoming <ArrowRight className="h-3 w-3 transition group-hover:translate-x-1" />
                  </span>
                </span>
              </Link>
            ))}
      </div>
    </div>
  );
}
