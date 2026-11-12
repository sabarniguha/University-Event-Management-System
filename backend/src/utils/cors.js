// Turns "https://a.com, https://b.com/" into ['https://a.com', 'https://b.com'] (trailing slashes removed).
const parseAllowedOrigins = (value) =>
  String(value || '')
    .split(',')
    .map((o) => o.trim().replace(/\/+$/, ''))
    .filter(Boolean);

// A request is allowed when it has no Origin (curl, server-to-server), when its Origin is on the
// CLIENT_ORIGIN list, or when it comes from this server's own address. The last rule is what makes a
// single-service deployment (Express serving the React build) work without setting CLIENT_ORIGIN.
const isAllowedOrigin = (origin, requestHost, allowedOrigins) => {
  if (!origin) return true;
  if (allowedOrigins.includes(origin)) return true;
  try {
    return Boolean(requestHost) && new URL(origin).host === requestHost;
  } catch {
    return false; // malformed Origin such as "null"
  }
};

module.exports = { parseAllowedOrigins, isAllowedOrigin };
