const router = require('express').Router();
const rateLimit = require('express-rate-limit');
const c = require('../controllers/discountController');
const { authenticate } = require('../middleware/authMiddleware');
const { requireRole } = require('../middleware/roleMiddleware');

router.use(authenticate);
router.post('/check', requireRole('STUDENT'), rateLimit({ windowMs: 10 * 60 * 1000, limit: 30, standardHeaders: true, legacyHeaders: false, keyGenerator: (req) => `u${req.user.id}`, message: { message: 'Too many code checks. Please wait a few minutes.' } }), c.check);
router.get('/event/:eventId', requireRole('ORGANIZER', 'ADMIN'), c.list);
router.post('/event/:eventId', requireRole('ORGANIZER', 'ADMIN'), c.create);
router.patch('/event/:eventId/:id', requireRole('ORGANIZER', 'ADMIN'), c.toggle);
router.delete('/event/:eventId/:id', requireRole('ORGANIZER', 'ADMIN'), c.remove);

module.exports = router;
