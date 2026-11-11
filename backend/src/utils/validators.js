const { z } = require('zod');
const HttpError = require('./httpError');

const parseId = (value, label = 'id') => {
  const n = Number(value);
  if (!Number.isInteger(n) || n <= 0) throw new HttpError(400, `Invalid ${label}`);
  return n;
};

const emptyToUndefined = (v) => (typeof v === 'string' && v.trim() === '' ? undefined : v);
const optionalText = (max) => z.preprocess(emptyToUndefined, z.string().trim().max(max).optional());

const registerSchema = z.object({
  name: z.string().trim().min(2, 'Name must be at least 2 characters').max(100),
  email: z.string().trim().toLowerCase().email('Enter a valid email'),
  password: z.string().min(8, 'Password must be at least 8 characters').max(72),
  department: optionalText(100),
  phone: optionalText(20),
});

const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email('Enter a valid email'),
  password: z.string().min(1, 'Password is required'),
  // Which login page was used. When given, the account must have this role.
  role: z.enum(['STUDENT', 'ORGANIZER', 'ADMIN']).optional(),
});

const profileSchema = z.object({
  name: z.string().trim().min(2).max(100).optional(),
  department: z.string().trim().max(100).optional(),
  phone: z.string().trim().max(20).optional(),
});

const eventBase = z.object({
  title: z.string().trim().min(3, 'Title must be at least 3 characters').max(200),
  description: z.string().trim().min(10, 'Description must be at least 10 characters').max(5000),
  venue: z.string().trim().min(2).max(200),
  category: z.string().trim().min(2).max(50).default('General'),
  bannerUrl: z.preprocess(emptyToUndefined, z.string().trim().url('Banner must be a valid URL').max(500).optional()),
  startsAt: z.coerce.date(),
  endsAt: z.coerce.date(),
  capacity: z.coerce.number().int().min(1).max(100000).default(100),
  status: z.enum(['DRAFT', 'PUBLISHED', 'CANCELLED']).default('DRAFT'),
  // null / empty string clears the deadline; omitted means "no change" on update.
  registrationDeadline: z.preprocess(
    (v) => (v === '' ? null : v),
    z.coerce.date().nullable().optional()
  ),
  waitlistEnabled: z.boolean().default(true),
});

const eventCreateSchema = eventBase
  .refine((d) => d.endsAt > d.startsAt, {
    message: 'End time must be after start time',
    path: ['endsAt'],
  })
  .refine((d) => !d.registrationDeadline || d.registrationDeadline <= d.endsAt, {
    message: 'Registration deadline cannot be after the event ends',
    path: ['registrationDeadline'],
  });

const eventUpdateSchema = eventBase.partial();

const attendanceSchema = z.object({
  registrationId: z.coerce.number().int().positive(),
  status: z.enum(['PRESENT', 'ABSENT']),
});

const announcementSchema = z.object({
  title: z.string().trim().min(3).max(200),
  content: z.string().trim().min(5).max(5000),
  audience: z.enum(['ALL', 'STUDENTS', 'ORGANIZERS']).default('ALL'),
  priority: z.enum(['NORMAL', 'IMPORTANT', 'URGENT']).default('NORMAL'),
  status: z.enum(['DRAFT', 'PUBLISHED']).default('PUBLISHED'),
  eventId: z.preprocess(emptyToUndefined, z.coerce.number().int().positive().optional()),
});

const announcementUpdateSchema = announcementSchema.partial();

const roleSchema = z.object({ role: z.enum(['STUDENT', 'ORGANIZER', 'ADMIN']) });

// QR / ticket check-in by an organiser at the door.
const checkInSchema = z.object({
  eventId: z.coerce.number().int().positive(),
  ticketCode: z.string().trim().min(8, 'Enter a valid ticket code').max(100),
});

// Mark every still-unmarked registered student for an event.
const bulkAttendanceSchema = z.object({
  eventId: z.coerce.number().int().positive(),
  status: z.enum(['PRESENT', 'ABSENT']),
});

const feedbackSchema = z.object({
  rating: z.coerce.number().int().min(1, 'Choose a rating from 1 to 5').max(5, 'Choose a rating from 1 to 5'),
  comment: z.preprocess(emptyToUndefined, z.string().trim().max(1000).optional()),
});

// Admin creates an account of any role directly.
const adminCreateUserSchema = z.object({
  name: z.string().trim().min(2).max(100),
  email: z.string().trim().toLowerCase().email('Enter a valid email'),
  password: z.string().min(8, 'Password must be at least 8 characters').max(72),
  role: z.enum(['STUDENT', 'ORGANIZER', 'ADMIN']),
  department: optionalText(100),
  phone: optionalText(20),
});

module.exports = {
  checkInSchema,
  bulkAttendanceSchema,
  feedbackSchema,
  adminCreateUserSchema,
  parseId,
  registerSchema,
  loginSchema,
  profileSchema,
  eventCreateSchema,
  eventUpdateSchema,
  attendanceSchema,
  checkInSchema,
  bulkAttendanceSchema,
  feedbackSchema,
  adminCreateUserSchema,
  announcementSchema,
  announcementUpdateSchema,
  roleSchema,
};
