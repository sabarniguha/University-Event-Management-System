const router = require('express').Router();
const rateLimit = require('express-rate-limit');
const c = require('../controllers/qaController');
const { authenticate, optionalAuth } = require('../middleware/authMiddleware');
const { requireRole } = require('../middleware/roleMiddleware');

router.get('/event/:eventId', optionalAuth, c.list);
router.post('/event/:eventId', authenticate, requireRole('STUDENT'),
  rateLimit({ windowMs: 60 * 60 * 1000, limit: 15, standardHeaders: true, legacyHeaders: false, keyGenerator: (req) => `u${req.user.id}`, message: { message: 'You have asked many questions. Please wait a while.' } }), c.ask);
router.patch('/:id/answer', authenticate, requireRole('ORGANIZER', 'ADMIN'), c.answer);
router.patch('/:id/hide', authenticate, requireRole('ORGANIZER', 'ADMIN'), c.hide);
router.delete('/:id', authenticate, c.remove);

module.exports = router;
