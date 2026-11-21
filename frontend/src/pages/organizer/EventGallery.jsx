import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { Check, Trash2 } from 'lucide-react';
import api, { mediaUrl } from '../../services/api.js';
import useFetch from '../../hooks/useFetch.js';
import { useToast } from '../../context/ToastContext.jsx';
import DashboardShell from '../../components/DashboardShell.jsx';
import ImageUpload from '../../components/forms/ImageUpload.jsx';
import { ErrorBox, Loader } from '../../components/common/Ui.jsx';
import { errMsg } from '../../utils/format.js';

// Organiser/admin: add event photos and sponsor logos shown on the public event page.
export default function EventGallery() {
  const { id } = useParams();
  const toast = useToast();
  const { data, loading, error, reload } = useFetch(`/gallery/event/${id}`);
  const [photo, setPhoto] = useState('');
  const [sponsor, setSponsor] = useState({ url: '', title: '', link: '' });
  const [busy, setBusy] = useState(false);

  const add = async (body, done) => {
    setBusy(true);
    try { await api.post(`/gallery/event/${id}`, body); done(); reload(); toast.success('Added'); } catch (e) { toast.error(errMsg(e)); } finally { setBusy(false); }
  };
  const approve = async (assetId) => {
    try { await api.patch(`/gallery/${assetId}/approve`); reload(); toast.success('Photo approved'); } catch (e) { toast.error(errMsg(e)); }
  };
  const saveCaption = async (assetId, title, old) => {
    if ((title || '') === (old || '')) return;
    try { await api.patch(`/gallery/${assetId}/caption`, { title }); toast.success('Caption saved'); reload(); } catch (e) { toast.error(errMsg(e)); }
  };
  const remove = async (assetId) => {
    try { await api.delete(`/gallery/${assetId}`); reload(); } catch (e) { toast.error(errMsg(e)); }
  };

  return (
    <DashboardShell title="Photos and sponsors" subtitle="Shown on the public event page." actions={<Link to={`/events/${id}`} className="btn-outline">View event page</Link>}>
      <ErrorBox message={error} />
      {loading && !data ? <Loader /> : (
        <div className="grid gap-4 lg:grid-cols-2">
          <div className="card space-y-3">
            <h2 className="font-semibold text-slate-900">Photos</h2>
            <p className="text-xs text-slate-500">Upload photos from the event, up to 40. Photos added by students show a green Approve button and stay hidden from the public until you approve them. Use the bin to reject one.</p>
            <ImageUpload label="New photo" value={photo} onChange={(v) => { setPhoto(v); if (v) add({ kind: 'PHOTO', url: v }, () => setPhoto('')); }} />
            <div className="grid grid-cols-3 gap-2">
              {(data?.photos || []).map((p) => (
                <div key={p.id}>
                  <div className="relative">
                    <img src={mediaUrl(p.url)} alt="" className="h-24 w-full rounded-lg object-cover" />
                    {p.by && <span className="absolute bottom-1 left-1 rounded bg-slate-900/70 px-1.5 py-0.5 text-[10px] text-white">{p.by}</span>}
                    {!p.approved && <button type="button" className="absolute left-1 top-1 flex items-center gap-1 rounded-full bg-emerald-600 px-2 py-0.5 text-[10px] font-medium text-white" onClick={() => approve(p.id)} aria-label="Approve photo"><Check className="h-3 w-3" /> Approve</button>}
                    <button type="button" className="absolute right-1 top-1 rounded-full bg-slate-900/70 p-1 text-white" onClick={() => remove(p.id)} aria-label="Delete photo"><Trash2 className="h-3.5 w-3.5" /></button>
                  </div>
                  <input className="input mt-1 !py-1 text-xs" defaultValue={p.title || ''} maxLength={100} placeholder="Add a caption" aria-label="Photo caption" onBlur={(e) => saveCaption(p.id, e.target.value, p.title)} />
                </div>
              ))}
            </div>
          </div>
          <div className="card space-y-3">
            <h2 className="font-semibold text-slate-900">Sponsors</h2>
            <p className="text-xs text-slate-500">Add a logo, the sponsor's name and, optionally, their website. Up to 12.</p>
            <form className="space-y-3" onSubmit={(e) => { e.preventDefault(); add({ kind: 'SPONSOR', ...sponsor }, () => setSponsor({ url: '', title: '', link: '' })); }}>
              <ImageUpload label="Logo" value={sponsor.url} onChange={(v) => setSponsor({ ...sponsor, url: v })} />
              <input className="input" placeholder="Sponsor name" value={sponsor.title} onChange={(e) => setSponsor({ ...sponsor, title: e.target.value })} required maxLength={100} aria-label="Sponsor name" />
              <input className="input" placeholder="Website (optional, https://...)" value={sponsor.link} onChange={(e) => setSponsor({ ...sponsor, link: e.target.value })} aria-label="Sponsor website" />
              <button className="btn-primary" disabled={busy || !sponsor.url}>Add sponsor</button>
            </form>
            <ul className="divide-y divide-slate-100">
              {(data?.sponsors || []).map((s) => (
                <li key={s.id} className="flex items-center justify-between gap-3 py-2 text-sm">
                  <span className="flex items-center gap-3"><img src={mediaUrl(s.url)} alt="" className="h-8 w-14 object-contain" />{s.title}</span>
                  <button type="button" className="text-red-500" onClick={() => remove(s.id)} aria-label={`Remove ${s.title}`}><Trash2 className="h-4 w-4" /></button>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </DashboardShell>
  );
}
