const router = require('express').Router();
const c = require('../controllers/registrationController');
const { authenticate } = require('../middleware/authMiddleware');
const { requireRole } = require('../middleware/roleMiddleware');

router.use(authenticate);

router.get('/me', requireRole('STUDENT'), c.myRegistrations);
router.get('/event/:eventId', requireRole('ORGANIZER', 'ADMIN'), c.eventParticipants);
router.get('/event/:eventId/export', requireRole('ORGANIZER', 'ADMIN'), c.exportParticipantsCsv);

router.post('/:eventId', requireRole('STUDENT'), c.register);
router.delete('/:eventId', requireRole('STUDENT'), c.cancel);

module.exports = router;
