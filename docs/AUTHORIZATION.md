# Authentication and Authorization

TalentLoop uses role-based access control with signed JWT bearer tokens. Clients send the token with `Authorization: Bearer <token>`.

## Roles

| Role | Purpose |
| --- | --- |
| `candidate` | Searches jobs, saves jobs, applies, reviews companies, uses candidate AI |
| `recruiter` | Manages company profile, jobs, applicants, and recruiter AI |
| `admin` | Moderates users, companies, jobs, applicants, reports, and logs |

## JWT Sessions

- Sessions are signed JWTs created through `lib/session-token.js`.
- Login and registration responses return `token`.
- Browser clients store the token in `localStorage` under `talentloop-jwt`.
- `components/AuthBridge.js` attaches the token to same-origin `/api/*` requests.
- API clients pass the token as `Authorization: Bearer <token>`.
- Remembered sessions last 30 days.
- Normal sessions last 7 days.
- Logout clears the browser's stored token.

## Page Protection

Protected page routes are rendered client-side and rely on API authorization. `middleware.js` no longer enforces dashboard route access because browser document navigation cannot include a bearer token stored in `localStorage`.

| Route Prefix | Required Permission |
| --- | --- |
| `/dashboard` | Candidate dashboard permission |
| `/dashboard/candidate` | Candidate dashboard permission |
| `/dashboard/recruiter` | Recruiter dashboard permission |
| `/dashboard/admin` | Admin dashboard permission |
| `/recruiter` | Recruiter dashboard permission |
| `/admin` | Admin dashboard permission |

API route handlers remain the source of truth for authorization.

## API Protection

API routes use helpers from `lib/guard.js`:

- `requireRole(...roles)` validates exact roles.
- `requirePermission(...permissions)` validates role permissions.
- `assertPermission(session, permission)` checks a permission for a known session.

## Dashboard Redirects

`dashboardFor()` maps roles to default dashboards:

| Role | Dashboard |
| --- | --- |
| `candidate` | `/dashboard` |
| `recruiter` | `/recruiter` |
| `admin` | `/admin` |

## Security Notes

- Passwords are hashed with bcrypt before storage.
- Suspended users cannot sign in.
- Candidate applications and saved jobs enforce uniqueness at the database level.
- Recruiters can update/delete only jobs owned by their company unless the requester is an admin.
- Password reset currently returns `resetUrl` in the API response; production deployments should send this link through an email provider instead.
