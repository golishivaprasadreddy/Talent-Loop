# Architecture

TalentLoop uses a single Next.js App Router application for both the frontend and backend API.

## Runtime Flow

```text
Browser
  -> Next.js page or API route
  -> middleware.js for protected page routes
  -> lib/guard.js for protected API routes
  -> lib/auth.js and lib/session-token.js for JWT bearer validation
  -> lib/db.js for cached Mongoose connection
  -> models/index.js for MongoDB persistence
```

## Application Layers

| Layer | Files | Responsibility |
| --- | --- | --- |
| Pages | `app/**/page.js` | Public pages and role-specific dashboards |
| Route handlers | `app/api/**/route.js` | JSON API endpoints |
| Components | `components/*.js` | Shared client/server UI building blocks |
| Data access | `lib/db.js`, `models/index.js` | MongoDB connection and Mongoose models |
| Auth | `lib/auth.js`, `lib/session-token.js`, `components/AuthBridge.js` | JWT creation, bearer validation, and client token attachment |
| Authorization | `lib/rbac.js`, `lib/guard.js` | Roles, permissions, and API route guards |
| AI helpers | `lib/ai.js` | OpenAI-backed and rule-based fallback generation |

## Data Strategy

- Mongoose models live in `models/index.js`.
- `connectDB()` caches the MongoDB connection globally to avoid reconnecting on every request.
- Public job discovery falls back to demo data if MongoDB is not configured or does not return jobs.
- Authenticated functionality requires MongoDB because users, sessions, applications, and dashboards depend on persisted data.

## Authentication Strategy

- Passwords are hashed with `bcryptjs`.
- Sessions are signed JWTs returned by login/register responses.
- Browser clients store JWTs in `localStorage` and send them as bearer tokens on API requests.
- `middleware.js` redirects authenticated bearer requests away from login/register when a bearer token is explicitly present.
- API handlers use `requireRole()` or `requirePermission()` from `lib/guard.js`.

## AI Strategy

AI features call the OpenAI Responses API only when `OPENAI_API_KEY` is configured. If no key is present, several helpers return deterministic fallback results so the product remains usable in local development.

Implemented AI helpers:

- Resume analysis
- Resume feedback
- Cover letter generation
- Job description generation
- Applicant screening
- Candidate job recommendations

## Error Handling

Route handlers return JSON errors with appropriate HTTP status codes. Database connection failures are surfaced explicitly in registration and otherwise typically return route-specific fallback or failure responses.
