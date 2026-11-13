const router = require('express').Router();
const c = require('../controllers/adminController');
const { authenticate } = require('../middleware/authMiddleware');
const { requireRole } = require('../middleware/roleMiddleware');

router.use(authenticate, requireRole('ADMIN'));

router.get('/stats', c.stats);
router.get('/analytics', c.analytics);

router.get('/users', c.listUsers);
router.post('/users', c.createUser);
router.patch('/users/:id', c.updateUser);
router.patch('/users/:id/role', c.updateUserRole);
router.post('/users/:id/reset-password', c.resetUserPassword);
router.delete('/users/:id', c.deleteUser);
router.get('/students', c.listStudents);
router.get('/organizers', c.listOrganizers);

router.get('/organizer-requests', c.listOrganizerRequests);
router.patch('/organizer-requests/:id', c.decideOrganizerRequest);

router.get('/events', c.listEvents);
router.get('/audit-logs', c.auditLogs);
router.get('/settings', c.getPlatformSettings);
router.put('/settings', c.updatePlatformSettings);
router.get('/messages', c.listMessages);
router.patch('/messages/:id/read', c.readMessage);
router.post('/notifications', c.broadcast);
router.get('/reports/:type', c.report);

module.exports = router;
