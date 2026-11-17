const router = require('express').Router();
const c = require('../controllers/teamController');
const { authenticate } = require('../middleware/authMiddleware');
const { requireRole } = require('../middleware/roleMiddleware');

router.use(authenticate);

router.get('/event/:eventId/mine', requireRole('STUDENT'), c.mine);
router.get('/event/:eventId/export', requireRole('ORGANIZER', 'ADMIN'), c.exportCsv);
router.get('/event/:eventId', requireRole('ORGANIZER', 'ADMIN'), c.forEvent);
router.post('/', requireRole('STUDENT'), c.create);
router.post('/join', requireRole('STUDENT'), c.join);
router.post('/:id/leave', requireRole('STUDENT'), c.leave);
router.delete('/:id/members/:userId', requireRole('STUDENT'), c.removeMember);
router.delete('/:id', requireRole('STUDENT'), c.disband);

module.exports = router;
