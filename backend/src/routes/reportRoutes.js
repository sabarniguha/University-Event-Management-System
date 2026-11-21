const router = require('express').Router();
const rateLimit = require('express-rate-limit');
const c = require('../controllers/reportController');
const { authenticate } = require('../middleware/authMiddleware');
const { requireRole } = require('../middleware/roleMiddleware');

// Public: check a report ID printed on a PDF. Rate limited because it is open to everyone.
router.get('/verify/:code', rateLimit({ windowMs: 15 * 60 * 1000, limit: 60, standardHeaders: true, legacyHeaders: false, message: { message: 'Too many checks, please try again later' } }), c.verify);

// A student's own report: the server uses the signed-in student's id, there is no way to ask for anyone else's.
router.get('/student', authenticate, requireRole('STUDENT'), c.studentReport);

router.use(authenticate, requireRole('ORGANIZER', 'ADMIN'));
router.get('/summary', c.summary);
router.get('/event/:id', c.eventReport);

module.exports = router;
