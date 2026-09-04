/**
 * requireRole("ADMIN") or requireRole("ADMIN", "ORGANIZER")
 * Must run after authMiddleware, which sets req.user.
 */
function requireRole(...allowedRoles) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ message: "Authentication token is missing." });
    }

    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({ message: "You do not have permission to access this resource." });
    }

    next();
  };
}

module.exports = requireRole;
