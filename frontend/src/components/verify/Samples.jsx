import { Link } from 'react-router-dom';
import CertificateSheet from '../tickets/CertificateSheet.jsx';
import QrCode from '../QrCode.jsx';

const SAMPLE_CERT = {
  certificateId: 'UNI-SAMPLE000000',
  templateKey: 'classic',
  title: 'Certificate of Participation',
  studentName: 'Your Name Here',
  department: 'Computer Science and Engineering',
  eventTitle: 'UEM Hackathon 2026',
  startsAt: '2026-12-12T09:00:00Z',
  venue: 'UEM Kolkata Auditorium',
  signatoryName: 'Event Organiser',
  signatoryTitle: 'UEM Technical Society',
  issuedAt: '2026-12-13T09:00:00Z',
};

// What a certificate looks like. Clearly marked as a sample: it is not a real certificate and does not verify.
export function SampleCertificate() {
  return (
    <section className="card space-y-3">
      <div>
        <h2 className="font-semibold text-slate-900">Sample certificate</h2>
        <p className="text-sm text-slate-500">This is how a certificate looks once an event ends and the organiser issues it. Every real certificate has its own ID and QR code that anyone can verify.</p>
      </div>
      <div className="relative overflow-hidden rounded-xl">
        <CertificateSheet cert={SAMPLE_CERT} />
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
          <span className="-rotate-12 rounded-lg border-4 border-red-400/60 px-6 py-2 text-5xl font-black uppercase tracking-widest text-red-400/50 sm:text-7xl">Sample</span>
        </div>
      </div>
    </section>
  );
}

// What a ticket looks like. The QR value is a fixed sample, so it will not check anyone in.
export function SampleTicket() {
  return (
    <section className="card space-y-3">
      <div>
        <h2 className="font-semibold text-slate-900">Sample ticket</h2>
        <p className="text-sm text-slate-500">After you register, each event gives you a ticket like this. Show the QR code at the door and the organiser scans it to mark you present.</p>
      </div>
      <div className="mx-auto flex max-w-xs flex-col items-center rounded-2xl border-2 border-dashed border-slate-300 p-5 text-center">
        <span className="mb-2 rounded-full bg-slate-100 px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wide text-slate-500">Sample ticket</span>
        <QrCode value="UEMS:SAMPLE-NOT-A-REAL-TICKET" size={150} />
        <p className="mt-3 font-semibold text-slate-900">UEM Hackathon 2026</p>
        <p className="text-sm text-slate-500">12 Dec 2026, 9:00 AM</p>
        <p className="text-sm text-slate-500">UEM Kolkata Auditorium</p>
        <p className="mt-2 break-all font-mono text-[11px] text-slate-400">0123456789abcdef0123456789abcdef</p>
      </div>
    </section>
  );
}

// Anyone (student, organiser, admin or a visitor) can check a certificate ID or a ticket code.
export function VerifyLinks() {
  return (
    <section className="card">
      <h2 className="font-semibold text-slate-900">Verify an ID</h2>
      <p className="mt-1 text-sm text-slate-500">Check that a certificate or a ticket is genuine. No sign-in needed, so you can share these links.</p>
      <div className="mt-3 flex flex-wrap gap-2">
        <Link to="/verify" className="btn-outline">Verify a certificate ID</Link>
        <Link to="/verify-ticket" className="btn-outline">Verify a ticket code</Link>
      </div>
    </section>
  );
}
