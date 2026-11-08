const router = require('express').Router();
const rateLimit = require('express-rate-limit');
const { register, login, me, updateMe } = require('../controllers/authController');
const { authenticate } = require('../middleware/authMiddleware');

// Slow down brute-force attempts on login / sign-up.
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 50,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: 'Too many attempts, please try again in a few minutes' },
});

router.post('/register', authLimiter, register);
router.post('/login', authLimiter, login);
router.get('/me', authenticate, me);
router.patch('/me', authenticate, updateMe);

module.exports = router;
