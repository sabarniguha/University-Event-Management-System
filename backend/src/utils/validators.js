const { z } = require('zod');
const HttpError = require('./httpError');

const parseId = (value, label = 'id') => {
  const n = Number(value);
  if (!Number.isInteger(n) || n <= 0) throw new HttpError(400, `Invalid ${label}`);
  return n;
};

const emptyToUndefined = (v) => (typeof v === 'string' && v.trim() === '' ? undefined : v);
const emptyToNull = (v) => (typeof v === 'string' && v.trim() === '' ? null : v);
const optionalText = (max) => z.preprocess(emptyToUndefined, z.string().trim().max(max).optional());
// "" clears the value (stored as null); omitted means "leave unchanged" on updates.
const nullableText = (max) => z.preprocess(emptyToNull, z.string().trim().max(max).nullable().optional());

const password = z.string().min(8, 'Password must be at least 8 characters').max(72);
const email = z.string().trim().toLowerCase().email('Enter a valid email');

// A picture is either an uploaded file (/api/media/<id>) or an https/http URL.
const imageRef = z.preprocess(
  emptyToNull,
  z
    .string()
    .trim()
    .max(500)
    .refine((v) => /^\/api\/media\/\d+$/.test(v) || /^https?:\/\/\S+$/i.test(v), 'Enter a valid image URL')
    .nullable()
    .optional()
);

const registerSchema = z.object({
  name: z.string().trim().min(2, 'Name must be at least 2 characters').max(100),
  email,
  password,
  department: optionalText(100),
  phone: optionalText(20),
  studentId: optionalText(40),
  year: z.preprocess(emptyToUndefined, z.coerce.number().int().min(1).max(8).optional()),
  college: optionalText(150),
});

const loginSchema = z.object({
  email,
  password: z.string().min(1, 'Password is required'),
  // Which login page was used. When given, the account must have this role.
  role: z.enum(['STUDENT', 'ORGANIZER', 'ADMIN']).optional(),
});

const profileSchema = z.object({
  name: z.string().trim().min(2).max(100).optional(),
  department: nullableText(100),
  phone: nullableText(20),
  studentId: nullableText(40),
  year: z.preprocess(emptyToNull, z.coerce.number().int().min(1).max(8).nullable().optional()),
  college: nullableText(150),
  bio: nullableText(500),
  avatarUrl: imageRef,
  skills: z.array(z.string().trim().min(1).max(40)).max(20).optional(),
  notificationPrefs: z
    .object({
      reminders: z.boolean().optional(),
      announcements: z.boolean().optional(),
      email: z.boolean().optional(),
    })
    .optional(),
});

const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, 'Enter your current password'),
  newPassword: password,
});

const forgotPasswordSchema = z.object({ email });
const resetPasswordSchema = z.object({ token: z.string().min(20).max(200), password });
const verifyEmailSchema = z.object({ token: z.string().min(20).max(200) });

const organizerRequestSchema = z.object({
  organization: z.string().trim().min(2, 'Tell us which club or department you represent').max(150),
  designation: optionalText(100),
  reason: optionalText(1000),
});

// ------------------------------------------------------------------ events
const agendaItem = z.object({
  time: optionalText(40),
  title: z.string().trim().min(1).max(200),
  description: optionalText(1000),
});
const speaker = z.object({
  name: z.string().trim().min(1).max(100),
  title: optionalText(150),
  bio: optionalText(600),
  photoUrl: imageRef,
});
const teamMember = z.object({ name: z.string().trim().min(1).max(100), role: optionalText(100) });
const faq = z.object({ question: z.string().trim().min(1).max(300), answer: z.string().trim().min(1).max(1500) });

const eventBase = z.object({
  title: z.string().trim().min(3, 'Title must be at least 3 characters').max(200),
  description: z.string().trim().min(10, 'Description must be at least 10 characters').max(5000),
  venue: z.string().trim().min(2).max(200),
  category: z.string().trim().min(2).max(60).default('General'),
  bannerUrl: imageRef,
  startsAt: z.coerce.date(),
  endsAt: z.coerce.date(),
  capacity: z.coerce.number().int().min(1).max(100000).default(100),
  status: z.enum(['DRAFT', 'PUBLISHED', 'CANCELLED', 'PENDING_APPROVAL', 'REJECTED']).default('DRAFT'),
  // null / empty string clears the deadline; omitted means "no change" on update.
  registrationDeadline: z.preprocess((v) => (v === '' ? null : v), z.coerce.date().nullable().optional()),
  waitlistEnabled: z.boolean().default(true),
  mode: z.enum(['OFFLINE', 'ONLINE', 'HYBRID']).default('OFFLINE'),
  onlineUrl: z.preprocess(
    emptyToNull,
    z.string().trim().max(500).regex(/^https?:\/\/\S+$/i, 'Enter a valid meeting link').nullable().optional()
  ),
  fee: z.coerce.number().int().min(0).max(1000000).default(0),
  eventType: nullableText(60),
  department: nullableText(100),
  eligibility: nullableText(1000),
  requirements: nullableText(1000),
  agenda: z.array(agendaItem).max(40).optional(),
  speakers: z.array(speaker).max(20).optional(),
  team: z.array(teamMember).max(30).optional(),
  faqs: z.array(faq).max(30).optional(),
  contactEmail: z.preprocess(emptyToNull, z.string().trim().toLowerCase().email('Enter a valid contact email').nullable().optional()),
  contactPhone: nullableText(30),
  terms: nullableText(3000),
  requiresRegistrationApproval: z.boolean().default(false),
  featured: z.boolean().optional(),
});

