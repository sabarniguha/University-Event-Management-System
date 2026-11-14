# UniEvents - campus event platform

**Discover. Connect. Experience Campus Life.**
One repository, one deployable app: an **Express + Prisma (PostgreSQL)** REST API and a **React (Vite + Tailwind)** UI with
framer-motion animations, Lucide icons and Recharts analytics. In production Express also serves the built React app, so you deploy a single service
(or put the frontend on Vercel and the API on Render - see below).

No paid service or API key is needed to run it. Email is optional.

## What is in it

| Area | Features |
|---|---|
| Public site | Home (live stats, featured / upcoming / popular / recent events, categories, FAQ, newsletter), Explore (search, category / date / department / type / online-offline / free-paid filters, sorting, pagination), Categories, Event detail (agenda, speakers, team, eligibility, FAQs, related events), About, Contact, certificate verification |
| Auth | Student sign-up, role-specific logins (`/login/student`, `/login/organizer`, `/login/admin`), JWT, session restore, forgot / reset password, email-verification flow, change password, profile with photo upload, organiser-access requests approved by admins |
| Student | Overview, Discover, My Registrations (cancel, waitlist, pending), My Tickets (QR), Attendance History, Certificates (view, download PDF), Notifications, Profile, Settings (theme, reminders) |
| Organiser | Overview, My Events (draft / pending / published / completed / rejected), Create/Edit Event (cover image, mode, meeting link, deadline, capacity, fee, eligibility, department restriction, agenda, speakers, team, FAQs, terms), Manage Registrations (search, filter, approve / decline, CSV), Attendee Management, **QR attendance scanner** (camera / USB scanner / paste, duplicate scans rejected), Certificates (templates, bulk issue, revoke), Analytics |
| Admin | Overview, User / Student / Organiser management (activate, role, password reset, delete), Event management (feature, edit, delete), **Event approvals** (approve / reject with reason), Category CRUD, Attendance monitoring, Certificates, Reports & analytics (+ CSV), System notifications (broadcast), Audit logs, Platform settings, contact inbox |
| Platform | Light / dark mode, responsive layout, skeleton loaders, empty states, toasts, confirm dialogs, animated page transitions, rate limiting, zod validation, helmet, CORS, 24-hour reminder job |

## Folder structure

```
backend/
  prisma/            schema.prisma, migrations/ (baseline + two additive upgrades), seed.js, seedStartup.js
  src/
    app.js server.js
    controllers/     auth, event, registration, attendance, certificate, category, analytics, admin, notification,
                     announcement, feedback, public, media
    routes/          one file per controller
    middleware/      authMiddleware, roleMiddleware, errorHandler
    utils/           validators (zod), settings, audit, mailer, authTokens, notify, waitlist, reminders, ...
frontend/
  vercel.json        SPA rewrite for Vercel
  src/
    components/      common, layout, navigation, events, dashboard, charts, forms, notifications, tickets
    pages/           public, student, organizer, admin, shared
    context/         Auth, Theme, Toast
    services/        api.js (axios, uploads, downloads)
    hooks/ utils/
```

## Run locally

Requirements: Node 20+, PostgreSQL 14+.

```bash
npm run install:all
cp backend/.env.example backend/.env       # edit DATABASE_URL and JWT_SECRET
cd backend && npx prisma migrate dev && npm run seed && cd ..   # seed = optional demo data
npm run dev:backend        # http://localhost:5000
npm run dev:frontend       # http://localhost:5173  (proxies /api to :5000)
```

### Demo accounts (created only by `npm run seed`, never by default)

| Role | Email | Password |
|---|---|---|
| Admin | admin@uni.edu | Admin@12345 |
| Organiser | organizer@uni.edu | Organizer@123 |
| Students | student@uni.edu, priya@uni.edu, arjun@uni.edu, meera@uni.edu | Student@123 |

These passwords are public. `npm run seed` **refuses to run when `NODE_ENV=production`** unless `ALLOW_DEMO_SEED=true`.

## Environment variables

| Variable | Where | Purpose |
|---|---|---|
| `DATABASE_URL` | backend | PostgreSQL connection string (required) |
| `JWT_SECRET` | backend | Long random string (required). `node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"` |
| `NODE_ENV` | backend | `production` on a live host |
| `PORT` | backend | Set by Render / most hosts |
| `CLIENT_ORIGIN` | backend | Only when the frontend is on a different domain (Vercel). Comma-separated origins |
| `APP_URL` | backend | Public site URL for links in emails (auto-detected on Render) |
| `SMTP_HOST` `SMTP_PORT` `SMTP_USER` `SMTP_PASS` `MAIL_FROM` | backend | Optional email |
| `SEED_ON_START`, `SEED_ADMIN_PASSWORD`, `SEED_ADMIN_EMAIL` | backend | First-deploy bootstrap (see below) |
| `VITE_API_URL` | frontend | Only when the API is on another domain, e.g. `https://your-api.onrender.com/api` |

