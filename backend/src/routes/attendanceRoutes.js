const router = require('express').Router();
const c = require('../controllers/attendanceController');
const { authenticate } = require('../middleware/authMiddleware');
const { requireRole } = require('../middleware/roleMiddleware');

router.use(authenticate);

router.get('/me', requireRole('STUDENT'), c.myAttendance);
router.post('/', requireRole('ORGANIZER', 'ADMIN'), c.markAttendance);

module.exports = router;
