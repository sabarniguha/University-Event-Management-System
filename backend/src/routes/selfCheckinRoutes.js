const router = require('express').Router();
const rateLimit = require('express-rate-limit');
const c = require('../controllers/selfCheckinController');
const { authenticate } = require('../middleware/authMiddleware');
const { requireRole } = require('../middleware/roleMiddleware');

router.use(authenticate);
router.get('/event/:eventId/code', requireRole('ORGANIZER', 'ADMIN'), c.currentCode);
router.post('/', requireRole('STUDENT'),
  rateLimit({ windowMs: 5 * 60 * 1000, limit: 20, standardHeaders: true, legacyHeaders: false, keyGenerator: (req) => `u${req.user.id}`, message: { message: 'Too many attempts. Please wait a few minutes.' } }),
  c.checkIn);

module.exports = router;
