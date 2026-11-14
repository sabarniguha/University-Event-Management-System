import { QRCodeSVG } from 'qrcode.react';
import { fmtDay } from '../../utils/format.js';

const THEMES = {
  classic: { wrap: 'border-[10px] border-double border-amber-500 bg-amber-50 text-slate-900', title: 'font-serif text-amber-800', name: 'font-serif', accent: 'text-amber-700' },
  modern: { wrap: 'border border-slate-300 bg-white text-slate-900 border-t-[14px] border-t-indigo-600', title: 'text-indigo-700', name: 'font-sans', accent: 'text-indigo-600' },
  minimal: { wrap: 'border border-slate-400 bg-white text-slate-900', title: 'text-slate-900', name: 'font-sans', accent: 'text-slate-600' },
};

// A4-landscape certificate. Colours are fixed (not theme variables) so it prints the same in dark mode.
export default function CertificateSheet({ cert }) {
  const t = THEMES[cert.templateKey] || THEMES.classic;
  const verifyUrl = `${window.location.origin}/verify/${cert.certificateId}`;
  return (
    <div className={`mx-auto aspect-[1.414/1] w-full max-w-3xl p-8 sm:p-12 ${t.wrap} print:max-w-none`} style={{ colorScheme: 'light' }}>
      <div className="flex h-full flex-col items-center justify-between text-center">
        <div>
          <p className={`text-xs font-semibold uppercase tracking-[0.3em] ${t.accent}`}>UniEvents</p>
          <h1 className={`mt-2 text-3xl font-bold sm:text-4xl ${t.title}`}>{cert.title}</h1>
        </div>
        <div>
          <p className="text-sm text-slate-600">This is proudly presented to</p>
          <p className={`mt-2 text-3xl font-semibold sm:text-4xl ${t.name}`}>{cert.studentName}</p>
          {cert.department && <p className="mt-1 text-sm text-slate-500">{cert.department}</p>}
          <p className="mx-auto mt-4 max-w-xl text-sm text-slate-700">
            for attending <strong>{cert.eventTitle}</strong> held on {fmtDay(cert.startsAt)} at {cert.venue}.
          </p>
        </div>
        <div className="flex w-full items-end justify-between gap-4 text-left text-xs text-slate-600">
          <div>
            <p className="font-semibold text-slate-900">{cert.signatoryName}</p>
            <p>{cert.signatoryTitle}</p>
            <p className="mt-2">Issued {fmtDay(cert.issuedAt)}</p>
          </div>
          <div className="text-center">
            <QRCodeSVG value={verifyUrl} size={72} />
            <p className="mt-1 font-mono text-[10px]">{cert.certificateId}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
