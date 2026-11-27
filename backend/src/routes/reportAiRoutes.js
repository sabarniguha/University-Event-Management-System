const router = require('express').Router();
const rateLimit = require('express-rate-limit');
const c = require('../controllers/reportAiController');
const { authenticate } = require('../middleware/authMiddleware');
const { requireRole } = require('../middleware/roleMiddleware');

router.post('/', authenticate, requireRole('STUDENT', 'ORGANIZER', 'ADMIN'),
  rateLimit({ windowMs: 60 * 60 * 1000, limit: 30, standardHeaders: true, legacyHeaders: false, keyGenerator: (req) => `u${req.user.id}`, message: { message: 'Too many insight requests. Please try again later.' } }), c.insights);

module.exports = router;
