import { useState } from 'react';
import { EyeOff, Eye, MessageCircleQuestion, Trash2 } from 'lucide-react';
import api from '../../services/api.js';
import useFetch from '../../hooks/useFetch.js';
import { useToast } from '../../context/ToastContext.jsx';
import { errMsg, fmtDate } from '../../utils/format.js';

// Public questions and answers on an event page. Students ask; the organiser or an admin answers or hides.
export default function EventQA({ eventId }) {
  const toast = useToast();
  const { data, reload } = useFetch(`/qa/event/${eventId}`);
  const [text, setText] = useState('');
  const [reply, setReply] = useState({});
  const [busy, setBusy] = useState(false);
  if (!data) return null;

  const act = async (fn, okMsg) => { try { await fn(); if (okMsg) toast.success(okMsg); reload(); } catch (e) { toast.error(errMsg(e)); } };
  const ask = async (e) => {
    e.preventDefault(); setBusy(true);
    await act(async () => { await api.post(`/qa/event/${eventId}`, { question: text }); setText(''); }, 'Your question was sent to the organiser.');
    setBusy(false);
  };

  return (
    <section className="card" aria-labelledby="qa-title">
      <h2 id="qa-title" className="mb-3 flex items-center gap-2 text-lg font-semibold text-slate-900"><MessageCircleQuestion className="h-5 w-5" /> Questions and answers</h2>
      {data.canAsk && (
        <form onSubmit={ask} className="mb-4 flex flex-col gap-2 sm:flex-row">
          <input className="input flex-1" placeholder="Ask the organiser a question" aria-label="Your question" minLength={5} maxLength={300} required value={text} onChange={(e) => setText(e.target.value)} />
          <button className="btn-primary" disabled={busy || text.trim().length < 5}>Ask</button>
        </form>
      )}
      {data.questions.length === 0 ? <p className="text-sm text-slate-500">No questions yet.{data.canAsk ? ' Be the first to ask.' : ''}</p> : (
        <ul className="space-y-3">
          {data.questions.map((q) => (
            <li key={q.id} className={`rounded-xl border px-4 py-3 ${q.hidden ? 'border-amber-200 bg-amber-50' : 'border-slate-200'}`}>
              <p className="font-medium text-slate-900">{q.question}</p>
              <p className="text-xs text-slate-500">Asked by {q.asker} on {fmtDate(q.createdAt)}{q.hidden ? ' · hidden from the public' : ''}</p>
              {q.answer ? <p className="mt-2 rounded-lg bg-slate-50 px-3 py-2 text-sm text-slate-700"><b>Organiser:</b> {q.answer}</p> : <p className="mt-1 text-xs italic text-slate-400">Waiting for an answer</p>}
              <div className="mt-2 flex flex-wrap items-center gap-2">
                {data.manager && (
                  <>
                    <input className="input h-8 flex-1 text-sm" placeholder={q.answer ? 'Edit the answer' : 'Write an answer'} aria-label="Answer" value={reply[q.id] || ''} onChange={(e) => setReply({ ...reply, [q.id]: e.target.value })} />
                    <button className="btn-outline btn-sm" disabled={(reply[q.id] || '').trim().length < 2} onClick={() => act(async () => { await api.patch(`/qa/${q.id}/answer`, { answer: reply[q.id] }); setReply({ ...reply, [q.id]: '' }); }, 'Answer posted.')}>Answer</button>
                    <button className="btn-ghost btn-sm" onClick={() => act(() => api.patch(`/qa/${q.id}/hide`, { hidden: !q.hidden }))} aria-label={q.hidden ? 'Show question' : 'Hide question'}>{q.hidden ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}</button>
                  </>
                )}
                {(data.manager || (q.mine && !q.answer)) && <button className="btn-ghost btn-sm text-red-600" onClick={() => window.confirm('Delete this question?') && act(() => api.delete(`/qa/${q.id}`))} aria-label="Delete question"><Trash2 className="h-4 w-4" /></button>}
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
