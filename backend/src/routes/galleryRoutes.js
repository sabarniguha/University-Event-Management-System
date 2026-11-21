const router = require('express').Router();
const c = require('../controllers/galleryController');
const { authenticate, optionalAuth } = require('../middleware/authMiddleware');
const { requireRole } = require('../middleware/roleMiddleware');

router.get('/event/:eventId', optionalAuth, c.list);
router.post('/event/:eventId', authenticate, requireRole('ORGANIZER', 'ADMIN'), c.add);
router.post('/event/:eventId/mine', authenticate, requireRole('STUDENT'), c.addMine);
router.delete('/mine/:id', authenticate, requireRole('STUDENT'), c.removeMine);
router.patch('/:id/caption', authenticate, requireRole('ORGANIZER', 'ADMIN'), c.caption);
router.patch('/:id/approve', authenticate, requireRole('ORGANIZER', 'ADMIN'), c.approve);
router.delete('/:id', authenticate, requireRole('ORGANIZER', 'ADMIN'), c.remove);

module.exports = router;
