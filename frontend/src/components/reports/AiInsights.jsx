import { useCallback, useEffect, useRef, useState } from 'react';
import { RefreshCw, Sparkles } from 'lucide-react';
import api from '../../services/api.js';
import { errMsg } from '../../utils/format.js';
import { Section } from './ReportParts.jsx';

const SKIP = new Set(['attendees', 'gallery', 'photos', 'sponsors', 'seal', 'organiserOptions', 'student']);
// Sends only a trimmed copy of the report (no attendee lists, photos or seal) so the request stays small.
const slim = (v, depth = 0) => {
  if (Array.isArray(v)) return v.slice(0, 15).map((x) => slim(x, depth + 1));
  if (v && typeof v === 'object') return depth > 6 ? undefined : Object.fromEntries(Object.entries(v).filter(([k]) => !SKIP.has(k)).map(([k, x]) => [k, slim(x, depth + 1)]));
  return v;
};

// Last section of a report. kind: 'platform' | 'organiser' | 'event' | 'student'. Writes itself once, and prints with the report.
export default function AiInsights({ kind, d }) {
  const [state, setState] = useState({ loading: true, bullets: [], source: null, error: '' });
  const started = useRef(false);

  const run = useCallback(async () => {
    setState((s) => ({ ...s, loading: true, error: '' }));
    try {
      const { data } = await api.post('/report-ai', { kind, data: slim(d) });
      setState({ loading: false, bullets: data.bullets || [], source: data.source, error: '' });
    } catch (e) {
      setState({ loading: false, bullets: [], source: null, error: errMsg(e) });
    }
  }, [kind, d]);

  useEffect(() => { if (!started.current) { started.current = true; run(); } }, [run]);

  return (
    <Section title="AI insights" note={state.source === 'basic' ? 'A quick read of the numbers above (the AI writer is not set up, so this is a plain summary).' : 'Written by AI from the figures in this report. Check important decisions against the tables above.'}>
      <div className="mb-2 flex justify-end print:hidden">
        <button type="button" className="btn-outline btn-sm" onClick={run} disabled={state.loading}>
          <RefreshCw className={`h-3.5 w-3.5 ${state.loading ? 'animate-spin' : ''}`} /> Refresh
        </button>
      </div>
      {state.loading && state.bullets.length === 0 ? <p className="flex items-center gap-2 text-xs text-slate-500"><Sparkles className="h-4 w-4" /> Reading the report...</p>
        : state.error ? <p className="text-xs text-red-600 print:hidden">{state.error}</p>
        : <ul className="list-disc space-y-1.5 pl-4 text-xs text-slate-700">{state.bullets.map((b, i) => <li key={i}>{b}</li>)}</ul>}
    </Section>
  );
}
