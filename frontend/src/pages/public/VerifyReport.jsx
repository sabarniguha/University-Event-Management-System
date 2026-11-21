import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { BadgeCheck, ShieldAlert } from 'lucide-react';
import api from '../../services/api.js';
import { errMsg, fmtDate } from '../../utils/format.js';
import { Loader } from '../../components/common/Ui.jsx';

// Public page: anyone can check that a report ID printed on a UniEvents PDF is genuine.
export default function VerifyReport() {
  const [params, setParams] = useSearchParams();
  const code = (params.get('code') || '').trim();
  const [input, setInput] = useState(code);
  const [state, setState] = useState({ loading: false, result: null, error: '' });

  useEffect(() => {
    if (!code) return undefined;
    let live = true;
    setState({ loading: true, result: null, error: '' });
    api.get(`/reports/verify/${encodeURIComponent(code)}`).then((r) => live && setState({ loading: false, result: r.data, error: '' })).catch((e) => live && setState({ loading: false, result: null, error: errMsg(e) }));
    return () => { live = false; };
  }, [code]);

  const r = state.result;
  return (
    <div className="mx-auto max-w-xl px-4 py-10">
      <h1 className="text-2xl font-bold text-slate-900">Verify a report</h1>
      <p className="mt-1 text-sm text-slate-600">Enter the Report ID printed on the cover of a UniEvents report, or scan its QR code.</p>
      <form className="mt-5 flex gap-2" onSubmit={(e) => { e.preventDefault(); setParams(input.trim() ? { code: input.trim() } : {}); }}>
        <label className="sr-only" htmlFor="rid">Report ID</label>
        <input id="rid" className="input flex-1 font-mono" placeholder="RPT-XXXX-XXXX-XXXX" value={input} onChange={(e) => setInput(e.target.value)} maxLength={30} />
        <button className="btn-primary">Check</button>
      </form>
      {state.loading && <Loader />}
      {state.error && <p className="mt-4 rounded-lg bg-red-50 p-3 text-sm text-red-700" role="alert">{state.error}</p>}
      {r && r.valid && (
        <div className="card mt-6 border-emerald-200">
          <p className="flex items-center gap-2 font-semibold text-emerald-700"><BadgeCheck className="h-5 w-5" /> This report was issued by UniEvents</p>
          <dl className="mt-3 grid grid-cols-3 gap-y-1.5 text-sm">
            <dt className="text-slate-500">Report</dt><dd className="col-span-2 font-medium text-slate-900">{r.kindLabel}</dd>
            <dt className="text-slate-500">For</dt><dd className="col-span-2 text-slate-900">{r.subject}</dd>
            <dt className="text-slate-500">Covers</dt><dd className="col-span-2 text-slate-900">{r.periodLabel}</dd>
            <dt className="text-slate-500">First issued</dt><dd className="col-span-2 text-slate-900">{fmtDate(r.issuedAt)}</dd>
            <dt className="text-slate-500">ID</dt><dd className="col-span-2 font-mono text-slate-900">{r.code}</dd>
          </dl>
          <h2 className="mt-4 text-sm font-semibold text-slate-900">Headline figures at the time</h2>
          <ul className="mt-1 divide-y divide-slate-100 text-sm">{r.figures.map((f) => <li key={f.label} className="flex justify-between py-1"><span className="text-slate-600">{f.label}</span><b>{f.value}</b></li>)}</ul>
          <p className="mt-3 text-xs text-slate-500">Compare these with the figures in the document you were given. If they differ, the document was changed.</p>
        </div>
      )}
      {r && !r.valid && (
        <div className="card mt-6 border-red-200">
          <p className="flex items-center gap-2 font-semibold text-red-700"><ShieldAlert className="h-5 w-5" /> No report found with this ID</p>
          <p className="mt-1 text-sm text-slate-600">Check the ID for typing mistakes. A report whose figures were edited will not match any issued ID.</p>
        </div>
      )}
    </div>
  );
}
