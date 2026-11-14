import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { Award, Eye, Undo2, XCircle } from 'lucide-react';
import api from '../../services/api.js';
import { useToast } from '../../context/ToastContext.jsx';
import useFetch from '../../hooks/useFetch.js';
import DashboardShell from '../../components/DashboardShell.jsx';
import EventPicker from '../../components/events/EventPicker.jsx';
import { Badge, DataTable, EmptyState, ErrorBox, Modal } from '../../components/common/Ui.jsx';
import CertificateSheet from '../../components/tickets/CertificateSheet.jsx';
import { errMsg, fmtDay } from '../../utils/format.js';

const TEMPLATES = [['classic', 'Classic'], ['modern', 'Modern'], ['minimal', 'Minimal']];

function EventCertificates({ id }) {
  const toast = useToast();
  const { data, loading, error, reload } = useFetch(`/certificates/event/${id}`);
  const { data: ev } = useFetch(`/events/${id}`);
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState({ templateKey: 'classic', title: 'Certificate of Participation', signatoryName: '', signatoryTitle: '' });
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  const generate = async () => {
    setBusy(true);
    try {
      const { data: res } = await api.post('/certificates/generate', { eventId: Number(id), ...form });
      toast.success(res.issued ? `Issued ${res.issued} certificate(s).` : res.message);
      setOpen(false);
      reload();
    } catch (e) {
      toast.error(errMsg(e));
    } finally {
      setBusy(false);
    }
  };

  const toggle = async (c) => {
    try { await api.patch(`/certificates/${c.certificateId}/revoke`); reload(); } catch (e) { toast.error(errMsg(e)); }
  };

  const list = data?.certificates || [];
  const preview = {
    ...form, certificateId: 'UNI-PREVIEW00000', studentName: 'Student Name', department: 'Department', eventTitle: ev?.event?.title || 'Event title',
    venue: ev?.event?.venue || 'Venue', startsAt: ev?.event?.startsAt || new Date(), issuedAt: new Date(),
    signatoryName: form.signatoryName || 'Organiser', signatoryTitle: form.signatoryTitle || 'Event Organiser',
  };

  return (
    <DashboardShell
      title={data ? `Certificates: ${data.event.title}` : 'Certificates'}
      subtitle="Certificates go only to students who were marked present."
      actions={<button className="btn-primary" onClick={() => setOpen(true)} disabled={!data || data.pendingCount === 0}><Award className="h-4 w-4" /> Generate for {data?.pendingCount ?? 0} attendee(s)</button>}
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
              <Link to={`/organizer/certificates/view/${c.certificateId}`} className="btn-ghost btn-sm" title="View"><Eye className="h-4 w-4" /></Link>
              <button className="btn-ghost btn-sm" onClick={() => toggle(c)} title={c.revoked ? 'Restore' : 'Revoke'}>{c.revoked ? <Undo2 className="h-4 w-4" /> : <XCircle className="h-4 w-4 text-red-600" />}</button>
            </td>
          </tr>
        ))}
      </DataTable>

      <Modal open={open} onClose={() => setOpen(false)} wide title="Generate certificates"
        footer={<><button className="btn-outline" onClick={() => setOpen(false)}>Cancel</button><button className="btn-primary" disabled={busy} onClick={generate}>{busy ? 'Generating...' : `Issue ${data?.pendingCount || 0}`}</button></>}>
        <div className="grid gap-3 sm:grid-cols-2">
          <div><label className="label" htmlFor="tpl">Template</label><select id="tpl" className="input" value={form.templateKey} onChange={set('templateKey')}>{TEMPLATES.map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select></div>
          <div><label className="label" htmlFor="ttl">Certificate title</label><input id="ttl" className="input" value={form.title} onChange={set('title')} /></div>
          <div><label className="label" htmlFor="sn">Signatory name</label><input id="sn" className="input" value={form.signatoryName} onChange={set('signatoryName')} /></div>
          <div><label className="label" htmlFor="st">Signatory title</label><input id="st" className="input" value={form.signatoryTitle} onChange={set('signatoryTitle')} /></div>
        </div>
        <p className="mb-2 mt-4 text-xs font-medium uppercase text-slate-500">Preview</p>
        <div className="origin-top-left overflow-hidden rounded-xl border border-slate-200"><CertificateSheet cert={preview} /></div>
      </Modal>
    </DashboardShell>
  );
}

export default function OrganizerCertificates() {
  const { id } = useParams();
  if (id) return <EventCertificates id={id} />;
  return (
    <DashboardShell title="Certificates" subtitle="Choose an event to issue or manage its certificates.">
      <EventPicker filter={(e) => e.status === 'PUBLISHED' && new Date(e.startsAt) <= new Date()} empty="Certificates can be issued once an event has started."
        renderAction={(e) => <Link to={`/organizer/events/${e.id}/certificates`} className="btn-outline btn-sm">Manage</Link>} />
    </DashboardShell>
  );
}
