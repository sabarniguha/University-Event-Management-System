const router = require('express').Router();
const c = require('../controllers/notificationController');
const { authenticate } = require('../middleware/authMiddleware');

router.use(authenticate);

router.get('/', c.list);
router.post('/read-all', c.readAll);
router.patch('/:id/read', c.markRead);

module.exports = router;
