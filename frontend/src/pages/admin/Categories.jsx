import { useState } from 'react';
import { Pencil, Plus, Trash2 } from 'lucide-react';
import api from '../../services/api.js';
import { useToast } from '../../context/ToastContext.jsx';
import useFetch from '../../hooks/useFetch.js';
import DashboardShell from '../../components/DashboardShell.jsx';
import CategoryIcon, { ICON_NAMES } from '../../components/events/CategoryIcon.jsx';
import { ConfirmDialog, DataTable, ErrorBox, Modal } from '../../components/common/Ui.jsx';
import { errMsg } from '../../utils/format.js';

const BLANK = { name: '', description: '', icon: 'Calendar' };

export default function Categories() {
  const toast = useToast();
  const { data, loading, error, reload } = useFetch('/categories');
  const [edit, setEdit] = useState(null); // null | category | 'new'
  const [form, setForm] = useState(BLANK);
  const [del, setDel] = useState(null);
  const [busy, setBusy] = useState(false);

  const openEdit = (c) => { setEdit(c || 'new'); setForm(c ? { name: c.name, description: c.description || '', icon: c.icon || 'Calendar' } : BLANK); };
  const run = async (fn, ok) => {
    setBusy(true);
    try { await fn(); toast.success(ok); reload(); return true; } catch (e) { toast.error(errMsg(e)); return false; } finally { setBusy(false); }
  };

  return (
    <DashboardShell title="Categories" subtitle="Categories shown on the explore page and used when creating events." actions={<button className="btn-primary" onClick={() => openEdit(null)}><Plus className="h-4 w-4" /> Add category</button>}>
      <ErrorBox message={error} />
      <DataTable columns={['Category', 'Description', 'Upcoming events', '']} loading={loading}>
        {(data?.categories || []).map((c) => (
          <tr key={c.id}>
            <td className="td"><span className="flex items-center gap-2 font-medium text-slate-900"><span className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-50 text-brand-600"><CategoryIcon name={c.icon} className="h-4 w-4" /></span>{c.name}</span></td>
            <td className="td text-slate-500">{c.description || '-'}</td>
            <td className="td">{c.eventCount}</td>
            <td className="td"><div className="flex justify-end gap-1"><button className="btn-ghost btn-sm" onClick={() => openEdit(c)} title="Edit"><Pencil className="h-4 w-4" /></button><button className="btn-ghost btn-sm text-red-600" onClick={() => setDel(c)} title="Delete"><Trash2 className="h-4 w-4" /></button></div></td>
          </tr>
        ))}
      </DataTable>

      <Modal open={Boolean(edit)} onClose={() => setEdit(null)} title={edit === 'new' ? 'Add category' : 'Edit category'}
        footer={<><button className="btn-outline" onClick={() => setEdit(null)}>Cancel</button><button className="btn-primary" form="cat-form" disabled={busy}>Save</button></>}>
        <form id="cat-form" className="space-y-3" onSubmit={async (e) => {
          e.preventDefault();
          const ok = await run(() => (edit === 'new' ? api.post('/categories', form) : api.patch(`/categories/${edit.id}`, form)), 'Category saved.');
          if (ok) setEdit(null);
        }}>
          <div><label className="label" htmlFor="ct-n">Name</label><input id="ct-n" required minLength={2} className="input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
          <div><label className="label" htmlFor="ct-d">Description</label><input id="ct-d" className="input" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></div>
          <div>
            <span className="label">Icon</span>
            <div className="flex flex-wrap gap-2">
              {ICON_NAMES.map((n) => (
                <button type="button" key={n} onClick={() => setForm({ ...form, icon: n })} aria-pressed={form.icon === n} aria-label={n}
                  className={`flex h-9 w-9 items-center justify-center rounded-lg border ${form.icon === n ? 'border-brand-500 bg-brand-50 text-brand-600' : 'border-slate-200 text-slate-500 hover:bg-slate-100'}`}><CategoryIcon name={n} className="h-4 w-4" /></button>
              ))}
            </div>
          </div>
        </form>
      </Modal>
      <ConfirmDialog open={Boolean(del)} onClose={() => setDel(null)} danger busy={busy} title="Delete category?" confirmLabel="Delete" message={del ? `Delete "${del.name}"? Categories that still have events cannot be deleted.` : ''}
        onConfirm={async () => { if (await run(() => api.delete(`/categories/${del.id}`), 'Category deleted.')) setDel(null); }} />
    </DashboardShell>
  );
}
