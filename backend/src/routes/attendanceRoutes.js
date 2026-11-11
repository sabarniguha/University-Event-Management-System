const router = require('express').Router();
const rateLimit = require('express-rate-limit');
const c = require('../controllers/attendanceController');
const { authenticate } = require('../middleware/authMiddleware');
const { requireRole } = require('../middleware/roleMiddleware');

const verifyLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: 'Too many verification attempts, please try again later' },
});

// Public: anyone holding a certificate can check that it is genuine.
router.get('/verify/:code', verifyLimiter, c.verifyCertificate);

router.use(authenticate);

// Student
router.get('/me', requireRole('STUDENT'), c.myAttendance);
router.get('/certificate/:registrationId', requireRole('STUDENT'), c.certificate);

// Organiser (own events) / admin (all events)
router.get('/overview', requireRole('ORGANIZER', 'ADMIN'), c.overview);
router.get('/event/:eventId', requireRole('ORGANIZER', 'ADMIN'), c.eventAttendance);
router.get('/event/:eventId/export', requireRole('ORGANIZER', 'ADMIN'), c.exportAttendanceCsv);
router.post('/checkin', requireRole('ORGANIZER', 'ADMIN'), c.checkIn);
router.post('/bulk', requireRole('ORGANIZER', 'ADMIN'), c.bulkMark);
router.post('/', requireRole('ORGANIZER', 'ADMIN'), c.markAttendance);

module.exports = router;
