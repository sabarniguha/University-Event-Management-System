const router = require('express').Router();
const express = require('express');
const rateLimit = require('express-rate-limit');
const c = require('../controllers/mediaController');
const { authenticate } = require('../middleware/authMiddleware');

const uploadLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  limit: 40,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: 'Too many uploads, please try again later' },
});

router.get('/:id', c.serve);
router.post(
  '/',
  authenticate,
  uploadLimiter,
  express.raw({ type: ['image/png', 'image/jpeg', 'image/webp', 'image/gif'], limit: '1500kb' }),
  c.upload
);

module.exports = router;
