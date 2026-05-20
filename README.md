# PulseBoard

PulseBoard is a real-time polling platform built on the MERN stack. It pairs a
hardened Express API with a React single-page app, synchronising results live
over WebSockets.

## Technical Overview

- **Client:** React 19, Vite, Tailwind CSS v4, React Router 7
- **Server:** Node.js, Express 5, MongoDB (Mongoose 9)
- **Real-time:** Socket.IO (authenticated, room-scoped)
- **Auth:** in-memory access token (JWT) + httpOnly rotating refresh-token
  cookie, bcrypt-hashed OTP email verification, Google OAuth (authorization-code
  flow), CSRF protection on cookie endpoints.

## Repository Structure

```text
pulse-board/
├── backend/      # Express REST API + Socket.IO
│   ├── config/        # env validation
│   ├── controllers/   # request handlers
│   ├── services/      # token + analytics logic
│   ├── middleware/     # auth, csrf, rate limits, error handler
│   ├── models/        # Mongoose schemas
│   ├── routes/        # thin route wiring
│   ├── utils/         # email, validators, socket emit, cookies
│   └── tests/         # vitest unit tests
└── frontend/     # React single-page application
```

## Local Setup

### Requirements

- Node.js 20+
- A local MongoDB instance or an Atlas connection string
- A Google OAuth client (Client ID **and** Client Secret) — optional, only for
  Google sign-in
- A SendGrid API key (or any SMTP credentials) — optional, only for OTP email

### 1. Backend

```bash
cd backend
npm install
cp .env.example .env   # then fill in the values
npm run dev            # starts on http://localhost:5001
```

The server **validates its environment on boot** and refuses to start if a
required variable is missing or invalid. `JWT_SECRET` must be at least 32
characters — generate one with `openssl rand -hex 32`. See `.env.example` for
every variable.

### 2. Frontend

```bash
cd frontend
npm install
cp .env.example .env   # then fill in the values
npm run dev            # starts on http://localhost:5173
```

`VITE_API_URL` must point at the backend **origin only** (no path) — the app
appends `/api/v1` itself.

## API

REST endpoints are served under `/api/v1` (the legacy unversioned `/api` prefix
is kept as an alias). A `GET /health` endpoint reports DB connectivity.

## Scripts

| Location  | Command          | Description                       |
| --------- | ---------------- | --------------------------------- |
| backend   | `npm run dev`    | Start API with file watching      |
| backend   | `npm start`      | Start API                         |
| backend   | `npm test`       | Run unit tests (vitest)           |
| frontend  | `npm run dev`    | Start Vite dev server             |
| frontend  | `npm run build`  | Production build                  |
| frontend  | `npm run lint`   | ESLint                            |
| frontend  | `npm test`       | Run component tests (vitest)      |

## Docker

A full local stack (MongoDB + API + web) is available via Compose:

```bash
docker compose up --build
```

The backend still reads secrets from `backend/.env`.

## Migrations

Schema/data changes that require manual steps against an existing database are
documented in [`backend/MIGRATIONS.md`](backend/MIGRATIONS.md).

## Security Notes

- Access tokens live only in memory on the client; the refresh token is an
  httpOnly, rotating cookie. There is no token in `localStorage`.
- OTPs are bcrypt-hashed at rest, expire after 10 minutes, and lock out after
  repeated failures.
- Auth endpoints are rate-limited; login and OTP verification have additional
  per-account lockouts.
- For cross-domain deployments (web and API on different domains) cookies are
  issued with `SameSite=None; Secure`. If third-party cookies are blocked the
  refresh flow degrades to per-session re-login.
