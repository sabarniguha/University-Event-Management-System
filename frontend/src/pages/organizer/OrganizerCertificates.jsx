import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { Award, Eye, Pencil, Undo2, XCircle } from 'lucide-react';
import api from '../../services/api.js';
import { useAuth } from '../../context/AuthContext.jsx';
import { useToast } from '../../context/ToastContext.jsx';
import useFetch from '../../hooks/useFetch.js';
import DashboardShell from '../../components/DashboardShell.jsx';
import EventPicker from '../../components/events/EventPicker.jsx';
import { Badge, DataTable, EmptyState, ErrorBox, Modal } from '../../components/common/Ui.jsx';
import CertificateSheet from '../../components/tickets/CertificateSheet.jsx';
import { errMsg, fmtDay } from '../../utils/format.js';
import { SampleCertificate, SampleTicket, VerifyLinks } from '../../components/verify/Samples.jsx';

const TEMPLATES = [['classic', 'Classic'], ['modern', 'Modern'], ['minimal', 'Minimal']];
const REMARKS = ['Outstanding performance', 'Excellent participation', 'Active and enthusiastic', 'Showed great teamwork', 'Good effort'];

function EventCertificates({ id }) {
  const toast = useToast();
  const { data, loading, error, reload } = useFetch(`/certificates/event/${id}`);
  const { data: ev } = useFetch(`/events/${id}`);
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [includeRegistered, setIncludeRegistered] = useState(false);
  const [form, setForm] = useState({ templateKey: 'classic', title: 'Certificate of Participation', signatoryName: '', signatoryTitle: '' });
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });
  // Name and remark for each student (optional). Anything left alone behaves as before: account name, no remark.
  const { data: elig, reload: reloadElig } = useFetch(`/certificates/event/${id}/eligible`, { includeRegistered: includeRegistered ? 1 : 0 });
  const students = elig?.students || [];
  const [sel, setSel] = useState({});
  const [names, setNames] = useState({});
  const [rem, setRem] = useState({});
  const [defaultRemark, setDefaultRemark] = useState('');
  const [edit, setEdit] = useState(null);
  const chosen = students.filter((s) => sel[s.registrationId] !== false);

  const generate = async () => {
    setBusy(true);
    try {
      const recipients = chosen.map((s) => ({ registrationId: s.registrationId, name: (names[s.registrationId] ?? '').trim() && names[s.registrationId].trim() !== s.name ? names[s.registrationId].trim() : undefined, remarks: (rem[s.registrationId] || '').trim() || undefined }))
        .filter((r) => r.name || r.remarks);
      const body = { eventId: Number(id), ...form, includeRegistered, ...(defaultRemark.trim() ? { remarks: defaultRemark.trim() } : {}), ...(recipients.length ? { recipients } : {}) };
      if (chosen.length < students.length) body.registrationIds = chosen.map((s) => s.registrationId);
      const { data: res } = await api.post('/certificates/generate', body);
      toast.success(res.issued ? `Issued ${res.issued} certificate(s).` : res.message);
      setOpen(false);
      setSel({}); setNames({}); setRem({}); setDefaultRemark('');
      reload();
      reloadElig();
    } catch (e) {
      toast.error(errMsg(e));
    } finally {
      setBusy(false);
    }
  };

  const saveEdit = async () => {
    try {
      await api.patch(`/certificates/${edit.certificateId}`, { name: edit.name, remarks: edit.remarks });
      toast.success('Certificate updated');
      setEdit(null);
      reload();
    } catch (e) { toast.error(errMsg(e)); }
  };

  const toggle = async (c) => {
    try { await api.patch(`/certificates/${c.certificateId}/revoke`); reload(); } catch (e) { toast.error(errMsg(e)); }
  };

  const list = data?.certificates || [];
  const first = chosen[0];
  const preview = {
    ...form, certificateId: 'UNI-PREVIEW00000', studentName: (first && (names[first.registrationId] || '').trim()) || first?.name || 'Student Name',
    remarks: (first && (rem[first.registrationId] || '').trim()) || defaultRemark.trim() || null, department: 'Department', eventTitle: ev?.event?.title || 'Event title',
    venue: ev?.event?.venue || 'Venue', startsAt: ev?.event?.startsAt || new Date(), issuedAt: new Date(),
    signatoryName: form.signatoryName || 'Organiser', signatoryTitle: form.signatoryTitle || 'Event Organiser',
  };

  return (
    <DashboardShell
      title={data ? `Certificates: ${data.event.title}` : 'Certificates'}
      subtitle="By default certificates go to students who were marked present. You can also certify everyone who registered."
      actions={<button className="btn-primary" onClick={() => setOpen(true)} disabled={!data || (data.pendingCount === 0 && data.registeredPendingCount === 0)}><Award className="h-4 w-4" /> Generate certificates</button>}
    >
      <ErrorBox message={error} />
      <DataTable columns={['Student', 'Certificate ID', 'Issued', 'Status', '']} loading={loading}
        empty={list.length === 0 && <div className="p-6"><EmptyState icon={Award} title="No certificates issued yet">Mark attendance first, then generate certificates for everyone who attended.</EmptyState></div>}>
        {list.map((c) => (
          <tr key={c.certificateId}>
            <td className="td font-medium text-slate-900">{c.studentName}</td>
            <td className="td font-mono text-xs">{c.certificateId}</td>
            <td className="td">{fmtDay(c.issuedAt)}</td>
            <td className="td">{c.revoked ? <Badge tone="red">Revoked</Badge> : <Badge tone="green">Valid</Badge>}</td>
            <td className="td text-right">
              <button className="btn-ghost btn-sm" onClick={() => setEdit({ certificateId: c.certificateId, name: c.nameCustomised ? c.studentName : '', accountName: c.accountName, remarks: c.remarks || '' })} title="Edit name and remarks"><Pencil className="h-4 w-4" /></button>
              <Link to={`/organizer/certificates/view/${c.certificateId}`} className="btn-ghost btn-sm" title="View"><Eye className="h-4 w-4" /></Link>
              <button className="btn-ghost btn-sm" onClick={() => toggle(c)} title={c.revoked ? 'Restore' : 'Revoke'}>{c.revoked ? <Undo2 className="h-4 w-4" /> : <XCircle className="h-4 w-4 text-red-600" />}</button>
            </td>
          </tr>
        ))}
      </DataTable>

      <Modal open={open} onClose={() => setOpen(false)} wide title="Generate certificates"
        footer={<><button className="btn-outline" onClick={() => setOpen(false)}>Cancel</button><button className="btn-primary" disabled={busy} onClick={generate}>{busy ? 'Generating...' : `Issue ${elig ? chosen.length : includeRegistered ? data?.registeredPendingCount || 0 : data?.pendingCount || 0}`}</button></>}>
        <div className="grid gap-3 sm:grid-cols-2">
          <div><label className="label" htmlFor="tpl">Template</label><select id="tpl" className="input" value={form.templateKey} onChange={set('templateKey')}>{TEMPLATES.map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select></div>
          <div><label className="label" htmlFor="ttl">Certificate title</label><input id="ttl" className="input" value={form.title} onChange={set('title')} /></div>
          <div><label className="label" htmlFor="sn">Signatory name</label><input id="sn" className="input" value={form.signatoryName} onChange={set('signatoryName')} /></div>
          <div><label className="label" htmlFor="st">Signatory title</label><input id="st" className="input" value={form.signatoryTitle} onChange={set('signatoryTitle')} /></div>
        </div>
        <label className="mt-4 flex items-start gap-2 text-sm">
          <input type="checkbox" className="mt-1" checked={includeRegistered} onChange={(e) => setIncludeRegistered(e.target.checked)} />
          <span>Also certify registered students who were not scanned at the door.<br /><span className="text-xs text-slate-500">{data?.pendingCount ?? 0} marked present, {data?.registeredPendingCount ?? 0} registered in total are waiting for a certificate.</span></span>
        </label>
        <div className="mt-4 rounded-xl border border-slate-200 p-3">
          <p className="text-sm font-semibold text-slate-900">Names and remarks (optional)</p>
          <p className="mb-2 text-xs text-slate-500">The name is what is printed on the certificate (it starts as the student's account name, so fix spellings here). A remark is a short note on how the student did.</p>
          <label className="label" htmlFor="dr">Remark for everyone without their own</label>
          <input id="dr" className="input" maxLength={300} placeholder="e.g. Active participation" value={defaultRemark} onChange={(e) => setDefaultRemark(e.target.value)} />
          <div className="mt-2 flex flex-wrap gap-1.5">{REMARKS.map((r) => <button key={r} type="button" className="rounded-full border border-slate-200 px-2.5 py-0.5 text-xs text-slate-700 hover:bg-slate-50" onClick={() => setDefaultRemark(r)}>{r}</button>)}</div>
          {students.length > 0 && (
            <div className="mt-3 max-h-72 overflow-auto rounded-lg border border-slate-100">
              <table className="w-full text-left text-sm">
                <thead className="sticky top-0 bg-slate-50 text-xs uppercase text-slate-500"><tr><th className="p-2"><input type="checkbox" aria-label="Select all" checked={chosen.length === students.length} onChange={(e) => setSel(Object.fromEntries(students.map((s) => [s.registrationId, e.target.checked])))} /></th><th className="p-2">Name on certificate</th><th className="p-2">Remark</th></tr></thead>
                <tbody>{students.map((s) => (
                  <tr key={s.registrationId} className="border-t border-slate-100">
                    <td className="p-2 align-top"><input type="checkbox" aria-label={`Include ${s.name}`} checked={sel[s.registrationId] !== false} onChange={(e) => setSel({ ...sel, [s.registrationId]: e.target.checked })} /></td>
                    <td className="p-2 align-top"><input className="input !py-1" aria-label={`Name for ${s.name}`} maxLength={100} value={names[s.registrationId] ?? s.name} onChange={(e) => setNames({ ...names, [s.registrationId]: e.target.value })} /><span className="text-[11px] text-slate-400">{s.studentId || ''}{s.present ? '' : ' - not scanned'}</span></td>
                    <td className="p-2 align-top"><input className="input !py-1" aria-label={`Remark for ${s.name}`} maxLength={300} placeholder={defaultRemark || 'Optional'} value={rem[s.registrationId] || ''} onChange={(e) => setRem({ ...rem, [s.registrationId]: e.target.value })} /></td>
                  </tr>))}</tbody>
              </table>
            </div>
          )}
        </div>
        <p className="mb-2 mt-4 text-xs font-medium uppercase text-slate-500">Preview</p>
        <div className="origin-top-left overflow-hidden rounded-xl border border-slate-200"><CertificateSheet cert={preview} /></div>
      </Modal>
      <Modal open={Boolean(edit)} onClose={() => setEdit(null)} title="Edit name and remarks"
        footer={<><button className="btn-outline" onClick={() => setEdit(null)}>Cancel</button><button className="btn-primary" onClick={saveEdit}>Save</button></>}>
        {edit && (
          <div className="space-y-3">
            <div><label className="label" htmlFor="en">Name on certificate</label><input id="en" className="input" maxLength={100} placeholder={edit.accountName} value={edit.name} onChange={(e) => setEdit({ ...edit, name: e.target.value })} /><p className="mt-1 text-xs text-slate-500">Leave empty to use the account name ({edit.accountName}).</p></div>
            <div><label className="label" htmlFor="er">Remarks</label><textarea id="er" className="input" rows={3} maxLength={300} value={edit.remarks} onChange={(e) => setEdit({ ...edit, remarks: e.target.value })} /></div>
          </div>
        )}
      </Modal>
    </DashboardShell>
  );
}

export default function OrganizerCertificates() {
  const { id } = useParams();
  const { user } = useAuth();
  if (id) return <EventCertificates id={id} />;
  return (
    <DashboardShell title="Certificates" subtitle="Choose an event to issue or manage its certificates.">
      <EventPicker filter={(e) => e.status === 'PUBLISHED'} empty="Publish an event first, then you can issue its certificates."
        renderAction={(e) => <Link to={`/organizer/events/${e.id}/certificates`} className="btn-outline btn-sm">Manage</Link>} />
      <SampleCertificate />
      <VerifyLinks />
    </DashboardShell>
  );
}
