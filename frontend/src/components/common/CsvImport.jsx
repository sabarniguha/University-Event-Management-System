import { useState } from 'react';
import { Upload } from 'lucide-react';
import api from '../../services/api.js';
import { Modal } from './Ui.jsx';
import { parseCsv } from '../../utils/csvParse.js';
import { errMsg } from '../../utils/format.js';

// Generic "upload a CSV, review, import" dialog. The server does all validation; this only reads the file.
// `endpoint` receives { ...extra, rows }. `render` turns the server answer into a summary line.
export default function CsvImport({ open, onClose, title, help, sample, sampleName, endpoint, extra, needed, summary, onDone }) {
  const [rows, setRows] = useState(null);
  const [fileName, setFileName] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState(null);

  const reset = () => { setRows(null); setFileName(''); setError(''); setResult(null); };
  const close = () => { reset(); onClose(); };

  const pick = async (e) => {
    const file = e.target.files?.[0];
    reset();
    if (!file) return;
    if (file.size > 800 * 1024) return setError('That file is too large. Keep it under 800 KB, or split it.');
    const { headers, rows: parsed } = parseCsv(await file.text());
    const missing = needed.filter((h) => !headers.includes(h));
    if (missing.length) return setError(`The first row must be a header containing: ${needed.join(', ')}. Missing: ${missing.join(', ')}.`);
    if (parsed.length === 0) return setError('The file has no data rows.');
    setFileName(file.name);
    return setRows(parsed);
  };

  const send = async () => {
    setBusy(true); setError('');
    try {
      const { data } = await api.post(endpoint, { ...(extra || {}), rows });
      setResult(data);
      onDone?.(data);
    } catch (e) { setError(errMsg(e)); } finally { setBusy(false); }
  };

  const download = () => {
    const url = URL.createObjectURL(new Blob([sample], { type: 'text/csv' }));
    const a = document.createElement('a');
    a.href = url; a.download = sampleName; a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <Modal open={open} onClose={close} title={title} footer={result
      ? <button className="btn-primary" onClick={close}>Done</button>
      : <><button className="btn-ghost" onClick={close}>Cancel</button><button className="btn-primary" disabled={!rows || busy} onClick={send}>{busy ? 'Importing...' : `Import ${rows ? rows.length : ''} row(s)`}</button></>}>
      {result ? (
        <div className="space-y-3 text-sm">
          <p className="font-medium text-slate-900">{summary(result)}</p>
          {result.emailConfigured === false && <p className="rounded-lg bg-amber-50 p-3 text-amber-800">Email is not set up on this server, so no emails were sent. Use "Reset password" on each account, or set the SMTP variables.</p>}
          {result.errors?.length > 0 && (
            <div>
              <p className="mb-1 font-medium text-slate-700">Rows that were skipped</p>
              <ul className="max-h-48 divide-y divide-slate-100 overflow-auto rounded-lg border border-slate-200">
                {result.errors.map((x, i) => <li key={i} className="px-3 py-1.5 text-xs"><span className="text-slate-500">Row {x.line}</span> {x.email || x.value} <span className="text-red-600">{x.reason}</span></li>)}
              </ul>
            </div>
          )}
        </div>
      ) : (
        <div className="space-y-3 text-sm">
          <p className="text-slate-600">{help}</p>
          <button type="button" className="text-brand-600 underline" onClick={download}>Download a sample CSV</button>
          <label className="flex cursor-pointer items-center gap-2 rounded-xl border border-dashed border-slate-300 p-4 hover:bg-slate-50">
            <Upload className="h-4 w-4" /> <span>{fileName ? `${fileName}: ${rows.length} row(s) ready` : 'Choose a .csv file'}</span>
            <input type="file" accept=".csv,text/csv" className="sr-only" onChange={pick} />
          </label>
          {error && <p className="rounded-lg bg-red-50 p-3 text-red-700" role="alert">{error}</p>}
        </div>
      )}
    </Modal>
  );
}
