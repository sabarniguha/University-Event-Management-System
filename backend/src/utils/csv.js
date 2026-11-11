// Neutralise spreadsheet formula injection and quote CSV fields.
const csvCell = (value) => {
  let s = value === null || value === undefined ? '' : String(value);
  if (/^[=+\-@\t\r]/.test(s)) s = `'${s}`;
  return `"${s.replace(/"/g, '""')}"`;
};

const toCsv = (header, rows) =>
  [header, ...rows].map((row) => row.map(csvCell).join(',')).join('\n');

const safeFilename = (title, fallback = 'event') => title.replace(/[^a-z0-9]+/gi, '_').slice(0, 40) || fallback;

module.exports = { csvCell, toCsv, safeFilename };
