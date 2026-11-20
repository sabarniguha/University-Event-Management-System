const router = require('express').Router();
const c = require('../controllers/reportController');
const { authenticate } = require('../middleware/authMiddleware');
const { requireRole } = require('../middleware/roleMiddleware');

router.use(authenticate, requireRole('ORGANIZER', 'ADMIN'));
router.get('/summary', c.summary);
router.get('/event/:id', c.eventReport);

module.exports = router;
