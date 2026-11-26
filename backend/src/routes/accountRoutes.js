const router = require('express').Router();
const rateLimit = require('express-rate-limit');
const c = require('../controllers/accountController');
const { authenticate } = require('../middleware/authMiddleware');

const limiter = rateLimit({ windowMs: 15 * 60 * 1000, limit: 10, standardHeaders: true, legacyHeaders: false, keyGenerator: (req) => `u${req.user.id}`, message: { message: 'Too many attempts. Please try again later.' } });
router.use(authenticate);
router.get('/export', limiter, c.exportMine);
router.post('/delete', limiter, c.deleteMine);

module.exports = router;
