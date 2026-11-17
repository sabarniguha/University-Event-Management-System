import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowDown, ArrowUp, Download, Plus, Trash2 } from 'lucide-react';
import api, { downloadFile } from '../../services/api.js';
import useFetch from '../../hooks/useFetch.js';
import { useToast } from '../../context/ToastContext.jsx';
import DashboardShell from '../../components/DashboardShell.jsx';
import { EmptyState, ErrorBox, Loader } from '../../components/common/Ui.jsx';
import { errMsg } from '../../utils/format.js';

const TYPES = { TEXT: 'Short answer', CHOICE: 'Multiple choice', YESNO: 'Yes / No', RATING: 'Rating 1 to 5' };
const blank = (kind) => ({ kind, label: '', type: 'TEXT', options: [], required: false });

// Organiser/admin: add questions, see a summary of answers, export everything.
export default function EventSurvey() {
  const { id } = useParams();
  const toast = useToast();
  const { data, loading, error, reload } = useFetch(`/surveys/event/${id}/manage`);
  const [list, setList] = useState([]);
  const [busy, setBusy] = useState(false);

  useEffect(() => { if (data) setList(data.questions.map((q) => ({ ...q }))); }, [data]);

  const patch = (i, p) => setList((l) => l.map((q, k) => (k === i ? { ...q, ...p } : q)));
  const move = (i, d) => setList((l) => { const n = [...l]; const j = i + d; if (j < 0 || j >= n.length) return l; [n[i], n[j]] = [n[j], n[i]]; return n; });

  const save = async () => {
    setBusy(true);
    try {
      const questions = list.map((q) => ({ id: q.id, kind: q.kind, label: q.label, type: q.type, options: q.type === 'CHOICE' ? q.options : undefined, required: q.required }));
      await api.put(`/surveys/event/${id}/questions`, { questions });
      toast.success('Questions saved');
      reload();
    } catch (e) { toast.error(errMsg(e)); } finally { setBusy(false); }
  };

  const section = (kind, title, note) => (
    <div className="card space-y-3">
      <div className="flex items-start justify-between gap-2">
        <div><h2 className="font-semibold text-slate-900">{title}</h2><p className="text-xs text-slate-500">{note}</p></div>
        <button className="btn-outline btn-sm" onClick={() => setList((l) => [...l, blank(kind)])} disabled={list.length >= 15}><Plus className="h-4 w-4" /> Add</button>
      </div>
      {list.every((q) => q.kind !== kind) && <p className="text-sm text-slate-500">No questions yet.</p>}
      {list.map((q, i) => q.kind !== kind ? null : (
        <div key={q.id || `n${i}`} className="space-y-2 rounded-xl border border-slate-200 p-3">
          <div className="flex gap-2">
            <input className="input min-w-0 flex-1" placeholder="Question" value={q.label} maxLength={200} onChange={(e) => patch(i, { label: e.target.value })} aria-label="Question" />
            <select className="input w-40" value={q.type} onChange={(e) => patch(i, { type: e.target.value })} aria-label="Answer type">{Object.entries(TYPES).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select>
          </div>
          {q.type === 'CHOICE' && <input className="input" placeholder="Choices, separated by commas" value={(q.options || []).join(', ')} onChange={(e) => patch(i, { options: e.target.value.split(',').map((s) => s.trim()).filter(Boolean) })} aria-label="Choices" />}
          <div className="flex items-center justify-between text-sm">
            <label className="flex items-center gap-2"><input type="checkbox" checked={q.required} onChange={(e) => patch(i, { required: e.target.checked })} /> Required</label>
            <span className="flex items-center gap-1">
              {q.id && <span className="mr-2 text-xs text-slate-500">{q.answered} answer(s){q.summary?.average ? `, average ${q.summary.average}` : ''}{q.summary?.counts ? `: ${Object.entries(q.summary.counts).map(([k, v]) => `${k} ${v}`).join(', ')}` : ''}</span>}
              <button type="button" className="btn-ghost btn-sm" onClick={() => move(i, -1)} aria-label="Move up"><ArrowUp className="h-4 w-4" /></button>
              <button type="button" className="btn-ghost btn-sm" onClick={() => move(i, 1)} aria-label="Move down"><ArrowDown className="h-4 w-4" /></button>
              <button type="button" className="btn-ghost btn-sm text-red-600" onClick={() => setList((l) => l.filter((_, k) => k !== i))} aria-label="Delete question"><Trash2 className="h-4 w-4" /></button>
            </span>
          </div>
        </div>
      ))}
    </div>
  );

  return (
    <DashboardShell
      title={data ? `Survey: ${data.event.title}` : 'Survey'}
      subtitle="Add your own questions. Students answer them on the event page."
      actions={<>
        <Link to={`/organizer/events/${id}/registrations`} className="btn-outline">Registrations</Link>
        <button className="btn-outline" onClick={() => downloadFile(`/surveys/event/${id}/export`, 'survey.csv').catch((e) => toast.error(errMsg(e)))}><Download className="h-4 w-4" /> Export answers</button>
        <button className="btn-primary" onClick={save} disabled={busy}>{busy ? 'Saving...' : 'Save questions'}</button>
      </>}
    >
      <ErrorBox message={error} />
      {loading && !data ? <Loader /> : !data ? <EmptyState title="Could not load">Try again.</EmptyState> : (
        <div className="grid gap-4 lg:grid-cols-2">
          {section('REGISTRATION', 'After registering', 'Shown to students once they have registered, for example t-shirt size or dietary needs.')}
          {section('FEEDBACK', 'After the event', 'Shown to confirmed students once the event has ended. Deleting a question deletes its answers.')}
        </div>
      )}
    </DashboardShell>
  );
}
