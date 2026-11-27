const router = require('express').Router();
const c = require('../controllers/volunteerController');
const { authenticate } = require('../middleware/authMiddleware');
const { requireRole } = require('../middleware/roleMiddleware');

router.use(authenticate);
router.get('/mine', c.mine);
router.get('/event/:eventId', requireRole('ORGANIZER', 'ADMIN'), c.eventList);
router.put('/event/:eventId/:userId', requireRole('ORGANIZER', 'ADMIN'), c.confirm);
router.delete('/event/:eventId/:userId', requireRole('ORGANIZER', 'ADMIN'), c.unconfirm);

module.exports = router;
