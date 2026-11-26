import { useEffect, useState } from 'react';
import api from '../../services/api.js';
import { errMsg } from '../../utils/format.js';

const rupees = (n) => `₹${Number(n).toLocaleString('en-IN')}`;

// "Have a promo code?" for paid events. Shows the real price from the server; the server re-checks it when paying.
export default function PromoBox({ eventId, code, onCode }) {
  const [price, setPrice] = useState(null);
  const [msg, setMsg] = useState('');
  const [busy, setBusy] = useState(false);

  // Early-bird pricing shows even without a code.
  useEffect(() => { api.post('/discounts/check', { eventId }).then(({ data }) => setPrice(data)).catch(() => {}); }, [eventId]);

  const apply = async () => {
    setBusy(true); setMsg('');
    try { const { data } = await api.post('/discounts/check', { eventId, code }); setPrice(data); setMsg(code.trim() ? 'Code applied.' : ''); } catch (e) { setMsg(errMsg(e)); onCode(''); } finally { setBusy(false); }
  };

  return (
    <div className="space-y-1 text-left">
      <div className="flex gap-2">
        <input className="input flex-1" placeholder="Promo code (optional)" aria-label="Promo code" maxLength={20} value={code} onChange={(e) => onCode(e.target.value)} />
        <button type="button" className="btn-outline btn-sm" onClick={apply} disabled={busy || !code.trim()}>Apply</button>
      </div>
      {msg && <p className={`text-xs ${msg === 'Code applied.' ? 'text-green-700' : 'text-red-600'}`}>{msg}</p>}
      {price && (price.earlyBird || price.codeApplied) && (
        <p className="text-sm text-slate-700">You pay <b>{rupees(price.final)}</b>{price.final !== price.list && <span className="ml-1 text-slate-400 line-through">{rupees(price.list)}</span>}{price.earlyBird && <span className="ml-1 text-xs text-green-700">(early-bird price)</span>}</p>
      )}
    </div>
  );
}
