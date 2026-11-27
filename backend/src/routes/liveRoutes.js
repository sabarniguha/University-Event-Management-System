const router = require('express').Router();
const c = require('../controllers/liveController');
const { authenticate } = require('../middleware/authMiddleware');
const { requireRole } = require('../middleware/roleMiddleware');

router.get('/event/:eventId', authenticate, requireRole('ORGANIZER', 'ADMIN'), c.live);

module.exports = router;
