// Builds a CSV file in the browser from the report that is already on screen, so there is no extra request.
// blocks: [{ title, head: [...], rows: [[...], ...] }]. Cells that start with = + - @ are prefixed with ' so a spreadsheet never runs them as formulas.
const cell = (v) => {
  let s = v === null || v === undefined ? '' : String(v);
  if (/^[=+\-@\t\r]/.test(s) && !/^-?\d+(\.\d+)?$/.test(s)) s = `'${s}`;
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

export function toCsv(blocks) {
  return blocks.filter((b) => b.rows.length > 0).map((b) => [cell(b.title), b.head.map(cell).join(','), ...b.rows.map((r) => r.map(cell).join(','))].join('\r\n')).join('\r\n\r\n');
}

export function downloadCsv(fileName, blocks) {
  const blob = new Blob([`﻿${toCsv(blocks)}`], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = `${fileName}.csv`;
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
