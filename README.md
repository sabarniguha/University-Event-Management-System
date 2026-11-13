# University Event Management System (UEMS)

One repository, one deployable app: an **Express + Prisma (PostgreSQL)** REST API and a **React (Vite + Tailwind)** UI.
In production the Express server also serves the built React app, so you deploy a single service.

## Features

| Area | What it does |
|---|---|
| Auth & roles | Email/password sign-up (students), JWT login, roles: `STUDENT`, `ORGANIZER`, `ADMIN`. Three separate login pages (`/login/student`, `/login/organizer`, `/login/admin`) behind a chooser at `/login`; the API rejects a login whose account role does not match the page used |
| Events | Browse/search/filter published events; organisers create, edit, publish, cancel, delete and **duplicate** events; optional registration deadline; average rating shown on the event page |
| Registrations | One-click registration, transaction-safe capacity enforcement, **waitlist with automatic promotion** when a seat frees up or capacity grows, cancel before start, CSV export |
| QR tickets | Every confirmed registration has a unique QR pass (student: *My tickets*) |
| Attendance (student) | *My attendance*: attendance rate, attended / missed / upcoming, check-in time and method, rate events, **printable certificates** |
| Attendance (organiser) | Per-event live console: **QR check-in** (camera scan, USB scanner or paste a code), manual Present/Absent, "mark remaining present/absent", search and filters, CSV report, auto-refresh |
| Attendance (admin) | Attendance rate for every event, drill into any event, analytics page |
| Feedback | Students who attended rate the event (1-5 stars + comment); organisers see averages, distribution and comments |
| Certificates | Attendance certificate with a QR code that opens a **public verification page** (`/verify/:id`) |
| Notifications | In-app bell: waitlist promotions, event cancelled/rescheduled, check-in confirmations, role changes |
| Announcements | Admin/organiser notices with audience (all/students/organisers), priority and draft/publish |
| Admin | Stats, **analytics charts**, user search, **create organiser/admin accounts**, role changes, user deletion |

## Folder structure

```
University-Event-Management-System/
├── package.json                 # root scripts (build / start for deployment)
├── Dockerfile                   # multi-stage build -> single container
├── docker-compose.yml           # app + PostgreSQL for local/VPS Docker
├── README.md
├── .gitignore
├── backend/
│   ├── package.json
│   ├── .env.example
│   ├── prisma/
│   │   ├── schema.prisma        # User, Event, Registration, Attendance, Announcement, Feedback, Notification
│   │   ├── migrations/          # 20261101..._init (baseline), 20261109..._advanced_features (additive)
│   │   └── seed.js              # demo users + events, waitlist, attendance and feedback
│   └── src/
│       ├── server.js            # starts the HTTP server
│       ├── app.js               # middleware, routes, serves frontend in production
│       ├── controllers/         # auth, event, registration, attendance, feedback,
│       │                        # notification, announcement, admin
│       ├── routes/              # authRoutes, eventRoutes, registrationRoutes, attendanceRoutes,
│       │                        # feedbackRoutes, notificationRoutes, announcementRoutes, adminRoutes
│       ├── middleware/          # authMiddleware, roleMiddleware, errorHandler
│       └── utils/               # jwt, prismaClient, validators (zod), access, httpError, asyncHandler,
│                                # ticket (QR codes / certificate IDs), waitlist, notify, csv
└── frontend/
    ├── package.json, vite.config.js, tailwind.config.js, postcss.config.js, index.html
    ├── .env.example
    └── src/
        ├── main.jsx, App.jsx, index.css
        ├── services/api.js      # axios instance + token handling
        ├── context/AuthContext.jsx
        ├── utils/format.js
        ├── components/          # Navbar, Footer, ProtectedRoute, RoleProtectedRoute, DashboardShell,
        │                        # EventCard, Ui, QrCode, BarChart, StarRating, NotificationBell
        └── pages/
            ├── Home, Login, LoginSelection, Register, Events, EventDetail, Announcements,
            │   Notifications, VerifyCertificate, Profile, NotFound
            ├── student/    StudentDashboard, MyTickets, StudentAttendance, Certificate
            ├── organizer/  OrganizerDashboard, EventForm, EventAttendees,
            │               EventAttendance, AttendanceOverview, EventFeedback
            └── admin/      AdminDashboard, Analytics   (admins also use AttendanceOverview)
```

## Run locally

Requirements: Node 20+, PostgreSQL 14+.

```bash
# 1. Install everything
npm run install:all

# 2. Configure the backend
cp backend/.env.example backend/.env      # then edit DATABASE_URL and JWT_SECRET

# 3. Create the database tables (applies the migrations already in backend/prisma/migrations)
cd backend
npx prisma migrate dev
npm run seed                               # optional demo data
cd ..

# 4. Start both servers (two terminals)
npm run dev:backend      # http://localhost:5000
npm run dev:frontend     # http://localhost:5173  (proxies /api to :5000)
```

Demo logins created by the seed:

| Role | Email | Password |
|---|---|---|
| Admin | admin@uni.edu | Admin@12345 |
| Organiser | organizer@uni.edu | Organizer@123 |
| Student | student@uni.edu | Student@123 |
| Students (extra) | priya@uni.edu, arjun@uni.edu, meera@uni.edu | Student@123 |

The seed also creates a finished event with QR/manual attendance and feedback (*UEM Freshers Orientation*), and a full event with a waitlist (*Robotics Demo Day*), so every screen has data to show.

> Change these passwords (or skip seeding) on any real deployment.

