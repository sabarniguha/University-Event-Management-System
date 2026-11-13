const router = require('express').Router();
const c = require('../controllers/analyticsController');
const { authenticate } = require('../middleware/authMiddleware');
const { requireRole } = require('../middleware/roleMiddleware');

router.use(authenticate);
router.get('/student', requireRole('STUDENT'), c.student);
router.get('/organizer', requireRole('ORGANIZER', 'ADMIN'), c.organizer);
router.get('/admin', requireRole('ADMIN'), c.admin);

module.exports = router;
