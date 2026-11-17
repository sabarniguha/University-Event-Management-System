import { Link } from 'react-router-dom';
import { Trophy } from 'lucide-react';
import useFetch from '../../hooks/useFetch.js';

// Small points summary for the student dashboard.
export default function RewardsCard() {
  const { data } = useFetch('/rewards/me');
  if (!data) return null;
  const earned = data.badges.filter((b) => b.earned).length;
  return (
    <Link to="/student/rewards" className="card flex items-center gap-4 transition hover:shadow-lift">
      <span className="rounded-full bg-amber-100 p-3 text-amber-600"><Trophy className="h-5 w-5" /></span>
      <div className="flex-1">
        <p className="font-semibold text-slate-900">{data.points} points · {data.level}</p>
        <p className="text-xs text-slate-500">{earned} of {data.badges.length} badges earned{data.rank ? ` · rank #${data.rank}` : ''}</p>
      </div>
      <span className="text-sm text-brand-600">View</span>
    </Link>
  );
}
