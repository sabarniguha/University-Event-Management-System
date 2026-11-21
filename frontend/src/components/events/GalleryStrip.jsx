import { useState } from 'react';
import { Heart, Trash2, X } from 'lucide-react';
import useFetch from '../../hooks/useFetch.js';
import api, { mediaUrl } from '../../services/api.js';
import { useToast } from '../../context/ToastContext.jsx';
import ImageUpload from '../forms/ImageUpload.jsx';
import { errMsg } from '../../utils/format.js';

// Sponsors strip and photo gallery for an event page. Renders nothing when the organiser added none.
export default function GalleryStrip({ eventId }) {
  const { data, reload } = useFetch(`/gallery/event/${eventId}`);
  const toast = useToast();
  const [busy, setBusy] = useState(false);
  const up = data?.upload;
  const addMine = async (url) => {
    if (!url) return;
    setBusy(true);
    try { await api.post(`/gallery/event/${eventId}/mine`, { url }); toast.success('Thanks! Your photo will appear once the organiser approves it.'); reload(); } catch (e) { toast.error(errMsg(e)); } finally { setBusy(false); }
  };
  const removeMine = async (id) => { try { await api.delete(`/gallery/mine/${id}`); reload(); } catch (e) { toast.error(errMsg(e)); } };
  const [open, setOpen] = useState(null);
  const sponsors = data?.sponsors || [];
  const photos = data?.photos || [];
  if (sponsors.length === 0 && photos.length === 0 && !up?.allowed) return null;

  return (
    <>
      {sponsors.length > 0 && (
        <section className="card">
          <h2 className="mb-3 flex items-center gap-2 font-semibold text-slate-900"><Heart className="h-4 w-4 text-rose-500" /> Our sponsors</h2>
          <ul className="flex flex-wrap items-center gap-x-8 gap-y-4">
            {sponsors.map((s) => {
              const logo = <img src={mediaUrl(s.url)} alt={s.title} title={s.title} className="h-12 max-w-[9rem] object-contain" loading="lazy" />;
              return <li key={s.id}>{s.link ? <a href={s.link} target="_blank" rel="noopener noreferrer sponsored">{logo}</a> : logo}</li>;
            })}
          </ul>
        </section>
      )}
      {(photos.length > 0 || up?.allowed) && (
        <section className="card">
          <h2 className="mb-3 font-semibold text-slate-900">Photos</h2>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {photos.map((p) => (
              <div key={p.id} className="relative">
                <button type="button" onClick={() => setOpen(p)} className="block w-full overflow-hidden rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500">
                  <img src={mediaUrl(p.url)} alt={p.title || 'Event photo'} className="h-32 w-full object-cover transition hover:scale-105" loading="lazy" />
                </button>
                {p.by === 'Student' && <span className="absolute bottom-1 left-1 rounded bg-slate-900/70 px-1.5 py-0.5 text-[10px] text-white">Student photo</span>}
                {!p.approved && <span className="absolute left-1 top-1 rounded bg-amber-500 px-1.5 py-0.5 text-[10px] font-medium text-white">Waiting for approval</span>}
                {p.mine && <button type="button" className="absolute right-1 top-1 rounded-full bg-slate-900/70 p-1 text-white" onClick={() => removeMine(p.id)} aria-label="Delete my photo"><Trash2 className="h-3.5 w-3.5" /></button>}
              </div>
            ))}
          </div>
          {up?.allowed && (
            <div className="mt-4 border-t border-slate-100 pt-3">
              <p className="mb-2 text-xs text-slate-500">You were at this event. Add a photo ({up.used} of {up.limit} used). The organiser approves it before everyone sees it.</p>
              {!busy && <ImageUpload label="Add your photo" value="" onChange={addMine} />}
            </div>
          )}
        </section>
      )}
      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4" role="dialog" aria-modal="true" onClick={() => setOpen(null)}>
          <button type="button" className="absolute right-4 top-4 rounded-full bg-white/20 p-2 text-white" aria-label="Close" onClick={() => setOpen(null)}><X className="h-5 w-5" /></button>
          <img src={mediaUrl(open.url)} alt={open.title || 'Event photo'} className="max-h-full max-w-full rounded-lg object-contain" onClick={(e) => e.stopPropagation()} />
        </div>
      )}
    </>
  );
}
