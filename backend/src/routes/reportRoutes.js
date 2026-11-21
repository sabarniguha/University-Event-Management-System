const router = require('express').Router();
const c = require('../controllers/reportController');
const { authenticate } = require('../middleware/authMiddleware');
const { requireRole } = require('../middleware/roleMiddleware');

// A student's own report: the server uses the signed-in student's id, there is no way to ask for anyone else's.
router.get('/student', authenticate, requireRole('STUDENT'), c.studentReport);

router.use(authenticate, requireRole('ORGANIZER', 'ADMIN'));
router.get('/summary', c.summary);
router.get('/event/:id', c.eventReport);

module.exports = router;
