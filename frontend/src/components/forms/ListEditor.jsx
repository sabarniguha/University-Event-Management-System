import { Plus, Trash2 } from 'lucide-react';

// Editable list of small records (agenda items, speakers, FAQs...).
// fields: [{ key, label, placeholder, multiline, required, width }]
export default function ListEditor({ title, items, onChange, fields, blank, addLabel = 'Add' }) {
  const update = (i, key, value) => onChange(items.map((it, idx) => (idx === i ? { ...it, [key]: value } : it)));
  return (
    <div>
      <div className="mb-2 flex items-center justify-between">
        <span className="label !mb-0">{title}</span>
        <button type="button" className="btn-outline btn-sm" onClick={() => onChange([...items, { ...blank }])}><Plus className="h-3.5 w-3.5" /> {addLabel}</button>
      </div>
      {items.length === 0 && <p className="rounded-xl border border-dashed border-slate-300 px-3 py-4 text-center text-xs text-slate-400">Nothing added yet.</p>}
      <ul className="space-y-3">
        {items.map((it, i) => (
          <li key={i} className="flex gap-2 rounded-xl border border-slate-200 p-3">
            <div className="grid flex-1 gap-2 sm:grid-cols-2">
              {fields.map((f) => (
                <div key={f.key} className={f.wide || f.multiline ? 'sm:col-span-2' : ''}>
                  {f.multiline ? (
                    <textarea className="input min-h-[60px]" placeholder={f.label} aria-label={f.label} required={f.required} value={it[f.key] || ''} onChange={(e) => update(i, f.key, e.target.value)} />
                  ) : (
                    <input className="input" placeholder={f.label} aria-label={f.label} required={f.required} value={it[f.key] || ''} onChange={(e) => update(i, f.key, e.target.value)} />
                  )}
                </div>
              ))}
            </div>
            <button type="button" className="self-start rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-red-600" onClick={() => onChange(items.filter((_, idx) => idx !== i))} aria-label="Remove"><Trash2 className="h-4 w-4" /></button>
          </li>
        ))}
      </ul>
    </div>
  );
}