const eventCreateSchema = eventBase
  .refine((d) => d.endsAt > d.startsAt, { message: 'End time must be after start time', path: ['endsAt'] })
  .refine((d) => !d.registrationDeadline || d.registrationDeadline <= d.endsAt, {
    message: 'Registration deadline cannot be after the event ends',
    path: ['registrationDeadline'],
  })
  .refine((d) => d.mode === 'OFFLINE' || d.onlineUrl, {
    message: 'Add the meeting link for an online or hybrid event',
    path: ['onlineUrl'],
  });

const eventUpdateSchema = eventBase.partial();

const rejectEventSchema = z.object({ reason: z.string().trim().min(3, 'Give a short reason').max(1000) });

const registrationDecisionSchema = z.object({
  action: z.enum(['APPROVE', 'REJECT']),
  note: optionalText(500),
});

// ------------------------------------------------------------------ attendance
const attendanceSchema = z.object({
  registrationId: z.coerce.number().int().positive(),
  status: z.enum(['PRESENT', 'ABSENT']),
});

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

// ------------------------------------------------------------------ certificates
const generateCertificatesSchema = z.object({
  eventId: z.coerce.number().int().positive(),
  registrationIds: z.array(z.coerce.number().int().positive()).max(5000).optional(),
  templateKey: z.enum(['classic', 'modern', 'minimal']).default('classic'),
  title: z.string().trim().min(3).max(120).default('Certificate of Participation'),
  signatoryName: optionalText(100),
  signatoryTitle: optionalText(100),
});

// ------------------------------------------------------------------ announcements
const announcementSchema = z.object({
  title: z.string().trim().min(3).max(200),
  content: z.string().trim().min(5).max(5000),
  audience: z.enum(['ALL', 'STUDENTS', 'ORGANIZERS']).default('ALL'),
  priority: z.enum(['NORMAL', 'IMPORTANT', 'URGENT']).default('NORMAL'),
  status: z.enum(['DRAFT', 'PUBLISHED']).default('PUBLISHED'),
  eventId: z.preprocess(emptyToUndefined, z.coerce.number().int().positive().optional()),
});

const announcementUpdateSchema = announcementSchema.partial();

// ------------------------------------------------------------------ admin
const roleSchema = z.object({ role: z.enum(['STUDENT', 'ORGANIZER', 'ADMIN']) });

// Admin creates an account of any role directly.
const adminCreateUserSchema = z.object({
  name: z.string().trim().min(2).max(100),
  email,
  password,
  role: z.enum(['STUDENT', 'ORGANIZER', 'ADMIN']),
  department: optionalText(100),
  phone: optionalText(20),
});

const adminUpdateUserSchema = z.object({
  name: z.string().trim().min(2).max(100).optional(),
  department: nullableText(100),
  phone: nullableText(20),
  isActive: z.boolean().optional(),
});

const adminResetPasswordSchema = z.object({ password });

const organizerDecisionSchema = z.object({
  action: z.enum(['APPROVE', 'REJECT']),
  note: optionalText(500),
});

const categorySchema = z.object({
  name: z.string().trim().min(2).max(60),
  description: nullableText(300),
  icon: nullableText(40),
  sortOrder: z.coerce.number().int().min(0).max(1000).optional(),
});

const settingsSchema = z
  .object({
    siteName: z.string().trim().min(2).max(60),
    tagline: z.string().trim().max(160),
    contactEmail: z.preprocess((v) => (v === null ? '' : v), z.string().trim().max(150).refine((v) => v === '' || /^\S+@\S+\.\S+$/.test(v), 'Enter a valid email')),
    requireEventApproval: z.boolean(),
    allowStudentSignup: z.boolean(),
  })
  .partial();

const broadcastSchema = z.object({
  title: z.string().trim().min(3).max(150),
  message: z.string().trim().min(3).max(1000),
  audience: z.enum(['ALL', 'STUDENTS', 'ORGANIZERS', 'ADMINS']).default('ALL'),
  link: z.preprocess(emptyToUndefined, z.string().trim().max(300).regex(/^\//, 'Link must start with /').optional()),
});

// ------------------------------------------------------------------ public
const newsletterSchema = z.object({ email });
const contactSchema = z.object({
  name: z.string().trim().min(2).max(100),
  email,
  subject: z.string().trim().min(3).max(150),
  message: z.string().trim().min(10).max(3000),
});

module.exports = {
  parseId,
  registerSchema,
  loginSchema,
  profileSchema,
  changePasswordSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
  verifyEmailSchema,
  organizerRequestSchema,
  eventCreateSchema,
  eventUpdateSchema,
  rejectEventSchema,
  registrationDecisionSchema,
  attendanceSchema,
  checkInSchema,
  bulkAttendanceSchema,
  feedbackSchema,
  generateCertificatesSchema,
  announcementSchema,
  announcementUpdateSchema,
  roleSchema,
  adminCreateUserSchema,
  adminUpdateUserSchema,
  adminResetPasswordSchema,
  organizerDecisionSchema,
  categorySchema,
  settingsSchema,
  broadcastSchema,
  newsletterSchema,
  contactSchema,
};
