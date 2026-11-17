import { useState } from 'react';
import { Heart, X } from 'lucide-react';
import useFetch from '../../hooks/useFetch.js';
import { mediaUrl } from '../../services/api.js';

// Sponsors strip and photo gallery for an event page. Renders nothing when the organiser added none.
export default function GalleryStrip({ eventId }) {
  const { data } = useFetch(`/gallery/event/${eventId}`);
  const [open, setOpen] = useState(null);
  const sponsors = data?.sponsors || [];
  const photos = data?.photos || [];
  if (sponsors.length === 0 && photos.length === 0) return null;

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
      {photos.length > 0 && (
        <section className="card">
          <h2 className="mb-3 font-semibold text-slate-900">Photos</h2>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {photos.map((p) => (
              <button key={p.id} type="button" onClick={() => setOpen(p)} className="overflow-hidden rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500">
                <img src={mediaUrl(p.url)} alt={p.title || 'Event photo'} className="h-32 w-full object-cover transition hover:scale-105" loading="lazy" />
              </button>
            ))}
          </div>
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
