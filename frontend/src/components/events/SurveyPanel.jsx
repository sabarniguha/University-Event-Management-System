import { useEffect, useState } from 'react';
import { ClipboardList } from 'lucide-react';
import api from '../../services/api.js';
import useFetch from '../../hooks/useFetch.js';
import { useToast } from '../../context/ToastContext.jsx';
import { errMsg } from '../../utils/format.js';

// Extra questions the organiser asked: after registering, and after the event (feedback).
export default function SurveyPanel({ event, registration }) {
  const toast = useToast();
  const eligible = Boolean(registration) && ['REGISTERED', 'PENDING', 'WAITLISTED', 'AWAITING_PAYMENT'].includes(registration.status);
  const { data, reload } = useFetch(eligible ? `/surveys/event/${event.id}` : null);
  const [values, setValues] = useState({});
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (data) setValues(Object.fromEntries(data.questions.map((q) => [q.id, q.answer])));
  }, [data]);

  const questions = data?.questions || [];
  if (!eligible || questions.length === 0) return null;
  const set = (id, v) => setValues((s) => ({ ...s, [id]: v }));

  const save = async (kind) => {
    setBusy(true);
    try {
      const answers = questions.filter((q) => q.kind === kind).map((q) => ({ questionId: q.id, value: values[q.id] || '' }));
      await api.put(`/surveys/event/${event.id}/answers`, { answers });
      toast.success('Answers saved');
      reload();
    } catch (e) { toast.error(errMsg(e)); } finally { setBusy(false); }
  };

  const group = (kind, title, note) => {
    const list = questions.filter((q) => q.kind === kind);
    if (list.length === 0) return null;
    return (
      <form key={kind} className="space-y-3" onSubmit={(e) => { e.preventDefault(); save(kind); }}>
        <div><p className="font-medium text-slate-900">{title}</p><p className="text-xs text-slate-500">{note}</p></div>
        {list.map((q) => (
          <div key={q.id}>
            <label className="label" htmlFor={`q${q.id}`}>{q.label}{q.required && <span className="text-red-500"> *</span>}</label>
            {q.type === 'TEXT' && <textarea id={`q${q.id}`} className="input" rows={2} maxLength={1000} value={values[q.id] || ''} onChange={(e) => set(q.id, e.target.value)} />}
            {q.type === 'CHOICE' && (
              <select id={`q${q.id}`} className="input" value={values[q.id] || ''} onChange={(e) => set(q.id, e.target.value)}>
                <option value="">Choose...</option>{q.options.map((o) => <option key={o}>{o}</option>)}
              </select>
            )}
            {q.type === 'YESNO' && (
              <select id={`q${q.id}`} className="input" value={values[q.id] || ''} onChange={(e) => set(q.id, e.target.value)}>
                <option value="">Choose...</option><option>Yes</option><option>No</option>
              </select>
            )}
            {q.type === 'RATING' && (
              <select id={`q${q.id}`} className="input" value={values[q.id] || ''} onChange={(e) => set(q.id, e.target.value)}>
                <option value="">Rate 1 to 5...</option>{[1, 2, 3, 4, 5].map((n) => <option key={n} value={n}>{n}</option>)}
              </select>
            )}
          </div>
        ))}
        <button className="btn-primary w-full" disabled={busy}>Save answers</button>
      </form>
    );
  };

  return (
    <section className="card space-y-5">
      <h2 className="flex items-center gap-2 font-semibold text-slate-900"><ClipboardList className="h-4 w-4 text-brand-600" /> Questions from the organiser</h2>
      {group('REGISTRATION', 'Before the event', 'Please answer these so the organiser can plan. You can change your answers until the event.')}
      {group('FEEDBACK', 'After the event', 'Thanks for coming. Tell the organiser how it went.')}
    </section>
  );
}
