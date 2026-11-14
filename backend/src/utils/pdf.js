// Dependency-free PDF writer, just enough to produce a one-page A4 landscape certificate.
// Uses the PDF built-in fonts (Helvetica / Helvetica-Bold), so nothing needs to be embedded or installed.
const W = 842;
const H = 595;

// Helvetica glyph widths (per 1000 units) for ASCII 32..126, used to centre and wrap text.
const HELV = [278,278,355,556,556,889,667,191,333,333,389,584,278,333,278,278,556,556,556,556,556,556,556,556,556,556,278,278,584,584,584,556,1015,667,667,722,722,667,611,778,722,278,500,667,556,833,722,778,667,778,722,667,611,722,667,944,667,667,611,278,278,278,469,556,333,556,556,500,556,556,278,556,556,222,222,500,222,833,556,556,556,556,333,500,278,556,500,722,500,500,500,334,260,334,584];

// Keep only characters the built-in font can show.
const clean = (s) => String(s ?? '').replace(/[^\x20-\x7e]/g, (c) => ({ '‘': "'", '’': "'", '“': '"', '”': '"', '–': '-', '—': '-' }[c] || '?'));
const esc = (s) => clean(s).replace(/\\/g, '\\\\').replace(/\(/g, '\\(').replace(/\)/g, '\\)');

const textWidth = (s, size, bold) =>
  (clean(s).split('').reduce((sum, ch) => sum + (HELV[ch.charCodeAt(0) - 32] || 556), 0) / 1000) * size * (bold ? 1.07 : 1);

function wrap(s, size, maxWidth, bold) {
  const lines = [];
  let line = '';
  clean(s).split(/\s+/).filter(Boolean).forEach((word) => {
    const next = line ? `${line} ${word}` : word;
    if (textWidth(next, size, bold) <= maxWidth || !line) line = next;
    else { lines.push(line); line = word; }
  });
  if (line) lines.push(line);
  return lines;
}

const hex = (h) => [1, 3, 5].map((i) => (parseInt(h.slice(i, i + 2), 16) / 255).toFixed(3)).join(' ');

const THEMES = {
  classic: { border: '#b45309', accent: '#92400e', bg: '#fffbeb', double: true },
  modern: { border: '#4f46e5', accent: '#4338ca', bg: '#ffffff', band: true },
  minimal: { border: '#64748b', accent: '#334155', bg: '#ffffff' },
};

// cert: { templateKey, title, studentName, department, eventTitle, venue, dateText, issuedText,
//         signatoryName, signatoryTitle, certificateId, verifyUrl }
function certificatePdf(cert) {
  const t = THEMES[cert.templateKey] || THEMES.classic;
  const ops = [];
  const text = (s, x, y, size, { bold = false, color = '#0f172a', align = 'left' } = {}) => {
    const w = textWidth(s, size, bold);
    const px = align === 'center' ? x - w / 2 : align === 'right' ? x - w : x;
    ops.push(`BT /${bold ? 'F2' : 'F1'} ${size} Tf ${hex(color)} rg ${px.toFixed(1)} ${y.toFixed(1)} Td (${esc(s)}) Tj ET`);
  };
  const rect = (x, y, w, h, color, fill) => ops.push(`${hex(color)} ${fill ? 'rg' : 'RG'} ${fill ? '' : '2 w '}${x} ${y} ${w} ${h} re ${fill ? 'f' : 'S'}`);

  rect(0, 0, W, H, t.bg, true);
  rect(24, 24, W - 48, H - 48, t.border, false);
  if (t.double) rect(34, 34, W - 68, H - 68, t.border, false);
  if (t.band) rect(24, H - 64, W - 48, 40, t.border, true);

  const cx = W / 2;
  text('UNIEVENTS', cx, H - (t.band ? 50 : 90), 12, { bold: true, color: t.band ? '#ffffff' : t.accent, align: 'center' });
  text(cert.title, cx, H - 150, 34, { bold: true, color: t.accent, align: 'center' });
  text('This is proudly presented to', cx, H - 205, 14, { color: '#475569', align: 'center' });
  text(cert.studentName, cx, H - 255, 30, { bold: true, align: 'center' });
  let y = H - 280;
  if (cert.department) { text(cert.department, cx, y, 12, { color: '#64748b', align: 'center' }); y -= 10; }
  y -= 24;
  wrap(`for attending ${cert.eventTitle}, held on ${cert.dateText} at ${cert.venue}.`, 15, 560).forEach((line) => {
    text(line, cx, y, 15, { color: '#334155', align: 'center' });
    y -= 22;
  });

  text(cert.signatoryName, 70, 96, 14, { bold: true });
  text(cert.signatoryTitle, 70, 80, 11, { color: '#475569' });
  text(`Issued ${cert.issuedText}`, 70, 62, 10, { color: '#64748b' });
  text(`Certificate ID: ${cert.certificateId}`, W - 70, 96, 11, { bold: true, align: 'right' });
  text('Verify at:', W - 70, 80, 10, { color: '#64748b', align: 'right' });
  text(cert.verifyUrl, W - 70, 66, 10, { color: t.accent, align: 'right' });

  const content = ops.join('\n');
  const objects = [
    '<< /Type /Catalog /Pages 2 0 R >>',
    '<< /Type /Pages /Kids [3 0 R] /Count 1 >>',
    `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${W} ${H}] /Contents 4 0 R /Resources << /Font << /F1 5 0 R /F2 6 0 R >> >> >>`,
    `<< /Length ${Buffer.byteLength(content, 'latin1')} >>\nstream\n${content}\nendstream`,
    '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>',
    '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>',
  ];

  let out = '%PDF-1.4\n';
  const offsets = [];
  objects.forEach((body, i) => {
    offsets.push(Buffer.byteLength(out, 'latin1'));
    out += `${i + 1} 0 obj\n${body}\nendobj\n`;
  });
  const xref = Buffer.byteLength(out, 'latin1');
  out += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  offsets.forEach((o) => { out += `${String(o).padStart(10, '0')} 00000 n \n`; });
  out += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF\n`;
  return Buffer.from(out, 'latin1');
}

module.exports = { certificatePdf };
