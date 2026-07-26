# TalentLoop — Full-Stack Hiring Platform

TalentLoop is a full-stack hiring platform connecting companies with talented professionals. Candidates can discover and apply for roles while recruiters manage jobs and applicants; administrators have marketplace oversight. The project is written in JavaScript only.

![Next.js](https://img.shields.io/badge/Next.js-15-111827?logo=next.js) ![JavaScript](https://img.shields.io/badge/JavaScript-ES2022-f7df1e?logo=javascript&logoColor=111827) ![Vercel](https://img.shields.io/badge/Deploy-Vercel-111827?logo=vercel)

## Business value

For candidates, TalentLoop reduces the friction between discovering a suitable opportunity and applying. For employers, it presents roles in a consistent format and provides a clean application API that can be connected to an ATS or database.

## Platform features

- Search roles by title, company, skill, and location
- Filter vacancies by discipline
- Save jobs in the browser with `localStorage`
- Responsive design for desktop and mobile
- Application modal with input validation
- Server-side jobs and applications API routes
- Candidate and recruiter registration, login, secure JWT session cookie, logout, and account recovery UI
- Role-aware candidate, recruiter, and admin dashboards
- MongoDB models for users, companies, jobs, applications, saved jobs, notifications, reviews, and messages
- Recruiter job creation/update/deletion API with ownership validation
- Candidate application tracking and recruiter notification creation
- AI resume analysis, cover-letter generation, and job-description generation endpoints
- Protected dashboard routes, password hashing, Zod input validation, and secure environment variables

## Architecture

```text
Next.js App Router
  ├── React UI: landing, authentication, candidate/recruiter/admin portals
  ├── Route handlers: auth, jobs, applications, AI
  ├── JWT httpOnly cookie + middleware route protection
  ├── Mongoose data layer → MongoDB Atlas
  └── Optional OpenAI Responses API → AI assistance
```

The landing page uses polished sample roles until `MONGODB_URI` is configured. Once connected, published roles and authenticated applications are persisted in MongoDB.

## Database collections

| Collection | Purpose |
| --- | --- |
| `users` | Candidate, recruiter, and administrator identities and candidate profiles |
| `companies` | Recruiter-owned company information and approval state |
| `jobs` | Job listings, requirements, work mode, salary, visibility, and views |
| `applications` | Candidate submissions and lifecycle status |
| `savedjobs` | Candidate bookmarks |
| `notifications` | Product notifications for candidates and recruiters |
| `reviews` | Candidate company ratings, pros, and cons |
| `messages` | Recruiter-candidate chat messages and read state |

## Local development

Prerequisites: Node.js 20 or newer, npm, and MongoDB Atlas (or a local MongoDB instance).

```bash
npm install
npm run dev
```

Copy `.env.example` to `.env.local` and supply at least:

```bash
MONGODB_URI=your-mongodb-connection-string
JWT_SECRET=a-long-random-production-secret
OPENAI_API_KEY=optional
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

To create a production build:

```bash
npm run build
npm start
```

## API

### `GET /api/jobs`

Returns the list of available roles.

### `POST /api/applications`

Accepts JSON with `name`, `email`, `note`, and `jobId`. `name`, `email`, and `jobId` are required. A successful request returns an application reference ID.

### Authentication

- `POST /api/auth/register` — creates candidate or recruiter/company account
- `POST /api/auth/login` — validates credentials and sets an httpOnly session cookie
- `POST /api/auth/logout` — clears the session cookie

### Platform APIs

- `GET` / `POST /api/jobs` — discover published jobs / create recruiter jobs
- `GET` / `PATCH` / `DELETE /api/jobs/:id` — view, manage, or remove a job
- `POST /api/ai/resume-analysis` — skills match score and resume feedback
- `POST /api/ai/cover-letter` — tailored cover letter
- `POST /api/ai/job-description` — recruiter job description draft

## CI/CD and Vercel deployment

The GitHub Actions workflow at `.github/workflows/ci.yml` runs on pull requests and pushes to `main`. It installs locked dependencies and creates a production build. The deployment workflow at `.github/workflows/deploy.yml` deploys every successful push to `main` to Vercel.

To configure continuous deployment:

1. Push this project to a GitHub repository.
2. In Vercel, click **Add New → Project**, then import that repository.
3. Vercel detects Next.js automatically. Keep the defaults and deploy once.
4. In the GitHub repository, add the following **Actions secrets** (available in Vercel Project Settings → General): `VERCEL_TOKEN`, `VERCEL_ORG_ID`, and `VERCEL_PROJECT_ID`.
5. Push to `main`. GitHub Actions validates the app, builds the Vercel output, and deploys it to production.

`vercel.json` captures the framework and build command for a repeatable deployment configuration.

## Suggested next steps

- Add Vercel Blob for PDF resume/file uploads and validate MIME type plus size server-side
- Add a transactional email provider for verification and password-reset delivery
- Add Redis rate limiting to public authentication and search endpoints
- Add automated unit/integration tests and visual regression tests
- Build the remaining messaging, review, and analytics screens against the included MongoDB schemas

## Assessment notes

The project uses JavaScript only—there are no TypeScript source files. It uses Next.js App Router and built-in route handlers for its full-stack API layer.