**Already created tables from an earlier version of this project?** The migrations are now committed. On a development database run `npx prisma migrate reset` (this erases the data), or on a database you want to keep, run `npx prisma migrate resolve --applied 20261101000000_init` and then `npx prisma migrate deploy`.

**Trying QR check-in:** log in as a student, open *My tickets*, then as the organiser open an event's *Attendance* page and paste the ticket code (shown under the QR) or scan the QR with the camera. Camera scanning needs Chrome/Edge (or Chrome on Android) and HTTPS or `localhost`.

## Deploy (single service)

Production uses `prisma migrate deploy`, which applies the migrations committed in `backend/prisma/migrations/`. When you change `schema.prisma` later, run `npx prisma migrate dev --name <change>` locally and commit the new migration folder.

### Option A: Render / Railway / any Node host

1. Create a managed PostgreSQL database and copy its connection string.
2. Create a Web Service from this repo with:
   - **Build command:** `npm run build` (installs dev dependencies on purpose, even when `NODE_ENV=production`, because Vite, Tailwind and the Prisma CLI are needed to build and migrate)
   - **Start command:** `npm start` (runs `prisma migrate deploy`, then starts the server)
3. Set environment variables:

   | Variable | Value |
   |---|---|
   | `NODE_ENV` | `production` |
   | `DATABASE_URL` | your PostgreSQL connection string |
   | `JWT_SECRET` | long random string (`node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"`) |
   | `CLIENT_ORIGIN` | *optional*: only needed if the frontend is hosted on a different address (e.g. Vercel). Not needed on Render when one service serves both. |

4. **First deploy only - create the admin account and sample UEM events without any shell access.** Add two more environment variables, then redeploy:

   | Variable | Value |
   |---|---|
   | `SEED_ON_START` | `true` |
   | `SEED_ADMIN_PASSWORD` | a strong password (at least 8 characters) for `admin@uni.edu` (change the email with `SEED_ADMIN_EMAIL`) |

   On start the server creates that admin account if it does not exist and adds the UEM sample events if the database has no events yet. It creates **no** demo students or organisers. Once you can sign in at `/login/admin`, **delete `SEED_ON_START` and `SEED_ADMIN_PASSWORD`** from the host so it does not run again. (Alternatively, run `npm run seed` from your own computer against the database for the full demo data set, including demo accounts.)

### Option B: Docker

```bash
docker compose up --build        # app on http://localhost:5000
```

Edit `JWT_SECRET` and the Postgres password in `docker-compose.yml` first. The container runs `prisma migrate deploy` on start.

## API overview

All routes are under `/api`. `Auth` = Bearer JWT in the `Authorization` header.

| Method & path | Access | Purpose |
|---|---|---|
| `POST /auth/register`, `POST /auth/login` | public | Sign up (student) / log in (optional `role` must match the account) |
| `GET/PATCH /auth/me` | any user | Current user / update profile |
| `GET /events` | public | Published events (`q`, `category`, `scope=upcoming\|past\|all`) |
| `GET /events/:id` | public* | Event details, rating, waitlist size, my registration (*drafts only for owner/admin) |
| `GET /events/mine` | organiser, admin | Own events (admin: all) |
| `POST /events`, `PATCH /events/:id`, `DELETE /events/:id` | organiser (owner), admin | Manage events (changes notify registered students; more capacity promotes the waitlist) |
| `POST /events/:id/duplicate` | organiser (owner), admin | Copy an event as a draft one week later |
| `POST/DELETE /registrations/:eventId` | student | Register or join the waitlist / cancel (frees a seat for the next in line) |
| `GET /registrations/me` | student | My registrations with QR ticket codes and waitlist positions |
| `GET /registrations/event/:eventId` (+ `/export`) | organiser (owner), admin | Participants / CSV |
| `GET /attendance/me` | student | Attendance rate, history, feedback status |
| `GET /attendance/certificate/:registrationId` | student | Data for my attendance certificate |
| `GET /attendance/verify/:code` | public | Verify a certificate ID (rate limited) |
| `GET /attendance/overview` | organiser (own events), admin (all) | Attendance rate per event |
| `GET /attendance/event/:eventId` (+ `/export`) | organiser (owner), admin | Live roster + summary / CSV report |
| `POST /attendance`, `/attendance/checkin`, `/attendance/bulk` | organiser (owner), admin | Manual mark / QR or ticket-code check-in / mark all unmarked |
| `POST /feedback/:eventId` | student (attended) | Rate an event |
| `GET /feedback/event/:eventId` | organiser (owner), admin | Ratings and comments |
| `GET /notifications`, `POST /notifications/read-all`, `PATCH /notifications/:id/read` | any user | In-app notifications |
| `GET /announcements/public` | public | Latest university-wide notices |
| `GET /announcements`, `POST`, `PATCH /:id`, `DELETE /:id` | role-filtered | Announcements |
| `GET /admin/stats`, `GET /admin/analytics` | admin | Totals / chart data |
| `GET /admin/users`, `POST /admin/users`, `PATCH /admin/users/:id/role`, `DELETE /admin/users/:id` | admin | User management (create accounts of any role) |

## Notes

- Public sign-up always creates **students**. Promote people to organiser/admin from the Admin dashboard.
- Passwords are hashed with bcrypt; login and sign-up are rate-limited; all input is validated with zod.
- Prisma is pinned to v5 (`^5.22`) so the `schema.prisma` datasource syntax above works as written.

https://university-event-management-system-1-0nzj.onrender.com/
