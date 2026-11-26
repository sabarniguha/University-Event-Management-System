const router = require('express').Router();
const rateLimit = require('express-rate-limit');
const c = require('../controllers/staffController');
const { authenticate } = require('../middleware/authMiddleware');
const { requireRole } = require('../middleware/roleMiddleware');

router.use(authenticate);
const scanLimiter = rateLimit({ windowMs: 60 * 1000, limit: 120, standardHeaders: true, legacyHeaders: false, keyGenerator: (req) => `u${req.user.id}` });

// Helper side: any signed-in user, authorised per event inside the controller.
router.get('/mine', c.mine);
router.get('/event/:eventId/roster', c.roster);
router.post('/event/:eventId/check-in', scanLimiter, c.checkIn);
router.post('/event/:eventId/mark', scanLimiter, c.mark);

// Organiser / admin side.
router.get('/event/:eventId', requireRole('ORGANIZER', 'ADMIN'), c.list);
router.post('/event/:eventId', requireRole('ORGANIZER', 'ADMIN'), c.add);
router.delete('/event/:eventId/:userId', requireRole('ORGANIZER', 'ADMIN'), c.remove);

module.exports = router;
