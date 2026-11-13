const router = require('express').Router();
const c = require('../controllers/attendanceController');
const { authenticate } = require('../middleware/authMiddleware');
const { requireRole } = require('../middleware/roleMiddleware');

router.use(authenticate);

// Student
router.get('/me', requireRole('STUDENT'), c.myAttendance);
router.get('/my', requireRole('STUDENT'), c.myAttendance); // alias

// Organiser (own events) / admin (all events)
router.get('/overview', requireRole('ORGANIZER', 'ADMIN'), c.overview);
router.get('/event/:eventId', requireRole('ORGANIZER', 'ADMIN'), c.eventAttendance);
router.get('/event/:eventId/export', requireRole('ORGANIZER', 'ADMIN'), c.exportAttendanceCsv);
router.post('/checkin', requireRole('ORGANIZER', 'ADMIN'), c.checkIn);
router.post('/check-in', requireRole('ORGANIZER', 'ADMIN'), c.checkIn); // alias
router.post('/bulk', requireRole('ORGANIZER', 'ADMIN'), c.bulkMark);
router.post('/', requireRole('ORGANIZER', 'ADMIN'), c.markAttendance);

module.exports = router;
