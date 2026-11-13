const router = require('express').Router();
const c = require('../controllers/eventController');
const { authenticate, optionalAuth } = require('../middleware/authMiddleware');
const { requireRole } = require('../middleware/roleMiddleware');

router.get('/', c.listEvents);
// '/mine' and '/pending' must be declared before '/:id'
router.get('/mine', authenticate, requireRole('ORGANIZER', 'ADMIN'), c.myEvents);
router.get('/pending', authenticate, requireRole('ADMIN'), c.pendingEvents);
router.get('/:id', optionalAuth, c.getEvent);

router.post('/', authenticate, requireRole('ORGANIZER', 'ADMIN'), c.createEvent);
router.post('/:id/duplicate', authenticate, requireRole('ORGANIZER', 'ADMIN'), c.duplicateEvent);
router.patch('/:id/approve', authenticate, requireRole('ADMIN'), c.approveEvent);
router.patch('/:id/reject', authenticate, requireRole('ADMIN'), c.rejectEvent);
router.patch('/:id', authenticate, requireRole('ORGANIZER', 'ADMIN'), c.updateEvent);
router.delete('/:id', authenticate, requireRole('ORGANIZER', 'ADMIN'), c.deleteEvent);

module.exports = router;
