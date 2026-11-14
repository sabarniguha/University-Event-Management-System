const crypto = require('crypto');

// Optional image hosting. Active only when all three variables are set; otherwise uploads stay in the database.
const enabled = () =>
  Boolean(process.env.CLOUDINARY_CLOUD_NAME && process.env.CLOUDINARY_API_KEY && process.env.CLOUDINARY_API_SECRET);

// Cloudinary signature: sha1 of the sorted "key=value&..." string of signed params followed by the API secret.
const sign = (params, secret) => {
  const str = Object.keys(params)
    .sort()
    .map((k) => `${k}=${params[k]}`)
    .join('&');
  return crypto.createHash('sha1').update(str + secret).digest('hex');
};

// Uploads an already-validated image buffer. Returns the https URL. Throws on failure.
async function uploadImage(buffer, mimeType) {
  const timestamp = Math.floor(Date.now() / 1000);
  const params = { folder: process.env.CLOUDINARY_FOLDER || 'unievents', timestamp };
  const form = new FormData();
  form.append('file', new Blob([buffer], { type: mimeType }), 'upload');
  form.append('api_key', process.env.CLOUDINARY_API_KEY);
  form.append('timestamp', String(timestamp));
  form.append('folder', params.folder);
  form.append('signature', sign(params, process.env.CLOUDINARY_API_SECRET));

  const res = await fetch(`https://api.cloudinary.com/v1_1/${encodeURIComponent(process.env.CLOUDINARY_CLOUD_NAME)}/image/upload`, {
    method: 'POST',
    body: form,
    signal: AbortSignal.timeout(20000),
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok || !body.secure_url) throw new Error(body?.error?.message || `Cloudinary returned ${res.status}`);
  return body.secure_url;
}

module.exports = { enabled, uploadImage, sign };
