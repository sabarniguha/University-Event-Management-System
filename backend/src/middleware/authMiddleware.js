const { verifyToken } = require("../utils/jwt");

/**
 * Reads the Authorization header, verifies the JWT, and attaches the
 * decoded { id, role } payload to req.user. Rejects missing, malformed,
 * or expired/invalid tokens with a 401.
 */
function authMiddleware(req, res, next) {
  const authHeader = req.headers.authorization || "";
  const [scheme, token] = authHeader.split(" ");

  if (scheme !== "Bearer" || !token) {
    return res.status(401).json({ message: "Authentication token is missing." });
  }

  try {
    const decoded = verifyToken(token);
    req.user = { id: decoded.id, role: decoded.role };
    next();
  } catch (err) {
    return res.status(401).json({ message: "Your session has expired. Please log in again." });
  }
}

module.exports = authMiddleware;
