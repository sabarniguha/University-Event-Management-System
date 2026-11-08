const router = require('express').Router();
const c = require('../controllers/announcementController');
const { authenticate } = require('../middleware/authMiddleware');
const { requireRole } = require('../middleware/roleMiddleware');

// Public landing-page feed (must be declared before '/:id' style routes)
router.get('/public', c.publicAnnouncements);

router.use(authenticate);
router.get('/', c.listAnnouncements);
router.post('/', requireRole('ORGANIZER', 'ADMIN'), c.createAnnouncement);
router.patch('/:id', requireRole('ORGANIZER', 'ADMIN'), c.updateAnnouncement);
router.delete('/:id', requireRole('ORGANIZER', 'ADMIN'), c.deleteAnnouncement);

module.exports = router;