Never commit `.env` files.

## Deploy on Render (single service, recommended)

1. Create a PostgreSQL database; copy its **Internal Database URL**.
2. New **Web Service** from this repo. **Root Directory: leave empty.**
   - Build command: `npm run build`
   - Start command: `npm start` (runs `prisma migrate deploy`, the optional seed, then the server)
3. Environment: `NODE_ENV=production`, `DATABASE_URL`, `JWT_SECRET`.
4. **First deploy only**: add `SEED_ON_START=true` and `SEED_ADMIN_PASSWORD=<strong password>`. This creates the admin account (`admin@uni.edu`, or set `SEED_ADMIN_EMAIL`) and a few sample UEM events if there are none. No demo students/organisers are created. After you can sign in at `/login/admin`, **delete both variables**.
5. Default categories are created automatically on every start.

The upgrade migrations are additive: existing users, events and registrations are kept.

## Deploy the frontend on Vercel (optional)

1. Deploy the API on Render as above and note its URL.
2. On Render set `CLIENT_ORIGIN=https://<your-vercel-app>.vercel.app`.
3. Vercel: Import the repo, **Root Directory = `frontend`**, framework Vite. Environment variable `VITE_API_URL=https://<your-render-app>.onrender.com/api`.
4. `frontend/vercel.json` already contains the SPA rewrite, so deep links like `/events/3` work.

## API overview

All routes are under `/api`. Bearer JWT in `Authorization`.

| Area | Endpoints |
|---|---|
| Auth | `POST /auth/register` (students only), `/auth/login`, `/auth/forgot-password`, `/auth/reset-password`, `/auth/verify-email`, `/auth/resend-verification`, `/auth/change-password`; `GET/PATCH /auth/me`; `GET/POST /auth/organizer-request` |
| Events | `GET /events` (`q category date department eventType mode price sort page limit featured scope`), `GET /events/:id`, `GET /events/mine`, `GET /events/pending` (admin), `POST /events`, `PATCH /events/:id`, `PATCH /events/:id/approve` and `/reject` (admin), `POST /events/:id/duplicate`, `DELETE /events/:id` |
| Registrations | `POST/DELETE /registrations/:eventId`, `GET /registrations/my` (alias `/me`), `GET /registrations/event/:eventId` (+ `/export`), `PATCH /registrations/:id/decision` |
| Attendance | `POST /attendance/check-in` (alias `/checkin`), `POST /attendance`, `POST /attendance/bulk`, `GET /attendance/my` (alias `/me`), `/attendance/overview`, `/attendance/event/:id` (+ `/export`) |
| Certificates | `POST /certificates/generate`, `GET /certificates/my`, `/certificates/event/:id`, `/certificates/:id`, `PATCH /certificates/:id/revoke`, `GET /certificates/verify/:id` (public), `GET /certificates` (admin) |
| Categories | `GET /categories` (public), `POST/PATCH/DELETE /categories/:id` (admin) |
| Notifications | `GET /notifications`, `POST /notifications/read-all`, `PATCH /notifications/:id/read`, `DELETE /notifications/:id`; admin broadcast `POST /admin/notifications` |
| Analytics | `GET /analytics/student`, `/analytics/organizer`, `/analytics/admin` |
| Admin | `/admin/stats users students organizers events organizer-requests audit-logs settings messages reports/:type` |
| Public | `GET /public/stats`, `/public/highlights`, `/public/settings` (alias `/settings/public`), `POST /public/newsletter`, `/public/contact` |
| Media | `POST /media` (raw image body, max 1.5 MB, type checked by file signature), `GET /media/:id` |

## Security notes

- Public sign-up always creates **students**. Organiser access is requested by a student and approved by an admin.
- Passwords: bcrypt. Reset / verification tokens are random, single-use, expire, and only their SHA-256 hash is stored.
- Roles are always enforced by the API using the database, never by anything stored in the browser. Deactivated accounts are rejected on every request.
- Check-in is validated server-side; one attendance record per registration (database unique constraint), so duplicate scans are rejected.
- Uploads are limited to PNG / JPEG / WebP / GIF, checked by file signature, size-limited and rate-limited.
- Rate limits on the API, login, forms, password reset and uploads. Helmet and CORS are enabled.

## Known limitations

- **No online payment**: an event's fee is informational; organisers collect money outside the platform.
- **Email is optional**: without SMTP, reset links are not delivered (admins can set a new password for a user). Install `nodemailer` and set `SMTP_*` to enable it.
- Images are stored in PostgreSQL (small files only); for heavy use, move them to object storage.
- Reminders run in the web process every 15 minutes; if the service is asleep (e.g. Render free plan), they are sent when it wakes.
- The build and Prisma client generation could not be run in the authoring sandbox (no network); the first Render/Vercel build is the real build test.
