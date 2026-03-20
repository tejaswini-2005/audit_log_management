# Secure Audit Portal

Secure Audit Portal is a full-stack role-based access platform with immutable audit logging.

## What this project does

- Cookie/JWT authentication with protected and admin-only routes
- Invitation-based onboarding with expiring hashed invite tokens
- Immutable audit logs with sequence ordering and hash-chain verification
- Admin log explorer with filtering and pagination
- User activity timeline with pagination and search

## Tech stack

- Backend: Node.js, Express, MongoDB, Mongoose, JWT, Zod, Nodemailer
- Frontend: React, Vite, React Router, Axios

## Quick start

### 1) Configure environment files

- Copy backend/.env.example to backend/.env and fill values
- Copy frontend/.env.example to frontend/.env and adjust if needed

### 2) Install dependencies

```bash
cd backend
npm install

cd ../frontend
npm install
```

### 3) Run backend

```bash
cd backend
npm run dev
```

### 4) Run frontend

```bash
cd frontend
npm run dev
```

## Backend scripts

- npm run dev: run backend with nodemon
- npm start: run backend in production mode
- npm test: run backend unit tests

## Frontend scripts

- npm run dev: run Vite dev server
- npm run build: production build
- npm run lint: eslint checks
- npm run preview: preview built app

## Security and reliability highlights

- HttpOnly auth cookie with environment-aware secure and sameSite options
- Route-level validation using Zod
- Basic endpoint rate limiting for auth and invitation endpoints
- Deterministic hash generation for audit logs
- Sequence-based chain integrity checks using cursor iteration
