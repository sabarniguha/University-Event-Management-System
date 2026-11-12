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

app.use(express.json({ limit: '1mb' }));
if (!isProd) app.use(morgan('dev'));

app.get('/api/health', (req, res) => res.json({ status: 'ok', time: new Date().toISOString() }));

app.use('/api/auth', authRoutes);
app.use('/api/events', eventRoutes);
app.use('/api/registrations', registrationRoutes);
app.use('/api/attendance', attendanceRoutes);
app.use('/api/announcements', announcementRoutes);
app.use('/api/feedback', feedbackRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/admin', adminRoutes);

// In production the Express server also serves the built React app (single deployable service).
if (isProd) {
  const dist = path.join(__dirname, '..', '..', 'frontend', 'dist');
  app.use(express.static(dist));
  app.get(/^\/(?!api).*/, (req, res) => res.sendFile(path.join(dist, 'index.html')));
}

app.use('/api', notFound);
app.use(errorHandler);

module.exports = app;
