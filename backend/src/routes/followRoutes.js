const router = require('express').Router();
const c = require('../controllers/followController');
const { authenticate } = require('../middleware/authMiddleware');
const { requireRole } = require('../middleware/roleMiddleware');

router.use(authenticate);
router.get('/mine', requireRole('STUDENT'), c.mine);
router.get('/followers', requireRole('ORGANIZER', 'ADMIN'), c.myFollowers);
router.get('/organizer/:id', c.status);
router.post('/organizer/:id', requireRole('STUDENT'), c.follow);
router.delete('/organizer/:id', requireRole('STUDENT'), c.unfollow);

module.exports = router;
