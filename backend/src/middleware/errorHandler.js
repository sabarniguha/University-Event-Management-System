const { ZodError } = require('zod');

const notFound = (req, res) => res.status(404).json({ message: `Route not found: ${req.method} ${req.originalUrl}` });

// eslint-disable-next-line no-unused-vars
const errorHandler = (err, req, res, next) => {
  if (err instanceof ZodError) {
    const errors = err.issues.map((i) => ({ field: i.path.join('.'), message: i.message }));
    return res.status(400).json({ message: errors[0]?.message || 'Invalid input', errors });
  }

  if (err.status) return res.status(err.status).json({ message: err.message });

  if (err.message === 'Not allowed by CORS') return res.status(403).json({ message: err.message });

  // Prisma known errors
  if (err.code === 'P2002') return res.status(409).json({ message: 'A record with these details already exists' });
  if (err.code === 'P2025') return res.status(404).json({ message: 'Record not found' });
  if (err.code === 'P2003') return res.status(409).json({ message: 'This record is still referenced by other data' });
  if (err.code === 'P2034') return res.status(409).json({ message: 'The server was busy, please try again' });

  if (err.type === 'entity.parse.failed') return res.status(400).json({ message: 'Malformed JSON body' });

  console.error(err);
  return res.status(500).json({ message: 'Internal server error' });
};

module.exports = { notFound, errorHandler };
