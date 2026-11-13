const router = require('express').Router();
const c = require('../controllers/categoryController');
const { authenticate } = require('../middleware/authMiddleware');
const { requireRole } = require('../middleware/roleMiddleware');

router.get('/', c.list);
router.post('/', authenticate, requireRole('ADMIN'), c.create);
router.patch('/:id', authenticate, requireRole('ADMIN'), c.update);
router.delete('/:id', authenticate, requireRole('ADMIN'), c.remove);

module.exports = router;
