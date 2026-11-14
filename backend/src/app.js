const path = require('path');
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');

const authRoutes = require('./routes/authRoutes');
const eventRoutes = require('./routes/eventRoutes');
const registrationRoutes = require('./routes/registrationRoutes');
const attendanceRoutes = require('./routes/attendanceRoutes');
const announcementRoutes = require('./routes/announcementRoutes');
const adminRoutes = require('./routes/adminRoutes');
const feedbackRoutes = require('./routes/feedbackRoutes');
const notificationRoutes = require('./routes/notificationRoutes');
const certificateRoutes = require('./routes/certificateRoutes');
const categoryRoutes = require('./routes/categoryRoutes');
const analyticsRoutes = require('./routes/analyticsRoutes');
const publicRoutes = require('./routes/publicRoutes');
const mediaRoutes = require('./routes/mediaRoutes');
const paymentRoutes = require('./routes/paymentRoutes');
const paymentController = require('./controllers/paymentController');
const razorpayUtil = require('./utils/razorpay');
const rateLimit = require('express-rate-limit');
const { notFound, errorHandler } = require('./middleware/errorHandler');
const { parseAllowedOrigins, isAllowedOrigin } = require('./utils/cors');

const app = express();
const isProd = process.env.NODE_ENV === 'production';

// Needed so rate-limiting and IPs work correctly behind Render / Railway / Nginx proxies.
app.set('trust proxy', 1);

app.use(
  helmet({
    contentSecurityPolicy: {
      useDefaults: true,
      directives: {
        'img-src': ["'self'", 'data:', 'https:'],
        // Razorpay checkout (only allowed when online payments are configured).
        ...(razorpayUtil.enabled()
          ? {
              'script-src': ["'self'", 'https://checkout.razorpay.com'],
              'frame-src': ["'self'", 'https://api.razorpay.com', 'https://checkout.razorpay.com'],
              'connect-src': ["'self'", 'https://lumberjack.razorpay.com', 'https://api.razorpay.com'],
            }
          : {}),
      },
    },
  })
);

// CLIENT_ORIGIN is only needed when the frontend is hosted on a different address (e.g. Vercel).
// Requests from this server's own address are always allowed.
const allowedOrigins = parseAllowedOrigins(process.env.CLIENT_ORIGIN || 'http://localhost:5173');

app.use((req, res, next) =>
  cors({
    origin: (origin, cb) =>
      isAllowedOrigin(origin, req.headers.host, allowedOrigins)
        ? cb(null, true)
        : cb(new Error('Not allowed by CORS')),
  })(req, res, next)
);

// Image uploads are raw binary, so they are mounted before the JSON body parser.
app.use('/api/media', mediaRoutes);

app.post('/api/payments/webhook', express.raw({ type: 'application/json', limit: '100kb' }), paymentController.webhook);

app.use(express.json({ limit: '1mb' }));
if (!isProd) app.use(morgan('dev'));

// General safety net against scripted abuse; stricter limits sit on login, forms and uploads.
app.use('/api', rateLimit({ windowMs: 15 * 60 * 1000, limit: 1500, standardHeaders: true, legacyHeaders: false, message: { message: 'Too many requests, please slow down' } }));

app.get('/api/health', (req, res) => res.json({ status: 'ok', time: new Date().toISOString() }));

app.use('/api/auth', authRoutes);
app.use('/api/events', eventRoutes);
app.use('/api/registrations', registrationRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/attendance', attendanceRoutes);
app.use('/api/announcements', announcementRoutes);
app.use('/api/feedback', feedbackRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/certificates', certificateRoutes);
app.use('/api/categories', categoryRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/public', publicRoutes);
// Spec-friendly aliases
app.get('/api/settings/public', (req, res, next) => { req.url = '/settings'; publicRoutes(req, res, next); });

// In production the Express server also serves the built React app (single deployable service).
if (isProd) {
  const dist = path.join(__dirname, '..', '..', 'frontend', 'dist');
  app.use(express.static(dist));
  app.get(/^\/(?!api).*/, (req, res) => res.sendFile(path.join(dist, 'index.html')));
}

app.use('/api', notFound);
app.use(errorHandler);

module.exports = app;
