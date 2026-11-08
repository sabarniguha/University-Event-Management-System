const HttpError = require('../utils/httpError');

// Usage: router.post('/', authenticate, requireRole('ORGANIZER', 'ADMIN'), handler)
const requireRole =
  (...roles) =>
  (req, res, next) => {
    if (!req.user) return next(new HttpError(401, 'Authentication required'));
    if (!roles.includes(req.user.role)) return next(new HttpError(403, 'You do not have permission to do that'));
    return next();
  };

module.exports = { requireRole };
