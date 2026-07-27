# Development Guide

## Prerequisites

- Node.js 20 or newer
- npm
- MongoDB Atlas or a local MongoDB instance

## Local Setup

```bash
npm install
cp .env.example .env.local
npm run dev
```

Then open `http://localhost:3000`.

## Database Setup

The app reads `.env.local` during Next.js development. The database initialization script loads `.env`, so either create `.env` with the same values or export the variables in your shell.

```bash
npm run db:init
```

This creates collections, indexes, and an admin account.

## Useful Workflows

### Start Development Server

```bash
npm run dev
```

### Check JavaScript Syntax

```bash
npm run lint
```

The lint script is intentionally lightweight. It runs `node --check` on `.js` and `.mjs` files and ignores `.git`, `.next`, and `node_modules`.

### Production Build

```bash
npm run build
npm start
```

## Coding Conventions

- Keep source files in JavaScript; the project does not use TypeScript.
- Keep API validation near route handlers with Zod.
- Use `connectDB()` before accessing Mongoose models.
- Use `requirePermission()` or `requireRole()` for protected API routes.
- Keep role/permission changes centralized in `lib/rbac.js`.
- Prefer extending existing models in `models/index.js` unless a collection becomes large enough to split.

## Troubleshooting

### MongoDB Connection Fails

- Confirm `MONGODB_URI` is present.
- If using MongoDB Atlas, confirm the current IP address is allowlisted.
- Confirm the database user has read/write permissions.

### Registration Fails

- Check the server console for the `[register]` log.
- Confirm `MONGODB_URI` and `JWT_SECRET` are configured.
- Recruiter registration requires `companyName`.
- Passwords must be at least 8 characters and include uppercase, lowercase, number, and special character.

### AI Routes Return Fallbacks

- Add `OPENAI_API_KEY` to `.env.local`.
- Optionally set `OPENAI_MODEL`.
- Restart `npm run dev` after changing environment variables.

### CI Build Fails

- Run `npm run lint` locally first.
- Run `npm run build` locally with the same environment variables.
- Confirm dependency changes are reflected in `package-lock.json`.
