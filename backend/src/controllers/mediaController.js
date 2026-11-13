const prisma = require('../utils/prismaClient');
const HttpError = require('../utils/httpError');
const asyncHandler = require('../utils/asyncHandler');
const { parseId } = require('../utils/validators');

// The declared Content-Type is not trusted: the file's own first bytes decide what it is.
const sniff = (b) => {
  if (b.length < 12) return null;
  if (b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47) return 'image/png';
  if (b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) return 'image/jpeg';
  if (b.toString('ascii', 0, 4) === 'GIF8') return 'image/gif';
  if (b.toString('ascii', 0, 4) === 'RIFF' && b.toString('ascii', 8, 12) === 'WEBP') return 'image/webp';
  return null;
};

// POST /api/media  - body is the raw image (Content-Type image/png|jpeg|webp|gif, max 1.5 MB)
const upload = asyncHandler(async (req, res) => {
  const body = req.body;
  if (!Buffer.isBuffer(body) || body.length === 0) throw new HttpError(400, 'Send an image file (PNG, JPEG, WebP or GIF)');
  const mimeType = sniff(body);
  if (!mimeType) throw new HttpError(400, 'Only PNG, JPEG, WebP and GIF images are allowed');

  const file = await prisma.mediaFile.create({
    data: { ownerId: req.user.id, mimeType, size: body.length, data: body },
    select: { id: true },
  });
  res.status(201).json({ id: file.id, url: `/api/media/${file.id}` });
});

// GET /api/media/:id  (public) - images are shown on public event pages
const serve = asyncHandler(async (req, res) => {
  const id = parseId(req.params.id);
  const file = await prisma.mediaFile.findUnique({ where: { id } });
  if (!file) throw new HttpError(404, 'File not found');
  res.setHeader('Content-Type', file.mimeType);
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Content-Security-Policy', "default-src 'none'; sandbox");
  // The frontend may live on another origin (e.g. Vercel) and still needs to display these.
  res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
  res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
  res.send(Buffer.from(file.data));
});

module.exports = { upload, serve };
