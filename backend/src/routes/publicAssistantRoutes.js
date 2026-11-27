const router = require('express').Router();
const rateLimit = require('express-rate-limit');
const c = require('../controllers/publicAssistantController');

router.get('/status', c.status);
// Per visitor address, so one person cannot use up everyone's share.
router.post('/chat', rateLimit({ windowMs: 10 * 60 * 1000, limit: 12, standardHeaders: true, legacyHeaders: false, message: { message: 'You are asking very quickly. Please wait a few minutes.' } }), c.chat);

module.exports = router;
