# TalentLoop

TalentLoop is a full-stack hiring platform built with Next.js App Router, React, MongoDB, and JWT bearer authentication. It supports candidates, recruiters, and admins with role-aware dashboards, job discovery, applications, saved jobs, company profiles, notifications, messaging, reviews, and optional AI-assisted hiring workflows.

## Highlights

- Candidate job search with filters, saved jobs, applications, recommendations, and profile management
- Recruiter company profile management, job CRUD, applicant review, and job-description generation
- Admin user, company, job, statistics, logs, and moderation APIs
- Secure authentication with hashed passwords, JWT sessions, route middleware, and RBAC permissions
- MongoDB/Mongoose models for users, companies, jobs, applications, saved jobs, notifications, reviews, messages, and admin logs
- Optional OpenAI Responses API integration for resume analysis, applicant screening, cover letters, recommendations, and job descriptions
- GitHub Actions workflows for lint/build CI and Vercel production deployment

## Tech Stack

| Layer | Technology |
| --- | --- |
| Framework | Next.js 15 App Router |
| UI | React 19, CSS modules/global CSS |
| Runtime | Node.js 20+ |
| Database | MongoDB with Mongoose |
| Auth | bcryptjs, jose, JWT sessions |
| Validation | Zod |
| AI | OpenAI Responses API through `fetch` |
| Deployment | Vercel |

## Quick Start

```bash
npm install
cp .env.example .env.local
npm run dev
```

Open `http://localhost:3000`.

At minimum, configure `MONGODB_URI` and `JWT_SECRET` in `.env.local`. Without MongoDB, the public jobs API falls back to demo jobs, but authenticated and dashboard features require a database connection.

## Scripts

| Command | Purpose |
| --- | --- |
| `npm run dev` | Start the local Next.js development server |
| `npm run build` | Create a production build |
| `npm start` | Start the production server after building |
| `npm run lint` | Syntax-check all JavaScript files |
| `npm test` | Run the same JavaScript syntax check |
| `npm run db:init` | Create MongoDB collections/indexes and seed an admin user |

## Environment Variables

See `.env.example` for a complete template.

| Variable | Required | Description |
| --- | --- | --- |
| `MONGODB_URI` | Yes | MongoDB connection string |
| `JWT_SECRET` | Yes | Long random secret for session JWT signing |
| `NEXT_PUBLIC_BASE_URL` | Recommended | Base URL used for password reset links |
| `OPENAI_API_KEY` | Optional | Enables AI-backed responses |
| `OPENAI_MODEL` | Optional | OpenAI model name; defaults to `gpt-4.1-mini` |
| `ADMIN_EMAIL` | Optional | Admin email seeded by `npm run db:init` |
| `ADMIN_PASSWORD` | Optional | Admin password seeded by `npm run db:init` |
| `ADMIN_NAME` | Optional | Admin display name seeded by `npm run db:init` |

## Documentation

- `docs/ARCHITECTURE.md` explains the application structure and request flow.
- `docs/API.md` lists API routes, permissions, query parameters, and payloads.
- `docs/DATABASE.md` documents MongoDB collections, schemas, and indexes.
- `docs/AUTHORIZATION.md` covers roles, permissions, protected routes, and sessions.
- `docs/DEPLOYMENT.md` covers Vercel and GitHub Actions deployment.
- `docs/DEVELOPMENT.md` covers local workflows, project conventions, and troubleshooting.

## Project Structure

```text
app/                 Next.js pages, route handlers, global styles
components/          Shared React UI components
lib/                 Database, auth, RBAC, guards, and AI helpers
models/              Mongoose schemas and model exports
scripts/             Database initialization and JavaScript syntax check
.github/workflows/   CI and Vercel deployment workflows
```

## Main Routes

| Route | Purpose |
| --- | --- |
| `/` | Landing page |
| `/jobs` and `/jobs/:id` | Job listings and details |
| `/apply/:id` | Candidate application flow |
| `/login`, `/register`, `/forgot-password`, `/reset-password` | Authentication and recovery |
| `/dashboard` | Candidate dashboard |
| `/recruiter` | Recruiter dashboard |
| `/admin` | Admin dashboard |
| `/profile/setup` | Profile setup |
| `/company/:id` | Company profile |

## Database Setup

After configuring `MONGODB_URI`, initialize collections and indexes:

```bash
npm run db:init
```

The script also creates an admin account if one does not exist. Set `ADMIN_EMAIL`, `ADMIN_PASSWORD`, and `ADMIN_NAME` before running it if you do not want the defaults.

## Validation

```bash
npm run lint
npm run build
```

`npm run lint` uses `node --check` across `.js` and `.mjs` files. It is a syntax check, not an ESLint rule set.

## Deployment

The repository includes:

- `.github/workflows/ci.yml` for pull request and `main` branch build validation
- `.github/workflows/deploy.yml` for production Vercel deployment on `main`
- `vercel.json` with the Next.js framework/build configuration

See `docs/DEPLOYMENT.md` for required Vercel and GitHub secrets.
