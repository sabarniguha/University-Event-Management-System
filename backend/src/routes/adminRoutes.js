const router = require('express').Router();
const c = require('../controllers/adminController');
const { authenticate } = require('../middleware/authMiddleware');
const { requireRole } = require('../middleware/roleMiddleware');

router.use(authenticate, requireRole('ADMIN'));

router.get('/stats', c.stats);
router.get('/users', c.listUsers);
router.patch('/users/:id/role', c.updateUserRole);
router.delete('/users/:id', c.deleteUser);

module.exports = router;
