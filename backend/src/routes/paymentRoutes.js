const router = require('express').Router();
const rateLimit = require('express-rate-limit');
const c = require('../controllers/paymentController');
const { authenticate } = require('../middleware/authMiddleware');
const { requireRole } = require('../middleware/roleMiddleware');

const limiter = rateLimit({ windowMs: 15 * 60 * 1000, limit: 40, standardHeaders: true, legacyHeaders: false, message: { message: 'Too many payment attempts, please try again later' } });

// The webhook is mounted separately in app.js (it needs the raw body).
router.get('/config', c.config);
router.post('/verify', authenticate, requireRole('STUDENT'), limiter, c.verify);
router.post('/:eventId/order', authenticate, requireRole('STUDENT'), limiter, c.createOrder);

module.exports = router;
