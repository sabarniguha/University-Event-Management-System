const router = require('express').Router();
const c = require('../controllers/surveyController');
const { authenticate } = require('../middleware/authMiddleware');
const { requireRole } = require('../middleware/roleMiddleware');

router.use(authenticate);

router.get('/event/:eventId/manage', requireRole('ORGANIZER', 'ADMIN'), c.manage);
router.put('/event/:eventId/questions', requireRole('ORGANIZER', 'ADMIN'), c.saveQuestions);
router.get('/event/:eventId/export', requireRole('ORGANIZER', 'ADMIN'), c.exportAnswers);
router.get('/event/:eventId', requireRole('STUDENT'), c.mine);
router.put('/event/:eventId/answers', requireRole('STUDENT'), c.saveAnswers);

module.exports = router;
