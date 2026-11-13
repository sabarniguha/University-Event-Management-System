const router = require('express').Router();
const rateLimit = require('express-rate-limit');
const c = require('../controllers/publicController');

const formLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  limit: 15,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: 'Too many submissions, please try again later' },
});

router.get('/stats', c.stats);
router.get('/highlights', c.highlights);
router.get('/settings', c.settings);
router.post('/newsletter', formLimiter, c.subscribe);
router.post('/contact', formLimiter, c.contact);

module.exports = router;
