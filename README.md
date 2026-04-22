# OmniShare - Circular Economy Asset Engine

Full-stack reference implementation with:

- NestJS backend (`backend`)
- React + Vite frontend (`frontend`)
- Prisma + SQLite data layer

## Core capabilities

- Asset lifecycle state machine (`AVAILABLE`, `RESERVED`, `IN_USE`, `MAINTENANCE`, `RETIRED`)
- Safety certification gate for restricted assets
- Conflict-free booking checks inside database transactions
- Proactive maintenance ticket creation based on usage frequency

## Run backend

```bash
cd backend
npm install
npx prisma generate
npx prisma migrate dev --name init
npm run start:dev
```

Backend API runs at `http://localhost:3000`.

## Run frontend

```bash
cd frontend
npm install
npm run dev
```

Frontend runs at `http://localhost:5173`.

## Main API routes

- `GET /` health check
- `POST /auth/register`
- `POST /auth/login`
- `GET/POST /users`
- `PATCH /users/:id/promote-admin`
- `GET/POST /assets`
- `PATCH /assets/:id/state/:state`
- `GET/POST /bookings`
- `PATCH /bookings/:id/start`
- `PATCH /bookings/:id/complete`
- `GET /maintenance`
- `PATCH /maintenance/:id/resolve`
- `POST /setup/certifications`
- `POST /setup/grant-certification`

## Auth and roles

- Use JWT in `Authorization: Bearer <token>`.
- First user who registers becomes `ADMIN`; later registrations become `USER`.
- Admin-only actions:
  - `POST /assets`
  - `PATCH /assets/:id/state/:state`
  - `GET /maintenance`
  - `PATCH /maintenance/:id/resolve`
  - all `/setup/*`
  - all `/users/*`
- Regular users can only create/start/complete bookings for themselves.

## Frontend auth UX

- Route split: `/login` and `/dashboard`.
- JWT token and user profile are persisted in local storage.
- API `401` responses trigger auto-logout and redirect back to `/login`.
