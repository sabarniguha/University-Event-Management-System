const router = require('express').Router();
const rateLimit = require('express-rate-limit');
const c = require('../controllers/assistantController');
const { authenticate } = require('../middleware/authMiddleware');
const { requireRole } = require('../middleware/roleMiddleware');

router.use(authenticate, requireRole('STUDENT', 'ORGANIZER', 'ADMIN'));
router.get('/status', c.status);
// Per signed-in user, so one person cannot use up everyone's share.
router.post('/chat', rateLimit({ windowMs: 10 * 60 * 1000, limit: 20, standardHeaders: true, legacyHeaders: false, keyGenerator: (req) => `u${req.user.id}`, message: { message: 'You are asking very quickly. Please wait a few minutes.' } }), c.chat);

module.exports = router;
