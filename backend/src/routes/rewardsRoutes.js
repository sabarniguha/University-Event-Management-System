const router = require('express').Router();
const c = require('../controllers/rewardsController');
const { authenticate } = require('../middleware/authMiddleware');
const { requireRole } = require('../middleware/roleMiddleware');

router.use(authenticate);
router.get('/me', requireRole('STUDENT'), c.me);
router.get('/leaderboard', requireRole('STUDENT', 'ORGANIZER', 'ADMIN'), c.leaderboard);

module.exports = router;
