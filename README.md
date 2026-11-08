# University Event Management System (UEMS)

One repository, one deployable app: an **Express + Prisma (PostgreSQL)** REST API and a **React (Vite + Tailwind)** UI.
In production the Express server also serves the built React app, so you deploy a single service.

## Features

| Area | What it does |
|---|---|
| Auth & roles | Email/password sign-up (students), JWT login, roles: `STUDENT`, `ORGANIZER`, `ADMIN`. Three separate login pages (`/login/student`, `/login/organizer`, `/login/admin`) behind a chooser at `/login`; the API rejects a login whose account role does not match the page used |
| Events | Browse/search/filter published events; organisers create, edit, publish, cancel, delete |
| Registrations | One-click registration, capacity enforcement (transaction-safe), cancel before start, CSV export of participants |
| Attendance | Organisers/admins mark Present/Absent per participant; students see their own history |
| Announcements | Admin/organiser notices with audience (all/students/organisers), priority and draft/publish |
| Admin | Platform stats, user search, role changes, user deletion |

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
│   │   ├── schema.prisma        # User, Event, Registration, Attendance, Announcement
│   │   └── seed.js              # demo admin / organiser / student + sample data
│   └── src/
│       ├── server.js            # starts the HTTP server
│       ├── app.js               # middleware, routes, serves frontend in production
│       ├── controllers/         # auth, event, registration, attendance, announcement, admin
│       ├── routes/              # authRoutes, eventRoutes, registrationRoutes, ...
│       ├── middleware/          # authMiddleware, roleMiddleware, errorHandler
│       └── utils/               # jwt, prismaClient, validators (zod), access, httpError, asyncHandler
└── frontend/
    ├── package.json, vite.config.js, tailwind.config.js, postcss.config.js, index.html
    ├── .env.example
    └── src/
        ├── main.jsx, App.jsx, index.css
        ├── services/api.js      # axios instance + token handling
        ├── context/AuthContext.jsx
        ├── utils/format.js
        ├── components/          # Navbar, Footer, ProtectedRoute, RoleProtectedRoute,
        │                        # DashboardShell, EventCard, Ui (Loader, Badge, ...)
        └── pages/
            ├── Home, Login, Register, Events, EventDetail, Announcements, Profile, NotFound
            ├── student/StudentDashboard.jsx
            ├── organizer/OrganizerDashboard.jsx, EventForm.jsx, EventAttendees.jsx
            └── admin/AdminDashboard.jsx
```

## Run locally

Requirements: Node 20+, PostgreSQL 14+.

```bash
# 1. Install everything
npm run install:all

# 2. Configure the backend
cp backend/.env.example backend/.env      # then edit DATABASE_URL and JWT_SECRET

# 3. Create the database tables (run once; creates backend/prisma/migrations)
cd backend
npx prisma migrate dev --name init
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

> Change these passwords (or skip seeding) on any real deployment.

## Deploy (single service)

**Important:** commit the `backend/prisma/migrations/` folder created by `prisma migrate dev` in step 3. Production uses `prisma migrate deploy`, which applies those migration files.

### Option A: Render / Railway / any Node host

1. Create a managed PostgreSQL database and copy its connection string.
2. Create a Web Service from this repo with:
   - **Build command:** `npm run build`
   - **Start command:** `npm start` (runs `prisma migrate deploy`, then starts the server)
3. Set environment variables:

   | Variable | Value |
   |---|---|
   | `NODE_ENV` | `production` |
   | `DATABASE_URL` | your PostgreSQL connection string |
   | `JWT_SECRET` | long random string (`node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"`) |
   | `CLIENT_ORIGIN` | your public site URL, e.g. `https://uems.onrender.com` |

4. (Optional, first deploy only) open a shell on the service and run `npm run seed` to create the admin account, or create a user via the sign-up page and promote it in the database.

### Option B: Docker

```bash
docker compose up --build        # app on http://localhost:5000
```

Edit `JWT_SECRET` and the Postgres password in `docker-compose.yml` first. The container runs `prisma migrate deploy` on start.

## API overview

All routes are under `/api`. `Auth` = Bearer JWT in the `Authorization` header.

| Method & path | Access | Purpose |
|---|---|---|
| `POST /auth/register`, `POST /auth/login` | public | Sign up (student) / log in |
| `GET/PATCH /auth/me` | any user | Current user / update profile |
| `GET /events` | public | Published events (`q`, `category`, `scope=upcoming\|past\|all`) |
| `GET /events/:id` | public* | Event details (*drafts only for owner/admin) |
| `GET /events/mine` | organiser, admin | Own events (admin: all) |
| `POST /events`, `PATCH /events/:id`, `DELETE /events/:id` | organiser (owner), admin | Manage events |
| `POST/DELETE /registrations/:eventId` | student | Register / cancel |
| `GET /registrations/me` | student | My registrations |
| `GET /registrations/event/:eventId` (+ `/export`) | organiser (owner), admin | Participants / CSV |
| `POST /attendance` | organiser (owner), admin | Mark Present/Absent |
| `GET /attendance/me` | student | My attendance history |
| `GET /announcements/public` | public | Latest university-wide notices |
| `GET /announcements`, `POST`, `PATCH /:id`, `DELETE /:id` | role-filtered | Announcements |
| `GET /admin/stats`, `GET /admin/users`, `PATCH /admin/users/:id/role`, `DELETE /admin/users/:id` | admin | Administration |

## Notes

- Public sign-up always creates **students**. Promote people to organiser/admin from the Admin dashboard.
- Passwords are hashed with bcrypt; login and sign-up are rate-limited; all input is validated with zod.
- Prisma is pinned to v5 (`^5.22`) so the `schema.prisma` datasource syntax above works as written.
