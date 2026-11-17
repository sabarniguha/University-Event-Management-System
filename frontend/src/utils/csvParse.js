// Small CSV reader for uploads: handles quotes, commas inside quotes, CRLF and a leading BOM.
// Returns { headers, rows } where each row is an object keyed by a lower-cased, space-free header.
export function parseCsv(text) {
  const src = String(text || '').replace(/^﻿/, '');
  const table = [];
  let row = [];
  let cell = '';
  let quoted = false;
  for (let i = 0; i < src.length; i += 1) {
    const ch = src[i];
    if (quoted) {
      if (ch === '"' && src[i + 1] === '"') { cell += '"'; i += 1; }
      else if (ch === '"') quoted = false;
      else cell += ch;
    } else if (ch === '"') quoted = true;
    else if (ch === ',') { row.push(cell); cell = ''; }
    else if (ch === '\n' || ch === '\r') {
      if (ch === '\r' && src[i + 1] === '\n') i += 1;
      row.push(cell); cell = '';
      if (row.some((c) => c.trim() !== '')) table.push(row);
      row = [];
    } else cell += ch;
  }
  row.push(cell);
  if (row.some((c) => c.trim() !== '')) table.push(row);
  if (table.length === 0) return { headers: [], rows: [] };
  const headers = table[0].map((h) => h.trim().toLowerCase().replace(/[\s_-]+/g, ''));
  const alias = { studentid: 'studentId', rollno: 'studentId', roll: 'studentId', emailid: 'email', mail: 'email', fullname: 'name', dept: 'department', mobile: 'phone' };
  const keys = headers.map((h) => alias[h] || h);
  const rows = table.slice(1).map((r) => Object.fromEntries(keys.map((k, i) => [k, (r[i] || '').trim()])));
  return { headers: keys, rows };
}
