const crypto = require('crypto');

// 32 hex chars of CSPRNG output: unguessable, safe to embed in a QR code.
const newTicketCode = () => crypto.randomBytes(16).toString('hex');

// Public, human-readable certificate id derived from the ticket code.
const certificateId = (ticketCode) => `UEMS-${ticketCode.slice(0, 12).toUpperCase()}`;

// Accepts "UEMS-ABC123..." (as printed on a certificate) and returns the lowercase hex prefix, or null.
const parseCertificateId = (value) => {
  const m = /^UEMS-([0-9A-F]{12})$/i.exec(String(value || '').trim());
  return m ? m[1].toLowerCase() : null;
};

// A scanned QR may carry the bare code or a "UEMS:<code>" prefix; normalise both.
const normaliseTicketInput = (value) => String(value || '').trim().replace(/^UEMS:/i, '').toLowerCase();

module.exports = { newTicketCode, certificateId, parseCertificateId, normaliseTicketInput };
