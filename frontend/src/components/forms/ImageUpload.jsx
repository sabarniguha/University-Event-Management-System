import { useState } from 'react';
import { ImagePlus, Loader2, X } from 'lucide-react';
import { mediaUrl, uploadImage } from '../../services/api.js';
import { useToast } from '../../context/ToastContext.jsx';
import { errMsg } from '../../utils/format.js';

// Picks an image, uploads it to the server and reports the stored URL.
export default function ImageUpload({ value, onChange, label = 'Cover image' }) {
  const toast = useToast();
  const [busy, setBusy] = useState(false);

  const pick = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    if (file.size > 1.5 * 1024 * 1024) return toast.error('Choose an image under 1.5 MB.');
    setBusy(true);
    try {
      onChange(await uploadImage(file));
    } catch (err) {
      toast.error(errMsg(err));
    } finally {
      setBusy(false);
    }
    return undefined;
  };

  return (
    <div>
      <span className="label">{label}</span>
      {value ? (
        <div className="relative overflow-hidden rounded-xl border border-slate-200">
          <img src={mediaUrl(value)} alt="" className="h-44 w-full object-cover" />
          <button type="button" onClick={() => onChange('')} className="absolute right-2 top-2 rounded-full bg-slate-900/70 p-1.5 text-white hover:bg-slate-900" aria-label="Remove image"><X className="h-4 w-4" /></button>
        </div>
      ) : (
        <label className="flex h-32 cursor-pointer flex-col items-center justify-center gap-1 rounded-xl border-2 border-dashed border-slate-300 text-sm text-slate-500 hover:border-brand-400 hover:text-brand-600">
          {busy ? <Loader2 className="h-6 w-6 animate-spin" /> : <ImagePlus className="h-6 w-6" />}
          {busy ? 'Uploading...' : 'Click to upload (PNG, JPEG, WebP, GIF up to 1.5 MB)'}
          <input type="file" accept="image/png,image/jpeg,image/webp,image/gif" className="sr-only" onChange={pick} disabled={busy} />
        </label>
      )}
    </div>
  );
}
