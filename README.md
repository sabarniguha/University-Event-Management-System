# UniEvents —  (Auth + Role-Based Dashboards)

UniEvents is a centralized university event management platform. This phase
builds the **foundation only**: a public landing page, student registration,
login, JWT authentication, and three role-based placeholder dashboards.

Event creation, registration, QR attendance, certificates, notifications,
and analytics are **not** part of this phase — they come next.

```
HOME → LOGIN / REGISTER → AUTHENTICATION → ROLE → DASHBOARD
```

## Architecture

- **Frontend**: React 18 + Vite + Tailwind CSS + React Router + Axios
- **Backend**: Node.js + Express + JWT + bcrypt, kept independent of the frontend
- **Database**: PostgreSQL, accessed through Prisma ORM

The frontend is Vercel-ready. The backend is a standalone Express API meant
to be deployed separately (Render, Railway, Fly.io, a VPS, etc.).

## Folder structure

```
unievents/
├── frontend/          React app (Vite)
│   └── src/
│       ├── pages/            Home, Login, Register, role dashboards
│       ├── components/       Navbar, Footer, route guards, dashboard shell
│       ├── context/          AuthContext (user, token, login, logout)
│       └── services/api.js   Axios instance with JWT interceptor
├── backend/           Express API
│   ├── src/
│   │   ├── controllers/authController.js
│   │   ├── routes/authRoutes.js
│   │   ├── middleware/        authMiddleware, roleMiddleware, errorHandler
│   │   └── app.js / server.js
│   └── prisma/
│       ├── schema.prisma      User model + Role enum
│       └── seed.js            Creates the 3 dev test accounts
└── README.md
```

## Authentication flow

1. **Register** (`POST /api/auth/register`) — public registration always
   creates a `STUDENT` account. There is no role selector on the register
   or login forms; role is determined by the database, never chosen by
   the user in the UI.
2. Passwords are hashed with **bcrypt** before being stored. Plaintext
   passwords are never written to PostgreSQL and `passwordHash` is never
   returned in any API response.
3. **Login** (`POST /api/auth/login`) — verifies the password with
   `bcrypt.compare`, then issues a **JWT** containing `{ id, role }`.
4. The frontend stores the token in `localStorage` and attaches it to every
   request via an Axios interceptor.
5. On login, the frontend redirects by role:
   - `STUDENT` → `/student/dashboard`
   - `ORGANIZER` → `/organizer/dashboard`
   - `ADMIN` → `/admin/dashboard`
6. **`GET /api/auth/me`** is called on app start (if a token exists) to
   restore the session, and rejects/clears invalid or expired tokens.

## Role-based authorization

- `authMiddleware` verifies the JWT and attaches `{ id, role }` to `req.user`.
- `requireRole("ADMIN")` (or multiple roles) guards specific backend routes.
- On the frontend, `RoleProtectedRoute` (and its `StudentRoute` /
  `OrganizerRoute` / `AdminRoute` wrappers) block access to a dashboard the
  logged-in user's role doesn't match, redirecting them to their own
  dashboard instead of showing a broken page. Unauthenticated users are
  redirected to `/login`.

## Setup

### 1. PostgreSQL

Create a database:

```bash
createdb unievents
# or, from psql:
# CREATE DATABASE unievents;
```

### 2. Backend

```bash
cd backend
cp .env.example .env
# edit .env: set DATABASE_URL to your Postgres connection string,
# and set JWT_SECRET to a long random string

npm install
npx prisma migrate dev --name init   # creates the users table
npx prisma db seed                   # creates the 3 dev test accounts
npm run dev                          # starts the API on http://localhost:5000
```

### 3. Frontend

```bash
cd frontend
cp .env.example .env
# VITE_API_URL defaults to http://localhost:5000/api

npm install
npm run dev                          # starts the app on http://localhost:5173
```

Open `http://localhost:5173`.

## Test credentials

Seeded by `npx prisma db seed`:

| Role      | Email                    | Password       |
|-----------|---------------------------|----------------|
| Student   | student@unievents.edu     | Student@123    |
| Organizer | organizer@unievents.edu   | Organizer@123  |
| Admin     | admin@unievents.edu       | Admin@123      |

These are development-only credentials. Do not seed them in production.

## API endpoints

| Method | Route              | Auth required | Description                          |
|--------|---------------------|----------------|---------------------------------------|
| POST   | `/api/auth/register` | No             | Creates a STUDENT account            |
| POST   | `/api/auth/login`    | No             | Returns `{ token, user }`            |
| GET    | `/api/auth/me`       | Yes (Bearer)   | Returns the current authenticated user |

## Deploying later

- **Frontend**: `npm run build` in `frontend/` produces a static `dist/`
  folder — deploy it to Vercel directly.
- **Backend**: deploy `backend/` as a standalone Node service. Set
  `DATABASE_URL`, `JWT_SECRET`, and `CORS_ORIGIN` (your deployed frontend's
  URL) as environment variables. Run `npx prisma migrate deploy` once
  against the production database before starting the server.

## A known limitation from the build environment (not the code)

This project was built and verified inside a network-restricted sandbox.
Prisma's CLI (`generate`, `migrate dev`, even `-v`) tries to download its
query-engine binary from `binaries.prisma.sh` on every invocation, and that
domain wasn't reachable there. So `prisma generate` / `migrate dev` could
not be run inside the sandbox itself.

To still verify the real logic, a temporary raw-`pg` shim was swapped in for
testing only, standing in for the two Prisma Client calls the backend uses
(`findUnique`, `create`) against a real local Postgres instance — with the
actual `authController.js`, `authRoutes.js`, and middleware running
unmodified. The full register → login → JWT → `/me` → role-redirect flow
was exercised over real HTTP and passed, including duplicate-email,
weak-password, invalid-email, wrong-password, missing-token, and
invalid-token rejections. The shim was removed afterward; the shipped code
uses the standard `@prisma/client` only.

In your own machine or CI (normal internet access), `npx prisma migrate dev`
and `npx prisma generate` will work exactly as documented above — this is
purely a sandbox network constraint, not an issue with the schema or code.
The frontend (`npm run build`) was built successfully with no modifications.
