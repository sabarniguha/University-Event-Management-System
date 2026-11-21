import { useEffect, useRef, useState } from 'react';
import { Bot, Send, Trash2, X } from 'lucide-react';
import api from '../../services/api.js';
import { useAuth } from '../../context/AuthContext.jsx';
import { errMsg } from '../../utils/format.js';

const IDEAS = {
  STUDENT: ['Which events can I still register for?', 'What events do I have coming up?', 'How do I download my report?', 'How do I add photos to an event?'],
  ORGANIZER: ['How are my recent events doing?', 'Do I have photos or registrations waiting for approval?', 'How do I mark attendance?', 'How do I issue certificates?'],
  ADMIN: ['What needs my attention today?', 'Which events are waiting for approval?', 'How do I import students from a CSV?', 'How do I turn on two-factor sign-in?'],
};

// A small chat for every signed-in role. It only appears when the server has an assistant key set up.
// The conversation lives in this component only: nothing is stored in the browser.
export default function AssistantWidget() {
  const { user } = useAuth();
  const [enabled, setEnabled] = useState(false);
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const end = useRef(null);

  useEffect(() => {
    let live = true;
    api.get('/assistant/status').then((r) => live && setEnabled(!!r.data.enabled)).catch(() => {});
    return () => { live = false; };
  }, []);
  useEffect(() => { end.current?.scrollIntoView({ block: 'end' }); }, [messages, busy, open]);

  if (!enabled) return null;

  const send = async (q) => {
    const content = (q ?? text).trim();
    if (!content || busy) return;
    const next = [...messages, { role: 'user', content }];
    setMessages(next); setText(''); setError(''); setBusy(true);
    try {
      const r = await api.post('/assistant/chat', { messages: next.slice(-10) });
      setMessages([...next, { role: 'assistant', content: r.data.reply }]);
    } catch (e) {
      setError(errMsg(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="print:hidden">
      {!open && (
        <button type="button" onClick={() => setOpen(true)} className="fixed bottom-4 right-4 z-40 flex items-center gap-2 rounded-full bg-brand-600 px-4 py-3 text-sm font-semibold text-white shadow-lg hover:bg-brand-700 focus:outline-none focus:ring-2 focus:ring-brand-400" aria-label="Open the AI assistant">
          <Bot className="h-5 w-5" /> Ask AI
        </button>
      )}
      {open && (
        <section className="fixed inset-x-2 bottom-2 z-50 flex max-h-[80vh] flex-col rounded-2xl border border-slate-200 bg-white shadow-2xl sm:inset-x-auto sm:bottom-4 sm:right-4 sm:w-96" role="dialog" aria-label="AI assistant">
          <header className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
            <p className="flex items-center gap-2 text-sm font-semibold text-slate-900"><Bot className="h-4 w-4 text-brand-600" /> UniEvents assistant</p>
            <div className="flex items-center gap-1">
              {messages.length > 0 && <button type="button" className="rounded p-1 text-slate-500 hover:bg-slate-100" onClick={() => { setMessages([]); setError(''); }} aria-label="Clear the conversation"><Trash2 className="h-4 w-4" /></button>}
              <button type="button" className="rounded p-1 text-slate-500 hover:bg-slate-100" onClick={() => setOpen(false)} aria-label="Close the assistant"><X className="h-4 w-4" /></button>
            </div>
          </header>
          <div className="flex-1 space-y-3 overflow-y-auto px-4 py-3 text-sm" aria-live="polite">
            {messages.length === 0 && (
              <div>
                <p className="text-slate-700">Hi {String(user.name).split(' ')[0]}! Ask me about your events and how to use UniEvents.</p>
                <div className="mt-3 flex flex-wrap gap-2">{(IDEAS[user.role] || []).map((q) => <button key={q} type="button" className="rounded-full border border-slate-200 px-3 py-1 text-left text-xs text-slate-700 hover:bg-slate-50" onClick={() => send(q)}>{q}</button>)}</div>
              </div>
            )}
            {messages.map((m, i) => (
              <div key={i} className={m.role === 'user' ? 'flex justify-end' : 'flex justify-start'}>
                <p className={`max-w-[85%] whitespace-pre-wrap rounded-2xl px-3 py-2 ${m.role === 'user' ? 'bg-brand-600 text-white' : 'bg-slate-100 text-slate-800'}`}>{m.content}</p>
              </div>
            ))}
            {busy && <p className="text-xs text-slate-500">Thinking...</p>}
            {error && <p className="rounded-lg bg-red-50 p-2 text-xs text-red-700" role="alert">{error}</p>}
            <div ref={end} />
          </div>
          <form className="flex items-center gap-2 border-t border-slate-100 p-3" onSubmit={(e) => { e.preventDefault(); send(); }}>
            <label className="sr-only" htmlFor="ai-q">Your question</label>
            <input id="ai-q" className="input flex-1" placeholder="Ask a question" value={text} onChange={(e) => setText(e.target.value)} maxLength={1500} autoComplete="off" />
            <button className="btn-primary !px-3" disabled={busy || !text.trim()} aria-label="Send"><Send className="h-4 w-4" /></button>
          </form>
          <p className="px-4 pb-2 text-[10px] text-slate-400">AI can make mistakes. Check important details on the page itself. It can read and explain but cannot change anything.</p>
        </section>
      )}
    </div>
  );
}
