const router = require('express').Router();
const rateLimit = require('express-rate-limit');
const c = require('../controllers/certificateController');
const { authenticate } = require('../middleware/authMiddleware');
const { requireRole } = require('../middleware/roleMiddleware');

const verifyLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: 'Too many verification attempts, please try again later' },
});

// Public: anyone holding a certificate can check that it is genuine.
router.get('/verify/:certificateId', verifyLimiter, c.verify);

router.use(authenticate);
router.get('/templates', requireRole('ORGANIZER', 'ADMIN'), c.templates);
router.get('/my', requireRole('STUDENT'), c.mine);
router.get('/event/:eventId', requireRole('ORGANIZER', 'ADMIN'), c.forEvent);
router.post('/generate', requireRole('ORGANIZER', 'ADMIN'), c.generate);
router.get('/', requireRole('ADMIN'), c.listAll);
router.get('/:certificateId/pdf', c.pdf);
router.get('/:certificateId', c.getOne);
router.patch('/:certificateId/revoke', requireRole('ORGANIZER', 'ADMIN'), c.revoke);

module.exports = router;
