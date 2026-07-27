# Database

TalentLoop uses MongoDB through Mongoose. All schemas are defined in `models/index.js`.

## Collections

| Collection | Model | Purpose |
| --- | --- | --- |
| `users` | `User` | Candidate, recruiter, and admin accounts |
| `companies` | `Company` | Recruiter-owned company profiles |
| `jobs` | `Job` | Job postings |
| `applications` | `Application` | Candidate job applications |
| `savedjobs` | `SavedJob` | Candidate job bookmarks |
| `notifications` | `Notification` | User notifications |
| `reviews` | `Review` | Candidate company reviews |
| `messages` | `Message` | Recruiter-candidate messages |
| `adminlogs` | `AdminLog` | Admin moderation/audit events |

`scripts/init-mongodb.js` also creates `skills` and `categories` collections for future taxonomy data.

## Key Schemas

### User

Stores identity, authentication, role, profile, portfolio, verification, suspension, and password reset fields.

Important fields:

- `name`, `email`, `passwordHash`, `role`
- `avatar`, `phone`, `about`
- `skills`, `experience`, `education`, `certifications`, `languages`
- `portfolio.github`, `portfolio.linkedin`, `portfolio.website`
- `resumeUrl`, `verified`, `suspended`
- `resetToken`, `resetTokenExpiry`

### Company

Represents an employer profile owned by a recruiter.

Important fields:

- `owner`
- `name`, `logo`, `banner`, `description`, `website`
- `industry`, `size`, `headquarters`
- `approved`, `featured`

### Job

Represents a recruiter's job posting.

Important fields:

- `company`, `title`, `description`
- `responsibilities`, `requirements`, `skills`, `preferredSkills`, `benefits`
- `salaryMin`, `salaryMax`, `currency`
- `experience`, `education`, `employmentType`, `workMode`, `location`, `category`
- `deadline`, `status`, `featured`, `views`
- `customQuestions`

Allowed statuses are `draft`, `published`, and `closed`.

### Application

Represents a candidate submission for a job.

Important fields:

- `job`, `candidate`
- `name`, `email`, `phone`
- `govtId`, `resumeUrl`, `resumeFileName`
- `coverLetter`, `portfolioLink`, `linkedinUrl`
- `experience`, `education`, `certifications`, `notes`, `answers`
- `status`

Allowed statuses are `applied`, `under_review`, `shortlisted`, `interview`, `offered`, and `rejected`.

## Indexes

| Collection | Index | Purpose |
| --- | --- | --- |
| `users` | `{ email: 1 }`, unique | Prevent duplicate accounts |
| `applications` | `{ job: 1, candidate: 1 }`, unique | Prevent duplicate candidate applications to the same job |
| `savedjobs` | `{ candidate: 1, job: 1 }`, unique | Prevent duplicate saved jobs |

## Initialization

Run:

```bash
npm run db:init
```

The script:

- Loads variables from `.env`
- Connects to `MONGODB_URI`
- Creates expected collections if missing
- Creates key unique indexes
- Seeds an admin account when `ADMIN_EMAIL` does not already exist

For local development, use `.env.local` for the Next.js app and `.env` if you want `npm run db:init` to load variables automatically.
