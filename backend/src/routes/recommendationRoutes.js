const router = require('express').Router();
const c = require('../controllers/recommendationController');
const { authenticate } = require('../middleware/authMiddleware');
const { requireRole } = require('../middleware/roleMiddleware');

router.get('/', authenticate, requireRole('STUDENT'), c.forMe);

module.exports = router;
