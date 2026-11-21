import { mediaUrl } from '../../services/api.js';

// Photos for a report page. Each one is credited to who added it (Student / Organiser / Admin) and
// the event it came from. Images stay inside their box and never split across a printed page.
export default function PhotoGrid({ items }) {
  return (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 print:grid-cols-4">
      {items.map((p, i) => (
        <figure key={`${p.url}-${i}`} className="report-block m-0 overflow-hidden rounded-lg border border-slate-200">
          <img src={mediaUrl(p.url)} alt={p.event || p.title || 'Event photo'} className="h-24 w-full object-cover" />
          <figcaption className="px-1.5 py-1 text-[10px] leading-tight text-slate-600">
            {p.title && <span className="block truncate italic text-slate-700">{p.title}</span>}
            {p.event && <span className="block truncate font-medium text-slate-800">{p.event}</span>}
            <span>{p.approved === false ? 'Waiting for approval' : p.by ? `Added by ${p.by.toLowerCase()}` : ''}</span>
          </figcaption>
        </figure>
      ))}
    </div>
  );
}
