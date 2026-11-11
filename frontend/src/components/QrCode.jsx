import { QRCodeSVG } from 'qrcode.react';

// Renders a scannable QR code. White background + quiet zone keep it readable in dark rooms.
export default function QrCode({ value, size = 168, label }) {
  return (
    <figure className="inline-flex flex-col items-center gap-2">
      <div className="rounded-xl border border-slate-200 bg-white p-3">
        <QRCodeSVG value={value} size={size} level="M" includeMargin={false} />
      </div>
      {label && <figcaption className="text-xs text-slate-500">{label}</figcaption>}
    </figure>
  );
}
