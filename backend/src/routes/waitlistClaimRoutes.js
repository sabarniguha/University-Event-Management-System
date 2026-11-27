const router = require('express').Router();
const c = require('../controllers/waitlistClaimController');
const { authenticate } = require('../middleware/authMiddleware');
const { requireRole } = require('../middleware/roleMiddleware');

router.use(authenticate, requireRole('STUDENT'));
router.get('/mine', c.mine);
router.post('/:id/confirm', c.confirm);

module.exports = router;
