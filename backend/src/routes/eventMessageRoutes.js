const router = require('express').Router();
const rateLimit = require('express-rate-limit');
const c = require('../controllers/eventMessageController');
const { authenticate } = require('../middleware/authMiddleware');
const { requireRole } = require('../middleware/roleMiddleware');

router.use(authenticate, requireRole('ORGANIZER', 'ADMIN'));

const sendLimiter = rateLimit({ windowMs: 60 * 60 * 1000, limit: 20, standardHeaders: true, legacyHeaders: false, keyGenerator: (req) => `u${req.user.id}`, message: { message: 'You have sent many messages. Please wait a while before sending more.' } });

router.get('/event/:eventId', c.preview);
router.post('/event/:eventId', sendLimiter, c.send);

module.exports = router;
