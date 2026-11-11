const router = require('express').Router();
const c = require('../controllers/adminController');
const { authenticate } = require('../middleware/authMiddleware');
const { requireRole } = require('../middleware/roleMiddleware');

router.use(authenticate, requireRole('ADMIN'));

router.get('/stats', c.stats);
router.get('/analytics', c.analytics);
router.get('/users', c.listUsers);
router.post('/users', c.createUser);
router.patch('/users/:id/role', c.updateUserRole);
router.delete('/users/:id', c.deleteUser);

module.exports = router;
