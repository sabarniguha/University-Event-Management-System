const router = require('express').Router();
const c = require('../controllers/feedbackController');
const { authenticate } = require('../middleware/authMiddleware');
const { requireRole } = require('../middleware/roleMiddleware');

router.use(authenticate);

router.get('/event/:eventId', requireRole('ORGANIZER', 'ADMIN'), c.eventFeedback);
router.post('/:eventId', requireRole('STUDENT'), c.submit);

module.exports = router;
