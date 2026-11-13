const router = require('express').Router();
const rateLimit = require('express-rate-limit');
const c = require('../controllers/authController');
const { authenticate } = require('../middleware/authMiddleware');

const limiter = (limit, message) =>
  rateLimit({
    windowMs: 15 * 60 * 1000,
    limit,
    standardHeaders: true,
    legacyHeaders: false,
    message: { message },
  });

// Slow down brute-force attempts on login / sign-up and abuse of the email-sending endpoints.
const authLimiter = limiter(50, 'Too many attempts, please try again in a few minutes');
const emailLimiter = limiter(10, 'Too many requests, please try again in a few minutes');

router.post('/register', authLimiter, c.register);
router.post('/login', authLimiter, c.login);
router.post('/forgot-password', emailLimiter, c.forgotPassword);
router.post('/reset-password', emailLimiter, c.resetPassword);
router.post('/verify-email', emailLimiter, c.verifyEmail);

router.get('/me', authenticate, c.me);
router.patch('/me', authenticate, c.updateMe);
router.post('/change-password', authenticate, authLimiter, c.changePassword);
router.post('/resend-verification', authenticate, emailLimiter, c.resendVerification);
router.get('/organizer-request', authenticate, c.myOrganizerRequest);
router.post('/organizer-request', authenticate, c.requestOrganizer);

module.exports = router;
