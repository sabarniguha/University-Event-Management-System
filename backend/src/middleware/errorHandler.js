/**
 * Central error handler. Keeps database/internal error details out of
 * responses and always returns a consistent { message } shape.
 */
function errorHandler(err, req, res, next) {
  console.error(err);

  const status = err.status || 500;
  const message = status === 500 ? "Something went wrong. Please try again later." : err.message;

  res.status(status).json({ message });
}

function notFoundHandler(req, res) {
  res.status(404).json({ message: "The requested resource was not found." });
}

module.exports = { errorHandler, notFoundHandler };
