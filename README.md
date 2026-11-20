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
| `SMTP_HOST` `SMTP_PORT` `SMTP_USER` `SMTP_PASS` `MAIL_FROM` | backend | Optional email. Gmail: host `smtp.gmail.com`, port `587`, user = your Gmail address, pass = a 16-character [app password](https://myaccount.google.com/apppasswords) (needs 2-step verification), `MAIL_FROM` = `UniEvents <you@gmail.com>` |
| `RAZORPAY_KEY_ID` `RAZORPAY_KEY_SECRET` | backend | Optional online payment of event fees (use test keys first) |
| `RAZORPAY_WEBHOOK_SECRET` | backend | Optional. In the Razorpay dashboard add a webhook to `https://<your-app>/api/payments/webhook` for `payment.captured` with this secret; it registers students who pay but close the tab |
| `CLOUDINARY_CLOUD_NAME` `CLOUDINARY_API_KEY` `CLOUDINARY_API_SECRET` | backend | Optional image hosting (`CLOUDINARY_FOLDER` optional) |
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
| Calendar | `GET /calendar/:id` (public, downloads an `.ics` file for a published event) |
| Payments | `GET /payments` and `PATCH /payments/:id/refunded` (admin), `GET /payments/config`, `POST /payments/:eventId/order`, `POST /payments/verify` (students), `POST /payments/webhook` (Razorpay) |
| Media | `POST /media` (raw image body, max 1.5 MB, type checked by file signature), `GET /media/:id` |

## Security notes

- Public sign-up always creates **students**. Organiser access is requested by a student and approved by an admin.
- Passwords: bcrypt. Reset / verification tokens are random, single-use, expire, and only their SHA-256 hash is stored.
- Roles are always enforced by the API using the database, never by anything stored in the browser. Deactivated accounts are rejected on every request.
- Check-in is validated server-side; one attendance record per registration (database unique constraint), so duplicate scans are rejected.
- Uploads are limited to PNG / JPEG / WebP / GIF, checked by file signature, size-limited and rate-limited.
- Rate limits on the API, login, forms, password reset and uploads. Helmet and CORS are enabled.

## Extras

- **Add to calendar**: every published event has an `.ics` download (Google, Apple and Outlook calendars).
- **Payments page** (admin): lists online payments and lets admins mark refunded ones after refunding in Razorpay.
- **CI**: `.github/workflows/ci.yml` runs the backend tests and the frontend build on every push and pull request.

- **Registration link and strict deadline**: organisers (and admins) can paste a Google Form link on an event. The event page shows the exact deadline with a live countdown, the form button disappears and the page says "closed" once the deadline passes, and the server refuses in-app registration after it. A deadline is required whenever a link is added, and the event form asks for one. Event cards show a "Closes in..." badge. The link is a plain https URL typed by the organiser; no sample events include a form link.

## Sign-up and demo accounts

- **Register page** has Student, Organiser and Admin tabs. The Organiser tab creates a normal student account plus an organiser request that an administrator approves under Organizer Requests. The Admin tab explains that admin accounts are created by an existing admin, so nobody can make themselves one (the demo admin above is the only exception, and it is read-only).
- **Demo accounts (optional)**: set `ENABLE_DEMO_ACCOUNTS=true` and `DEMO_PASSWORD=<8+ characters>` on the server. A demo student (`demo.student@uni.edu`) and demo organiser (`demo.organizer@uni.edu`) are created and shown, with the password, on their login pages. A read-only demo admin (`demo.admin@uni.edu`) is created only with the extra `ENABLE_DEMO_ADMIN=true`: it can browse every admin page but any change is refused. It can see all user details, so never enable it on a site with real students. The password is public, so use this only for a demo site and remove the two variables for real use.

## Samples, verification and featured events

- Certificate and ticket pages show a clearly marked **sample certificate** and **sample ticket**, so people see what they will get after an event. Samples never verify as real.
- Anyone can verify a **certificate ID** at `/verify` and a **ticket code** at `/verify-ticket` (no sign-in; linked from the footer and from every role's certificate pages). Ticket checks show only the event, status and an abbreviated holder name.
- **Featured events** appear on the home page and on the student, organiser and admin dashboards. Admins star events in Event Management; until any are starred, the soonest upcoming events are shown instead.

## Email verification (all roles)

When SMTP is configured, every new account gets a verification link at its own address: students and organisers who sign up, and any account an admin creates (student, organiser or admin). A yellow banner with a "Resend link" button shows until the address is confirmed. Until then a student cannot register for events and an organiser cannot create them; admins are never locked out. Admins can click the mail-check icon in User Management to mark a placeholder address (for example `organizer@uni.edu`) as verified. Without SMTP nothing can be sent, so nothing is blocked.

## Team events

Organisers set **Minimum / Maximum members** on the event form (both 1 means a normal solo event). For a team event, a student registers first, then creates a team or joins one with its 6-character code on the event page. Each member registers (and pays, if there is a fee) on their own, one team per student per event, and the leader can remove members or disband. Organisers and admins see every team under **Registrations -> Teams** and can download a CSV.

## Bulk CSV import

- **Admin -> Students -> Import CSV** creates up to 500 student accounts at once from a CSV (`name,email` required; `department,studentId,phone` optional). Each student is emailed a link to choose their own password and verify their email; no passwords are shown or stored in plain text. Without SMTP set up nothing is emailed (use Reset password instead).
- **Organiser/Admin -> Attendance -> Import CSV** marks people present from a CSV with an `email` or `studentId` column. Only confirmed registrations are matched, and unmatched rows are listed.

## Event surveys

On any event, organisers and admins open **Survey questions** to add their own questions (short answer, multiple choice, yes/no, 1-5 rating), either **after registering** (t-shirt size, diet) or **after the event** (feedback). Students answer them in a "Questions from the organiser" box on the event page once registered; answers can be edited. **Export answers** downloads one CSV row per student. Registration questions do not block registering; they are asked right after.

## Recommended for you

The student dashboard shows up to three upcoming events they have not joined, ranked by their department, the categories of events they registered for or attended before, how full the event is and how soon it starts. Each card says why it was suggested. It is calculated from real data on request; nothing is stored.

## Event photos and sponsors

Organisers and admins open **Photos and sponsors** on an event to upload gallery photos (up to 40) and sponsor logos with an optional website (up to 12). They appear on the public event page as a "Our sponsors" strip and a photo grid with a full-size viewer. Uploads use the same image storage as event banners (Cloudinary if configured, otherwise the database), 1.5 MB each.

## Points, badges and leaderboard

Students earn 10 points per attended event, 5 per feedback given and 3 for joining a team. Six badges unlock automatically (First Step, Regular, Campus Champion, Explorer, Voice of the Campus, Team Player) and levels run Bronze 10, Silver 60, Gold 150. Everything is calculated from real attendance, feedback and team records on request, so nothing is invented and nothing extra is stored. The leaderboard shows the top ten with shortened names (for example "Asha R."). See **Points and Badges** in the student menu.

## Sharing and search

- Event links get a proper preview (title, date and venue, banner image) when pasted into WhatsApp, Telegram, LinkedIn and similar apps, because the server adds the tags to each event page. **Share on WhatsApp** is on every event page.
- `/sitemap.xml` lists every published event and `/robots.txt` points search engines to it (the private dashboards are excluded). Submit `https://your-site/sitemap.xml` in Google Search Console.
- Set `APP_URL` to your public address (Render sets `RENDER_EXTERNAL_URL` automatically) so previews and the sitemap use the right domain.
- Previews and the sitemap come from the Express server, so share the Render link. A frontend hosted separately on Vercel cannot add them.

## Install the app and offline tickets

UniEvents is an installable web app. On Android/Chrome/Edge use **Install the app** (footer or Settings); on iPhone use Safari, Share, **Add to Home Screen**. Once installed it opens full-screen with its own icon, and shortcuts for My Tickets and Discover Events.

- The app itself still opens with no signal (a service worker keeps the page shell and built files; it never stores anything from `/api`).
- Each time a student opens **My Tickets** while online, their current confirmed tickets (QR code, title, date, venue) are saved on that phone. With no signal, an **offline** bar appears with **Show my saved tickets** (`/offline-tickets`), which works even if the phone has been signed out of the session because it is offline. Saved tickets are removed when the student signs out and expire after the event ends.
- Staying signed in: opening the app offline no longer signs you out; only an answer from the server saying the session is invalid does.
- Check-in still needs the organiser's scanner to be online.

## Admin two-factor sign-in and login lockout

- **Two-factor (optional, admins only):** Settings -> **Two-factor sign-in** -> Set up. Scan the QR code with Google Authenticator, Authy or Microsoft Authenticator, enter the 6-digit code, and save the 8 one-time backup codes (shown once). After that, signing in needs the password and a code. Codes work once. Turn it off or make new backup codes from the same card (needs password and a code).
- **If an admin is locked out:** another admin can click the shield icon on their row in Users to remove their 2FA and lockout. If there is no other admin, run `npm run admin:reset-2fa -- admin@example.com` in the backend (Render shell).
- **Lockout (all real accounts):** 5 wrong passwords or codes in a row lock that account for 15 minutes (`LOGIN_MAX_ATTEMPTS`, `LOGIN_LOCK_MINUTES`). A successful sign-in or a password reset by email clears it. The shared **demo accounts are exempt**, and the demo admin never uses 2FA, so demo mode behaves exactly as before.
- 2FA secrets are stored encrypted. Set `TWO_FACTOR_KEY` (any long random string) if you ever plan to rotate `JWT_SECRET`, otherwise rotating it makes enrolled admins use `admin:reset-2fa`.
- Nothing changes for any account that has not turned 2FA on, apart from the lockout.

## Reports and PDF export

**Reports (PDF)** is in the Admin and Organiser menus. Pick **Monthly** or **Yearly**, a month and a year, then **Download PDF** and choose **Save as PDF** in the print window (it prints on A4 with colours, charts and images).

- **Organisers** get a report for their own events only: key figures with change against the previous period, day-by-day or month-by-month charts, registrations by category and student department, most popular and best rated events, an all-events table, and (optionally) each event's full description. The server always limits an organiser to their own events, whatever the request says.
- **Admins** get the whole platform, or one organiser from the Organiser drop-down, and in addition an organiser performance table, new and active accounts, and the approval pipeline.
- **Event report** (button on every event for its organiser and for admins) is one event in full: banner, description, agenda, speakers, FAQ, registrations by status, who registered when, attendance and check-ins by hour, payments, certificates, teams, feedback (comments without names), sponsors, photos and the list of confirmed attendees.
- Numbers are worked out from the live database and explained at the end of each report; a figure that cannot be calculated (for example attendance for an event that has not finished) shows a dash. Months and days are cut at Indian time (UTC+05:30); set `REPORT_TZ_OFFSET_MIN` to change that.

## Camera ticket scanning

Organisers and admins have a **Scan Tickets** page (`/organizer/scan`, `/admin/scan`): pick an event, start the camera, point it at a student's QR ticket and they are marked present. It works in every modern browser (the built-in detector where available, the `jsqr` library elsewhere) and needs HTTPS and camera permission. The ticket ID can also be typed in, and every result shows the ticket ID. The older per-event attendance pages are unchanged.

## Approval plus payment

For an event with a fee and manual approval: the student requests to join (status PENDING), the organiser approves (status AWAITING_PAYMENT, the student is notified and emailed), the student pays online and becomes REGISTERED with a QR ticket. A late approval can still be paid after the registration deadline. If the event fills up in the meantime, the payment is refunded automatically.

## Issuing certificates

Organisers (and admins, from **Certificates, Issue certificates**) open an event's Certificates page and click **Generate certificates**. By default they go to students marked present; tick "Also certify registered students who were not scanned" to include everyone who registered. Each certificate gets a unique ID, appears in the student's Certificates page and notifications (and email, if set up), and can be verified by anyone at `/verify`. Organisers (for their own events) and admins can both issue at any time, including before an event starts.

## Seeing who paid

- **Students**: My Payments lists their receipts (amount, date, Razorpay payment ID).
- **Organisers**: Payments lists who paid for *their* events, with student name, email, student ID and payment ID, plus totals collected.
- **Admins**: the same for every event, plus the refund controls and a step-by-step Razorpay setup guide while keys are missing.
- At checkout, students see UPI first (QR code, Google Pay, PhonePe, Paytm), then cards, netbanking and wallets, whichever are enabled on your Razorpay account.

## Optional services (switch on with environment variables)

Nothing below is needed to launch the app. Each feature turns on when its keys are set.

- **Email** (`SMTP_*`): password resets, verification links, registration confirmations and decisions, event approval or rejection, and certificates. Users can switch email off in Settings.
- **Online payments** (`RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET`, optional `RAZORPAY_WEBHOOK_SECRET`): students pay event fees in Razorpay checkout. If someone pays but the event filled meanwhile, the payment is refunded automatically; if that fails, admins get a "Refund now" button on the Payments page. Events that need organiser approval work in two steps when payments are on: the organiser approves, then the student gets a **Pay now** button and is registered once the payment succeeds (without Razorpay keys the fee is collected in person). Try it with test keys (`rzp_test_...`) first.
- **Image hosting** (`CLOUDINARY_*`): uploads go to Cloudinary, and fall back to PostgreSQL if Cloudinary is unreachable.
- **Always-on reminders** (`CRON_SECRET` on Render, plus repository variable `APP_URL` and secret `CRON_SECRET` on GitHub): the workflow `.github/workflows/keep-awake.yml` pings the site every 10 minutes so a free Render service stays awake and event reminders go out on time.

## Before you go live

- The first Render/Vercel build is the first real build of this code; watch its log.
- Remove `SEED_ON_START` and `SEED_ADMIN_PASSWORD` after the first sign-in, and rotate any secret that was ever committed.

## If the Vercel site shows "-" and no events

The page is not reaching the API. Vite bakes `VITE_API_URL` in at build time, so after setting it you must **redeploy** on Vercel.

1. Vercel, Project, Settings, Environment Variables: `VITE_API_URL` = `https://<your-render-app>.onrender.com/api` (ends with `/api`), then Deployments, Redeploy.
2. Render, Environment: `CLIENT_ORIGIN` = your Vercel address (e.g. `https://frontend-six-tan-80.vercel.app`, no trailing slash).
3. Open `https://<your-render-app>.onrender.com/api/health`. It should answer `{"status":"ok"}`. A free Render service sleeps and takes about a minute to wake.

The Render address serves the whole app by itself, so Vercel is optional. The site now shows a clear red message when it cannot reach the API.

https://university-event-management-system-3.onrender.com/ is the link
