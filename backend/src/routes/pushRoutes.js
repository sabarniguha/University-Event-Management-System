const router = require('express').Router();
const rateLimit = require('express-rate-limit');
const c = require('../controllers/pushController');
const { authenticate } = require('../middleware/authMiddleware');

router.get('/config', c.config);
router.use(authenticate);
router.get('/status', c.status);
router.post('/subscribe', rateLimit({ windowMs: 15 * 60 * 1000, limit: 30, standardHeaders: true, legacyHeaders: false }), c.subscribe);
router.post('/unsubscribe', c.unsubscribe);
router.post('/test', rateLimit({ windowMs: 10 * 60 * 1000, limit: 5, standardHeaders: true, legacyHeaders: false, keyGenerator: (req) => `u${req.user.id}` }), c.test);

module.exports = router;
