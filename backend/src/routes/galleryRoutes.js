const router = require('express').Router();
const c = require('../controllers/galleryController');
const { authenticate, optionalAuth } = require('../middleware/authMiddleware');
const { requireRole } = require('../middleware/roleMiddleware');

router.get('/event/:eventId', optionalAuth, c.list);
router.post('/event/:eventId', authenticate, requireRole('ORGANIZER', 'ADMIN'), c.add);
router.delete('/:id', authenticate, requireRole('ORGANIZER', 'ADMIN'), c.remove);

module.exports = router;
