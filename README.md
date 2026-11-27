# UniEvents - campus event platform

**Discover. Connect. Experience Campus Life.**

UniEvents is a complete college event-management web app. Students find and join events and keep QR tickets and certificates. Organisers create events, take attendance and see how they did. Admins approve events, manage people and see the whole platform. Everyone gets exportable PDF reports and, optionally, an AI assistant.

One repository, one deployable app: an **Express 4 + Prisma 5 (PostgreSQL)** REST API and a **React 18 (Vite + Tailwind 3)** interface. In production Express also serves the built React app, so you deploy a single service (or put the frontend on Vercel and the API on Render).

Live demo: https://university-event-management-system-3.onrender.com/

**No paid service or API key is needed to launch it.** Email, online payments, image hosting and the AI assistant each switch on only when their keys are set.

---

## Contents

1. [Features at a glance](#features-at-a-glance)
2. [Features in detail](#features-in-detail)
3. [Reports and PDF export](#reports-and-pdf-export)
4. [AI assistant](#ai-assistant-optional-groq)
5. [Tech stack and architecture](#tech-stack-and-architecture)
6. [Folder structure](#folder-structure)
7. [Data model and migrations](#data-model-and-migrations)
8. [Run locally](#run-locally)
9. [Environment variables](#environment-variables)
10. [Deploy on Render](#deploy-on-render-single-service-recommended)
11. [Deploy the frontend on Vercel](#deploy-the-frontend-on-vercel-optional)
12. [API overview](#api-overview)
13. [Security and privacy](#security-and-privacy)
14. [Testing](#testing)
15. [Before you go live](#before-you-go-live)
16. [Troubleshooting](#troubleshooting)
17. [Limits and honest notes](#limits-and-honest-notes)

---

## Features at a glance

| Area | What is in it |
|---|---|
| Public site | Home (live stats, featured / upcoming / popular / recent events, categories, FAQ, newsletter), Explore (search; category, date, department, type, online/offline and free/paid filters; sorting; pagination), Categories, Event detail (agenda, speakers, team, eligibility, FAQs, related events, photos, sponsors), About, Contact, certificate / ticket / report verification |
| Accounts | Student sign-up, separate logins (`/login/student`, `/login/organizer`, `/login/admin`), JWT sessions, forgot / reset password, email verification, change password, profile photo, organiser-access requests approved by admins |
| Student | Overview with recommendations, Discover, My Registrations (cancel, waitlist, pending), My Tickets (QR, works offline), Attendance History, My Payments, Certificates (PDF), Points and Badges, My Report (PDF), Activity Transcript, Notifications, Profile, Settings |
| Organiser | Overview, My Events (draft / pending / published / completed / rejected), Create / Edit Event, Manage Registrations, Attendee Management, QR scanner (camera, USB or paste), Payments, Certificates, Analytics, Reports (PDF), per-event Teams, Survey, Photos and sponsors |
| Admin | Overview, User / Student / Organiser management, Event management, Event Approvals, Categories, Attendance monitoring, Certificates, Reports and Analytics, Reports (PDF), Announcements, System notifications, Payments, Audit logs, Platform settings (two-factor sign-in, bulk import), contact inbox |
| Platform | Light / dark mode, responsive layout, skeleton loaders, toasts, confirm dialogs, installable PWA, rate limiting, zod validation, Helmet, CORS, 24-hour reminder job |

---

## Features in detail

### Events and registration
- Organisers create events with cover image, mode (in person / online / hybrid), meeting link, deadline, capacity, fee, eligibility, department restriction, agenda, speakers, FAQs and terms. Events go to an admin for approval before they are published.
- **Registration link and strict deadline:** organisers can paste a Google Form link. The event page shows the exact deadline with a live countdown; once it passes, the button disappears and the server refuses in-app registration. A deadline is required whenever a link is added.
- **Waitlist:** a full event puts students on a waitlist; a freed seat is offered automatically.
- **Approval plus payment:** for a paid event with manual approval, the student requests (PENDING), the organiser approves (AWAITING_PAYMENT, student notified), the student pays and becomes REGISTERED with a QR ticket. A late approval can still be paid after the deadline; if the event filled meanwhile the payment is refunded automatically.
- **Add to calendar:** every published event has an `.ics` download (Google, Apple, Outlook).

### Message attendees
Organisers and admins open **Registrations -> Message attendees** on an event, write a subject and message (quick buttons: venue changed, delayed, bring your ID, reminder) and send it to confirmed students, or to everyone not cancelled. It appears in their notifications, and by email if SMTP is set and they have not switched email off. Limited to 20 sends an hour per person.

### Follow organisers
Students press **Follow** next to the organiser's name on an event page (and manage the list under **Following**). When that organiser's event is published (directly, or after admin approval) every follower gets a notification and an email if SMTP is on, once per event. Adds the `OrganizerFollow` table (migration `20261125000000_organizer_follows`).

### Screen check-in (self check-in)
For large events, open **Attendance -> Screen check-in QR** and show it on a projector. Registered students scan it with their phone camera, sign in if asked, and are marked present. The code changes every 30 seconds (valid for about a minute), is checked on the server, works only while the event is running, and a student can only check themselves in. Ticket scanning and manual marking still work. No database change.

### Calendar view
**Explore events** has a List / Calendar switch, and the student dashboard has a **Show campus calendar** button. Pick a month, see how many events start each day, and tap a day to list them. Uses the existing events list; no database change.

### Event staff (helpers)
On an event's Registrations page, **Event staff** lets the organiser (or an admin) add helpers by account email (up to 25). A helper, usually a student volunteer, sees the event under **Event staff duty** and can scan tickets or mark present / absent for that event only, and only while it is running. They cannot edit the event, see payments, issue certificates or touch other events. Their check-ins are recorded under their own name. Adds the `EventStaff` table (migration `20261127000000_event_staff`).

### Tickets, attendance and certificates
- **QR tickets** for every confirmed registration. Anyone can verify a ticket code at `/verify-ticket` (shows the event, status and an abbreviated holder name only).
- **Attendance:** QR scanner (camera, USB scanner or paste), per-event attendance pages, bulk marking. One attendance record per registration (database unique constraint), so duplicate scans are rejected. Camera scanning is at `/organizer/scan` and `/admin/scan` and needs HTTPS and camera permission (built-in detector where available, `jsqr` elsewhere).
- **Certificates:** organisers and admins open an event's Certificates page and generate them (to students marked present, or everyone who registered). In **Generate certificates** they can fix the **name printed on each certificate** and write a **remark on each student's performance** (or one remark for everyone, with quick suggestions); the pencil beside an issued certificate edits either later. Each student can also be given a **Result**: Winner, First Runner-Up or Second Runner-Up. They then get a "Certificate of Achievement" (unless you typed your own title) with a gold, silver or bronze badge and the wording "for securing the ... position", and a suitable remark is filled in to edit. A fourth template, **Royal**, was added. Remarks show on the certificate and PDF but not on the public verify page; the Result does appear on it. Each has a unique ID, appears in the student's Certificates page, notifications and email, and can be verified by anyone at `/verify`. Certificates can be revoked.
- **Attendance window:** present / absent (manual, QR, bulk, CSV) can be marked only while the event is running (between its start and end). After it ends attendance is locked. Students not marked present at a finished event show as absent in their Attendance History.
- **Certificates after the event, for present students only:** generating is refused until the event has ended and only students marked present are certified, so certificates issued always match the attended count. **Check names** tells you whether a typed name registered and was marked present.
- **Download all (ZIP):** on an event's Certificates page, organisers and admins get every valid (not revoked) certificate PDF in one ZIP (up to 300). Students have an **Add to LinkedIn** button that opens LinkedIn's add-certification form already filled in, with the verification link.
- Certificate and ticket pages show a clearly marked **sample** so people see what they will get; samples never verify as real.

### Teams
Organisers set **Minimum / Maximum members** (both 1 = a normal solo event). A student registers, then creates a team or joins one with its 6-character code. Each member registers (and pays) separately; one team per student per event; the leader can remove members or disband. Organisers and admins see all teams under Registrations -> Teams and can download a CSV.

### Surveys
On any event, organisers and admins add their own questions (short answer, multiple choice, yes/no, 1-5 rating), asked **after registering** (t-shirt size, diet) or **after the event** (feedback). Students answer in a "Questions from the organiser" box and can edit answers. Export answers as CSV, one row per student. Registration questions never block registering.

### Recommended for you
The student dashboard shows up to three upcoming events they have not joined, ranked by department, the categories they registered for or attended, how full the event is and how soon it starts. Each card says why it was suggested. Computed on request from real data; nothing is stored.

### Gallery, sponsors and student photos
- Organisers and admins upload gallery photos (up to 40) and sponsor logos with an optional website (up to 12) under **Photos and sponsors**. They appear on the public event page as a photo grid with a full-size viewer and an "Our sponsors" strip. Photo captions are editable.
- **Students** who were marked present at a finished event see an **Add your photo** box under the event's Photos (up to 5 each). Their photos stay hidden from everyone else until the organiser or an admin clicks **Approve**; the organiser can reject one with the bin, and students can delete their own.
- Photos are credited by role only (Student, Organiser, Admin), never by name. Uploads share the banner image storage (Cloudinary if set, otherwise the database), 1.5 MB each.

### Points, badges and leaderboard
10 points per attended event, 5 per feedback, 3 for joining a team. Six badges (First Step, Regular, Campus Champion, Explorer, Voice of the Campus, Team Player) unlock automatically; levels are Bronze 10, Silver 60, Gold 150. Everything is calculated live from real records. The leaderboard shows the top ten with shortened names (for example "Asha R.").

### Bulk CSV import
- **Admin -> Students -> Import CSV** creates up to 500 students from a CSV (`name,email` required; `department,studentId,phone` optional). Each is emailed a link to choose their own password and verify their address. Without SMTP nothing is sent (use Reset password).
- **Organiser / Admin -> Attendance -> Import CSV** marks people present from a CSV with an `email` or `studentId` column. Only confirmed registrations match; unmatched rows are listed.

### Sharing and search
- Event links show a proper preview (title, date, venue, banner) in WhatsApp, Telegram, LinkedIn and similar apps, because the server adds the tags to each event page. **Share on WhatsApp** is on every event page.
- `/sitemap.xml` lists every published event and `/robots.txt` points search engines to it (private dashboards excluded). Submit the sitemap in Google Search Console.
- Set `APP_URL` so previews and the sitemap use the right domain (Render sets `RENDER_EXTERNAL_URL` automatically). Previews come from the Express server, so share the Render link; a separate Vercel frontend cannot add them.

### Install as an app and offline tickets
UniEvents is an installable PWA (Android Chrome / Edge: **Install the app**; iPhone: Safari -> Share -> Add to Home Screen).
- The app shell opens with no signal (a service worker caches the page shell and built files; it never stores anything from `/api`).
- Each time a student opens **My Tickets** online, their confirmed tickets (QR, title, date, venue) are saved on that phone. Offline, **Show my saved tickets** (`/offline-tickets`) works even without a session. Saved tickets are removed on sign-out and expire after the event.
- Opening the app offline no longer signs you out; only a server answer saying the session is invalid does. Check-in itself still needs the organiser's scanner online.

### Accounts, roles and sign-up
- Public sign-up always creates **students**. The Register page has Student, Organiser and Admin tabs: the Organiser tab creates a student account plus an organiser request that an admin approves; the Admin tab explains that admin accounts are created by an existing admin.
- **Email verification** (when SMTP is configured): every new account gets a link; until confirmed, a student cannot register and an organiser cannot create events (admins are never locked out). Admins can mark a placeholder address as verified. Without SMTP nothing is blocked.
- **Demo accounts (optional):** `ENABLE_DEMO_ACCOUNTS=true` plus `DEMO_PASSWORD` creates a demo student and organiser shown with their password on the login pages. A read-only demo admin exists only with the extra `ENABLE_DEMO_ADMIN=true`; it can browse every admin page but any change is refused (asking the AI assistant is allowed). Never enable the demo admin on a site with real students, and remove these variables for real use.
- **Featured events** (starred by admins) show on the home page and dashboards; until any are starred the soonest upcoming events are shown.

### Admin two-factor sign-in and login lockout
- **Two-factor (optional, admins only):** Settings -> Two-factor sign-in -> Set up. Scan the QR with Google Authenticator, Authy or Microsoft Authenticator, enter the 6-digit code and save the 8 one-time backup codes (shown once). Secrets are stored encrypted (set `TWO_FACTOR_KEY` before ever rotating `JWT_SECRET`).
- **Locked out?** Another admin can click the shield icon on the user's row to remove their 2FA and lockout, or run `npm run admin:reset-2fa -- admin@example.com` in the backend (Render shell).
- **Lockout (all real accounts):** 5 wrong passwords or codes in a row lock the account for 15 minutes (`LOGIN_MAX_ATTEMPTS`, `LOGIN_LOCK_MINUTES`). A successful sign-in or an emailed password reset clears it. Demo accounts are exempt.

### Payments
Razorpay checkout shows UPI first (QR, Google Pay, PhonePe, Paytm), then cards, netbanking and wallets. Students see receipts under My Payments; organisers see who paid for their events; admins see all payments, mark refunds, and get a Razorpay setup guide while keys are missing. A webhook (`payment.captured`) registers students who pay but close the tab. Without keys, fees are collected in person.

### Refund rules
On a paid event, organisers can set **Refund if a student cancels at least N hours before the start** (0 = any time before the start; empty = no automatic refunds, the default for every existing event). A student who cancels a confirmed seat inside that window, and paid online, is refunded automatically through Razorpay, told by notification and email, and the payment shows as Refunded. If Razorpay refuses, the payment is left as "needs refund" and admins are notified to retry it on the Payments page. The policy is shown on the event page and in the cancel prompt. Adds the nullable `Event.refundCutoffHours` column (migration `20261126000000_refund_cutoff`).

### Promo codes and early-bird pricing
On a paid event, **Edit event** has an optional **early-bird fee and end time**, and **Registrations -> Promo codes** creates codes (percent off up to 90%, or rupees off), with an optional use limit and expiry. Students type a code on the event page; the price shown comes from the server, which works the price out again when the order is created, so it cannot be edited in the browser. The price never goes below Rs 1 (Razorpay's minimum). A code counts as used only once the payment succeeds. Adds `Event.earlyBirdFee/earlyBirdUntil`, `Payment.discountCodeId/listAmount` and the `DiscountCode` table (migration `20261128000000_discount_codes`).

### Browser push notifications (optional)
When the server has VAPID keys, **Settings -> Notifications on this device -> Turn on** lets each person get every in-app notification (reminders, attendee messages, approvals, refunds) as a pop-up, even with UniEvents closed. Generate the keys once with `cd backend && npm run push:keys` (needs `npm install` first), then set `VAPID_PUBLIC_KEY` and `VAPID_PRIVATE_KEY` on Render (optionally `VAPID_SUBJECT`, e.g. `mailto:you@gmail.com`). Without the keys the card is hidden and nothing changes. On iPhone, the app must be added to the Home Screen first. Devices that remove the subscription are forgotten automatically. Adds the `PushSubscription` table (migration `20261129000000_push_subscriptions`) and the `web-push` package.

### Privacy tools
**Settings -> Your data** lets anyone **Download my data** (a JSON file with their profile, registrations, attendance, certificates, payments, feedback, survey answers and notifications). Students can also **Delete my account** (password and the word DELETE required): name, email, phone, student ID, photo, bio, notifications, survey answers, follows and device subscriptions are removed, upcoming seats are cancelled (waitlist moves up, eligible payments are refunded), and the account can never sign in again. Certificates and report IDs stay verifiable but no longer show the name; attendance, registrations and payment records stay (anonymised) so event statistics and accounts remain correct. Organiser and admin accounts cannot self-delete because they own events; an admin removes them. Demo accounts cannot be deleted. No database change.

### Event Q&A
Every published event page has a **Questions and answers** section. Signed-in students ask (up to 5 per event, 300 characters); the organiser is notified. The organiser or an admin answers, hides or deletes questions right on the page, and the asker is notified of the answer. The public sees visible questions with the asker's shortened name only. Hidden questions stay visible to managers. Adds the `EventQA` table (migration `20261130000000_event_qa`).

### Reminders
A 24-hour reminder job notifies registered students, and a second job sends a "starting in about an hour" reminder (in-app, browser push if enabled, and email if SMTP is set; each student gets it once, and anyone who turned reminders off in Settings is skipped). On a free Render service use the `keep-awake.yml` workflow (see [Optional services](#optional-services)) so reminders go out on time.

---

## Reports and PDF export

**Reports (PDF)** is in the Admin and Organiser menus; students have **My Report (PDF)** and **Activity Transcript**. Choose Monthly, Yearly or Custom range (students also have All time), then **Download PDF** and choose **Save as PDF** in the print window (A4, with colours, charts and images). **Download CSV** is next to it.

### Admin and organiser reports
- **Organisers** get only their own events (the server enforces this whatever the request says). **Admins** get the whole platform or one organiser from the drop-down.
- Key figures with change against the previous period; day-by-day or month-by-month charts; registrations by category and department; most popular and best rated events; an all-events table (with photo counts); optional full event descriptions; an Event photos page (up to three per event, approved photos only).
- **Deeper analysis:** students by department, cancellations and no-shows by category, full events and waitlists, busiest days and times, returning students, when students registered, feedback themes and lowest-rated events with the reasons given, certificates issued vs attended.
- **Admin only:** organiser performance, revenue and refunds by organiser, event approval turnaround, new and active accounts, approval pipeline, student accounts unused for 90 days.

### Event report
One event in full, for its organiser and admins: banner, description, agenda, speakers, FAQ, registrations by status, who registered when, check-ins by hour, payments, certificates, teams, feedback (comments without names), sponsors, photos with credits, confirmed attendees, plus a comparison with the organiser's earlier events, returning vs new attendees, registration timing and certificates still to issue.

### Student report and transcript
- **My Report:** events joined and attended, attendance rate next to the campus average, certificates, feedback given, categories explored, amount paid and hours at events, points / level / rank / badges, goal tracker (points to the next level, nearest badges), month streaks and best month, skills and interests, an events table, upcoming events, suggested events, photos, and plain "things to note".
- **Activity Transcript** (`/student/transcript`): a formal one-document list of attended events, hours and certificate IDs.
- The server always uses the signed-in student's own id (`GET /api/reports/student`, STUDENT role only). The campus average is a single aggregate that names no one.

### Report ID and verification
Every report cover carries a **Report ID with a QR code**. Anyone can check it at `/verify-report` (footer link): it shows who the report was for, what it covered, when it was first issued and the headline figures at that time. The ID is a keyed hash of those figures (`REPORT_SEAL_KEY`, falling back to `JWT_SECRET`), so an edited report matches no ID. Only headline numbers are stored (`ReportSeal` table), never student lists. Rotating the key invalidates IDs already printed.

### How the numbers work
Everything is worked out from the live database and explained at the end of each report. A figure that cannot be calculated (for example attendance for an event that has not finished) shows a dash; nothing is estimated. Days and months are cut at Indian time (UTC+05:30); set `REPORT_TZ_OFFSET_MIN` to change that. Custom ranges may be up to 5 years and are compared with the equal-length period before.

---

## AI assistant (optional, Groq)

A chat button (**Ask AI**) appears for students, organisers and admins once `GROQ_API_KEY` is set in the server environment. Without it the button is hidden and nothing else changes.

- **Read and explain only.** It cannot register anyone or change data; for actions it names the menu item to open.
- **Scoped by role.** Each question gets fresh data for that signed-in person only: a student's own registrations, certificates and open events; an organiser's own events and approvals waiting; an admin's platform counts and pending approvals. No emails, passwords or other people's details are sent to the model, and event text is treated as data, not instructions.
- **Protected.** The key never reaches the browser; provider errors are not passed on (only a status goes to the server log); 20 questions per user per 10 minutes; `ASSISTANT_DAILY_LIMIT` (default 1000) caps the day; the conversation lives only on screen.
- **Models.** Default `openai/gpt-oss-120b`, with `openai/gpt-oss-20b` as an automatic fallback if the first is refused. Groq retires models over time (`llama-3.3-70b-versatile` was shut down on 16 August 2026), so override with `GROQ_MODEL` if needed.
- Questions and a small data summary are sent to Groq to produce the answer; mention this in your privacy policy.

How to turn it on: create a key at console.groq.com -> API Keys, add `GROQ_API_KEY` in Render -> Environment, save, wait for the redeploy.

---

## Tech stack and architecture

- **Backend:** Node 20+, Express 4, Prisma 5 with PostgreSQL, JWT, bcryptjs, zod validation, Helmet (CSP), express-rate-limit, nodemailer (optional), a small built-in PDF writer for certificates.
- **Frontend:** React 18, Vite, Tailwind 3 (CSS-variable colours, dark mode), react-router-dom 6, axios, lucide-react, recharts, framer-motion, qrcode.react, jsqr. Report charts are custom SVG/CSS so they print exactly as on screen.
- **Single-service deploy:** Express serves the built `frontend/dist` and the API under `/api`.
- **Roles:** always enforced by the API from the database, never from anything stored in the browser.
- **Reports:** pure math in `utils/reportMath.js`, `studentReportMath.js` and `reportInsights.js` (unit tested); role scoping happens in the controller. PDF export is the browser's print-to-PDF with `@page A4` print CSS.
- **Time:** reports and "this month" boundaries use IST (UTC+05:30) unless `REPORT_TZ_OFFSET_MIN` is set.

---

## Folder structure

```
backend/
  prisma/            schema.prisma, migrations/ (see below), seed.js, seedStartup.js
  src/
    app.js server.js
    controllers/     auth, event, registration, attendance, certificate, category, analytics, admin, notification,
                     announcement, feedback, public, media, payment, team, bulkImport, survey, recommendation,
                     gallery, rewards, twoFactor, report, assistant
    routes/          one file per controller (plus calendar, cron, seo, ticket)
    middleware/      authMiddleware, roleMiddleware, errorHandler
    utils/           validators (zod), settings, audit, mailer, authTokens, notify, waitlist, reminders,
                     totp, loginGuard, rewards, seo, reportMath, studentReportMath, reportInsights,
                     reportSeal, assistantContext, demo, ...
  test/              node:test suites (maths, scoping, security, integrations)
frontend/
  vercel.json        SPA rewrite for Vercel
  public/            manifest.webmanifest, sw.js, icons
  src/
    components/      common, layout, navigation, events, dashboard, charts, forms, notifications, tickets,
                     reports, security, assistant
    pages/           public, student, organizer, admin, shared, reports
    context/         Auth, Theme, Toast
    services/        api.js (axios, uploads, downloads)
    hooks/ utils/
.github/workflows/   ci.yml (tests + frontend build), keep-awake.yml
```

---

## Data model and migrations

Main tables: `User`, `Event`, `Registration`, `Attendance`, `Certificate`, `Feedback`, `Announcement`, `Notification`, `EventCategory`, `OrganizerProfile`, `Payment`, `AuditLog`, `PlatformSetting`, `NewsletterSubscriber`, `ContactMessage`, `AuthToken`, `MediaFile`, `EventTeam`, `EventTeamMember`, `EventQuestion`, `EventAnswer`, `EventAsset` (photos and sponsors), `ReportSeal`.

Migrations are additive and run on start (`prisma migrate deploy`); existing users, events and registrations are kept:

| Migration | Adds |
|---|---|
| `20261101000000_init` | baseline |
| `20261109000000_advanced_features` | advanced event features |
| `20261113000000_unievents_platform` | platform tables and settings |
| `20261114000000_payments` | payments |
| `20261115000000_registration_links` | registration link and deadline |
| `20261116000000_approve_then_pay` | approval-then-payment flow |
| `20261117000000_teams` | team events |
| `20261118000000_surveys` | event questions and answers |
| `20261119000000_gallery_sponsors` | photos and sponsors |
| `20261120000000_two_factor_lockout` | admin 2FA and login lockout |
| `20261121000000_gallery_student_photos` | student photo approval (existing photos stay approved) |
| `20261122000000_report_seals` | report IDs |
| `20261125000000_organizer_follows` | following organisers |
| `20261126000000_refund_cutoff` | refund window per event |
| `20261127000000_event_staff` | event helpers |
| `20261128000000_discount_codes` | promo codes, early-bird price |
| `20261129000000_push_subscriptions` | browser push devices |
| `20261130000000_event_qa` | event questions and answers |
| `20261123000000_certificate_name_remarks` | optional name and remarks on certificates (existing ones unchanged) |
| `20261124000000_certificate_positions` | optional Winner / runner-up result on certificates |

Points, badges, recommendations and all report figures are calculated live from these records; nothing derived is stored.

---

## Run locally

Requirements: Node 20+, PostgreSQL 14+.

```bash
npm run install:all
cp backend/.env.example backend/.env       # edit DATABASE_URL and JWT_SECRET
cd backend && npx prisma migrate dev && npm run seed && cd ..   # seed = optional demo data
npm run dev:backend        # http://localhost:5000
npm run dev:frontend       # http://localhost:5173  (proxies /api to :5000)
```

### Seeded demo accounts (only by `npm run seed`, never by default)

| Role | Email | Password |
|---|---|---|
| Admin | admin@uni.edu | Admin@12345 |
| Organiser | organizer@uni.edu | Organizer@123 |
| Students | student@uni.edu, priya@uni.edu, arjun@uni.edu, meera@uni.edu | Student@123 |

These passwords are public. `npm run seed` **refuses to run when `NODE_ENV=production`** unless `ALLOW_DEMO_SEED=true`.

---

## Environment variables

Never commit `.env` files. On Render set these in the dashboard under **Environment**.

| Variable | Needed? | Purpose |
|---|---|---|
| `DATABASE_URL` | required | PostgreSQL connection string |
| `JWT_SECRET` | required | Long random string: `node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"` |
| `NODE_ENV` | required in production | `production` |
| `PORT` | host sets it | |
| `CLIENT_ORIGIN` | only with a separate frontend | Comma-separated allowed origins (Vercel) |
| `APP_URL` | optional | Public URL for links in emails, previews and the sitemap (auto on Render) |
| `SEED_ON_START`, `SEED_ADMIN_PASSWORD`, `SEED_ADMIN_EMAIL` | first deploy only | Creates the admin and sample events. **Delete after the first sign-in** |
| `ENABLE_DEMO_ACCOUNTS`, `DEMO_PASSWORD`, `ENABLE_DEMO_ADMIN` | demo sites only | Public demo logins; remove for real use |
| `SMTP_HOST` `SMTP_PORT` `SMTP_SECURE` `SMTP_USER` `SMTP_PASS` `MAIL_FROM` | optional | Email. Gmail: host `smtp.gmail.com`, port `587`, user = address, pass = a 16-character [app password](https://myaccount.google.com/apppasswords), `MAIL_FROM` = `UniEvents <you@gmail.com>` |
| `RAZORPAY_KEY_ID` `RAZORPAY_KEY_SECRET` `RAZORPAY_WEBHOOK_SECRET` | optional | Online fee payments (use `rzp_test_...` first). Webhook: `https://<app>/api/payments/webhook` for `payment.captured` |
| `CLOUDINARY_CLOUD_NAME` `CLOUDINARY_API_KEY` `CLOUDINARY_API_SECRET` `CLOUDINARY_FOLDER` | optional | Image hosting (falls back to the database) |
| `GROQ_API_KEY` | optional | Turns on the AI assistant |
| `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT` | optional | Browser push notifications (generate with `npm run push:keys`) |
| `GROQ_MODEL`, `ASSISTANT_DAILY_LIMIT` | optional | Override the model; cap questions per day (default 1000) |
| `TWO_FACTOR_KEY` | optional | Encrypts 2FA secrets; set before rotating `JWT_SECRET` |
| `REPORT_SEAL_KEY` | optional | Key for report IDs (falls back to `JWT_SECRET`) |
| `REPORT_TZ_OFFSET_MIN` | optional | Report time zone offset in minutes (default 330, India) |
| `LOGIN_MAX_ATTEMPTS`, `LOGIN_LOCK_MINUTES` | optional | Lockout rules (5 and 15) |
| `ALLOW_DEMO_SEED` | local only | Lets `npm run seed` run in production |
| `CRON_SECRET` | optional | Lets the keep-awake workflow trigger reminders |
| `LOG_EMAIL_LINKS` | optional | Also print email links in production logs (they contain secrets) |
| `VITE_API_URL` | frontend only | API address when the API is on another domain, e.g. `https://your-api.onrender.com/api` |

### Optional services

Nothing below is needed to launch. Each turns on when its keys are set.
- **Email:** password resets, verification links, registration confirmations and decisions, approval or rejection notices, certificates. Users can switch email off in Settings.
- **Payments:** see Payments above.
- **Image hosting:** uploads go to Cloudinary and fall back to PostgreSQL if it is unreachable.
- **Always-on reminders:** set `CRON_SECRET` on Render, plus the repository variable `APP_URL` and secret `CRON_SECRET` on GitHub; `.github/workflows/keep-awake.yml` then pings the site every 10 minutes so a free Render service stays awake.
- **AI assistant:** see above.

---

## Deploy on Render (single service, recommended)

1. Create a PostgreSQL database; copy its **Internal Database URL**.
2. New **Web Service** from this repo. **Root Directory: leave empty.**
   - Build command: `npm run build`
   - Start command: `npm start` (runs `prisma migrate deploy`, the optional seed, then the server)
3. Environment: `NODE_ENV=production`, `DATABASE_URL`, `JWT_SECRET`.
4. **First deploy only:** add `SEED_ON_START=true` and `SEED_ADMIN_PASSWORD=<strong password>`. This creates the admin (`admin@uni.edu`, or set `SEED_ADMIN_EMAIL`) and a few sample events if there are none. After you can sign in at `/login/admin`, **delete both variables**.
5. Default categories are created automatically on every start.

The free Render Postgres expires after 30 days; move to a paid or external database before then.

## Deploy the frontend on Vercel (optional)

1. Deploy the API on Render as above and note its URL.
2. On Render set `CLIENT_ORIGIN=https://<your-vercel-app>.vercel.app`.
3. Vercel: import the repo, **Root Directory = `frontend`**, framework Vite, environment variable `VITE_API_URL=https://<your-render-app>.onrender.com/api`.
4. `frontend/vercel.json` already has the SPA rewrite, so deep links like `/events/3` work.

---

## API overview

All routes are under `/api` with a Bearer JWT in `Authorization`.

| Area | Endpoints |
|---|---|
| Auth | `POST /auth/register` (students only), `/auth/login`, `/auth/forgot-password`, `/auth/reset-password`, `/auth/verify-email`, `/auth/resend-verification`, `/auth/change-password`; `GET/PATCH /auth/me`; `GET/POST /auth/organizer-request`; two-factor under `/auth/2fa/*` |
| Events | `GET /events` (`q category date department eventType mode price sort page limit featured scope`), `GET /events/:id`, `/events/mine`, `/events/pending` (admin), `POST /events`, `PATCH /events/:id`, `PATCH /events/:id/approve` and `/reject` (admin), `POST /events/:id/duplicate`, `DELETE /events/:id` |
| Registrations | `POST/DELETE /registrations/:eventId`, `GET /registrations/my`, `/registrations/event/:eventId` (+ `/export`), `PATCH /registrations/:id/decision` |
| Attendance | `POST /attendance/check-in`, `/attendance`, `/attendance/bulk`; `GET /attendance/my`, `/overview`, `/event/:id` (+ `/export`) |
| Certificates | `POST /certificates/generate`, `GET /certificates/my`, `/event/:id`, `/:id`, `PATCH /:id/revoke`, `GET /certificates/verify/:id` (public), `GET /certificates` (admin) |
| Categories | `GET /categories` (public), `POST/PATCH/DELETE /categories/:id` (admin) |
| Notifications | `GET /notifications`, `POST /read-all`, `PATCH /:id/read`, `DELETE /:id`; admin broadcast `POST /admin/notifications` |
| Analytics | `GET /analytics/student`, `/organizer`, `/admin` |
| Admin | `/admin/stats users students organizers events organizer-requests audit-logs settings messages reports/:type`, bulk student import (`POST /admin/users/import`), `POST /admin/users/:id/reset-2fa` |
| Teams, surveys | `/teams/*`, `/surveys/*` |
| Recommendations, rewards | `GET /recommendations`, `GET /rewards/me`, `/rewards/leaderboard` |
| Gallery | `GET /gallery/event/:id`; `POST /gallery/event/:id` (organiser/admin), `POST /gallery/event/:id/mine` (attending student); `PATCH /gallery/:id/approve`, `/caption`; `DELETE /gallery/:id`, `/gallery/mine/:id` |
| Reports | `GET /reports/summary` (admin/organiser), `/reports/event/:id`, `/reports/student` (student), `/reports/verify/:code` (public) |
| Assistant | `GET /assistant/status`, `POST /assistant/chat` |
| Public | `GET /public/stats`, `/highlights`, `/settings`; `POST /public/newsletter`, `/public/contact` |
| Calendar, SEO | `GET /calendar/:id` (`.ics`), `/sitemap.xml`, `/robots.txt` |
| Payments | `GET /payments`, `PATCH /payments/:id/refunded` (admin), `GET /payments/config`, `POST /payments/:eventId/order`, `/payments/verify`, `/payments/webhook` |
| Media | `POST /media` (raw image, max 1.5 MB, type checked by file signature), `GET /media/:id` |
| Health | `GET /api/health` |

---

### Languages (English, Hindi, Bengali)
A language picker sits in the top bar of the public site and every dashboard. English stays the default and the fallback, and the choice is remembered on the device. Menus, page headings, the home page and the main student pages are translated. To translate more text, add a line for it in `frontend/src/i18n/dictionary.js` (English text on the left, translation on the right); anything not listed simply shows in English.

### Ratings nudge and admin ranking
Students could already rate events they attended. Now, once an event has ended, every student who was marked present (and has not rated yet) gets a "How was the event?" notification (in-app, plus browser push if enabled) that opens their attendance history where the stars are. It is sent once per student and event, for events that ended in the last 7 days, and skipped for anyone who turned reminders off. Admins get **Event Ratings** in the menu: events ranked by average rating (ties broken by number of reviews) and organisers ranked by their overall average. Organisers still see their own ratings and comments under each event's Feedback page. No database change.

### AI insights in reports
The last section of the admin/organiser report, the event report and the student report is **AI insights**: 4 to 6 short bullets on what stands out, what to watch and what to do next. It appears when the report opens, prints with the PDF, and has a Refresh button. The report is shrunk to numbers first (names, emails, IDs, photos and attendee lists are removed) and sent to Groq with the same `GROQ_API_KEY` as the assistant; the model is told to use only those figures. Without the key, or if Groq is down, the section shows a plain summary of the key numbers instead, so it is never empty. Each person can ask 30 times an hour. The platform report is admin only, event and organiser reports are organiser/admin, and the student report is students only. Endpoint: `POST /api/report-ai`. No database change.

## Security and privacy

- Public sign-up creates **students only**. Organiser access is requested and approved by an admin.
- Passwords: bcrypt. Reset and verification tokens are random, single-use, expire, and only their SHA-256 hash is stored.
- Roles are enforced by the API using the database; deactivated accounts are rejected on every request. `localStorage` is never the source of truth for roles.
- Account lockout, optional admin 2FA (encrypted secrets, hashed single-use backup codes), rate limits on the API, login, forms, password reset, uploads, report checks and the assistant. Helmet and CORS are enabled.
- Uploads: PNG / JPEG / WebP / GIF only, checked by file signature, size-limited.
- No secrets are returned by the API (no hashes, tokens or keys); `.env` files are never committed; default credentials are never created in production.
- Reports and the assistant are role-scoped on the server: organisers only see their own events, students only their own data. Leaderboards, feedback and report photos use shortened names or roles only.
- The assistant sends the signed-in person's own summary data and question to Groq; list this in your privacy policy.

---

## Testing

```bash
cd backend && npm test        # node:test, no database needed
```

Covers validators, TOTP and 2FA, rewards, recommendations, calendar and SEO output, report maths (periods, ranges, insights), report scoping by role, student photo rules, report IDs, and the assistant (key handling, input checks, scoped context, error handling). CI (`.github/workflows/ci.yml`) runs the backend tests and the frontend build on every push and pull request.

---

## Before you go live

- Watch the first Render / Vercel build log: it is the first real build of new code.
- Remove `SEED_ON_START` and `SEED_ADMIN_PASSWORD` after the first admin sign-in.
- Rotate `JWT_SECRET` (set `TWO_FACTOR_KEY` first if admins use 2FA); rotate any secret that was ever committed or pasted in chat.
- Delete the demo variables (`ENABLE_DEMO_ACCOUNTS`, `DEMO_PASSWORD`, `ENABLE_DEMO_ADMIN`) before real students use it.
- Set Razorpay, SMTP, Cloudinary and Groq keys only for the services you want.
- Plan for the free Render database's 30-day limit.

---

## Troubleshooting

- **Vercel site shows "-" and no events:** it is not reaching the API. Set `VITE_API_URL` (ending in `/api`) in Vercel and redeploy (Vite bakes it in at build time); set `CLIENT_ORIGIN` on Render to the Vercel address with no trailing slash; open `https://<render-app>/api/health`, which should return `{"status":"ok"}`. A free Render service sleeps and takes about a minute to wake. The Render address serves the whole app by itself, so Vercel is optional.
- **Admin cannot sign in from another device:** check for an enabled 2FA code, a 15-minute lockout after 5 failures, or (for the demo admin) a missing `ENABLE_DEMO_ADMIN=true`.
- **"The assistant could not answer right now":** open Render -> Logs, ask again, and look for `[assistant] Groq answered <status>`. 401 = wrong key, 429 = Groq's limit, 400/404 = the model; set `GROQ_MODEL` to a current Groq model.
- **No Ask AI button:** `GROQ_API_KEY` is missing or the deploy has not finished; hard refresh (Ctrl+Shift+R).
- **No "Add your photo" box:** the event must have ended and the student must have been marked present, with fewer than 5 photos already added.
- **Emails not arriving:** without `SMTP_HOST` nothing is sent; links print to the server log in development only.

---

## Limits and honest notes

- Live Razorpay, SMTP, Cloudinary and Groq behaviour depends on your keys and those services; the automated tests stub them.
- The Render build is the real build test for the frontend; report layouts were checked in test renders to PDF, so look at the first real PDFs you export.
- Report IDs prove a report was issued by this site with those headline figures; they do not stop someone sharing a genuine PDF.
- Attendance, certificates and points depend on organisers marking attendance; reports show what was recorded, nothing more.
