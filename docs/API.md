# API Reference

All routes are implemented with Next.js route handlers under `app/api`.

## Authentication

| Method | Route | Auth | Purpose |
| --- | --- | --- | --- |
| `POST` | `/api/auth/register` | Public | Register a candidate or recruiter |
| `POST` | `/api/auth/login` | Public | Sign in and return a JWT |
| `POST` | `/api/auth/logout` | Public | No-op server logout endpoint for client compatibility |
| `GET` | `/api/auth/logout` | Public | Redirect home |
| `GET` | `/api/auth/me` | Public | Return the current session/user state |
| `POST` | `/api/auth/forgot-password` | Public | Create a password reset token |
| `POST` | `/api/auth/reset-password` | Public | Reset password with a valid token |

### Register Payload

```json
{
  "name": "Candidate Name",
  "email": "candidate@example.com",
  "password": "StrongPass!123",
  "role": "candidate",
  "remember": true
}
```

Recruiters must also provide `companyName`; optional company fields include `companyLogo`, `companyDescription`, `companyWebsite`, `companyIndustry`, `companySize`, and `companyHeadquarters`.

Authentication responses include `token`. Browser clients store it locally and send `Authorization: Bearer <token>` on API requests.

## Jobs

| Method | Route | Auth | Purpose |
| --- | --- | --- | --- |
| `GET` | `/api/jobs` | Public | List published jobs or demo fallback jobs |
| `POST` | `/api/jobs` | Recruiter | Create a job for the recruiter's company |
| `GET` | `/api/jobs/:id` | Public | Get job details and increment views |
| `PATCH` | `/api/jobs/:id` | Recruiter/Admin | Update a job |
| `DELETE` | `/api/jobs/:id` | Recruiter/Admin | Delete a job |

### Job Query Parameters

| Parameter | Description |
| --- | --- |
| `q` | Searches title, description, and skills |
| `category` | Filters by job category |
| `workMode` | Filters by work mode |
| `salaryMin` | Filters jobs with `salaryMin >= value` |
| `companyId` | Filters by company |
| `page` | Page number; defaults to `1` |
| `limit` | Page size; defaults to `50`, maximum `50` |

### Create Job Payload

```json
{
  "title": "Frontend Engineer",
  "description": "Build polished product surfaces.",
  "responsibilities": ["Build UI features"],
  "requirements": ["3+ years of React experience"],
  "skills": ["React", "Next.js"],
  "preferredSkills": ["MongoDB"],
  "benefits": ["Remote work"],
  "salaryMin": 1200000,
  "salaryMax": 2200000,
  "experience": "3+ years",
  "education": "Bachelor's degree or equivalent",
  "employmentType": "Full-time",
  "workMode": "Remote",
  "location": "Bengaluru, India",
  "category": "Engineering",
  "deadline": "2026-12-31",
  "status": "published",
  "customQuestions": [
    { "question": "Why are you interested?", "type": "textarea", "required": true }
  ]
}
```

## Applications

| Method | Route | Auth | Purpose |
| --- | --- | --- | --- |
| `GET` | `/api/applications?jobId=:id` | Candidate | Check whether the current candidate applied |
| `POST` | `/api/applications` | Candidate/Public fallback | Submit an application |
| `GET` | `/api/applications/:id` | Candidate/Recruiter/Admin | View an application |
| `PATCH` | `/api/applications/:id` | Recruiter/Admin | Update application status |

### Application Payload

```json
{
  "jobId": "mongodb-job-id",
  "name": "Candidate Name",
  "email": "candidate@example.com",
  "phone": "+91 90000 00000",
  "resumeUrl": "https://example.com/resume.pdf",
  "resumeFileName": "resume.pdf",
  "coverLetter": "Short cover letter",
  "portfolioLink": "https://portfolio.example.com",
  "linkedinUrl": "https://linkedin.com/in/example",
  "experience": [],
  "education": [],
  "certifications": ["AWS"],
  "notes": "Optional note",
  "answers": [
    { "questionId": "question-id", "question": "Available to relocate?", "answer": "Yes" }
  ]
}
```

## Candidate Features

| Method | Route | Auth | Purpose |
| --- | --- | --- | --- |
| `GET` | `/api/dashboard/candidate` | Candidate | Candidate dashboard data |
| `GET` | `/api/saved-jobs` | Candidate | List saved jobs |
| `POST` | `/api/saved-jobs` | Candidate | Save a job |
| `DELETE` | `/api/saved-jobs/:jobId` | Candidate | Remove a saved job |
| `GET` | `/api/ai/recommendations` | Candidate | Get ranked job recommendations |
| `POST` | `/api/reviews` | Candidate | Review a company |

## Recruiter Features

| Method | Route | Auth | Purpose |
| --- | --- | --- | --- |
| `GET` | `/api/dashboard/recruiter` | Recruiter | Recruiter dashboard data |
| `GET` | `/api/company` | Recruiter | Get owned company profile |
| `PATCH` | `/api/company` | Recruiter | Update owned company profile |

## Shared Authenticated Features

| Method | Route | Auth | Purpose |
| --- | --- | --- | --- |
| `GET` | `/api/profile` | Signed in | Get current user profile |
| `PATCH` | `/api/profile` | Signed in | Update current user profile |
| `GET` | `/api/profile/avatar` | Signed in | Return current profile avatar |
| `GET` | `/api/notifications` | Signed in | List notifications |
| `PATCH` | `/api/notifications` | Signed in | Mark all notifications as read |
| `PATCH` | `/api/notifications/:id` | Signed in | Mark one notification as read |
| `GET` | `/api/messages` | Signed in | List conversation messages |
| `POST` | `/api/messages` | Signed in | Send a message |
| `GET` | `/api/reviews` | Public | List company reviews |

## Admin

| Method | Route | Auth | Purpose |
| --- | --- | --- | --- |
| `GET` | `/api/admin/stats` | Admin | Platform statistics |
| `GET` | `/api/admin/users` | Admin | List users |
| `PATCH` | `/api/admin/users/:id` | Admin | Update user moderation fields |
| `DELETE` | `/api/admin/users/:id` | Admin | Delete user |
| `GET` | `/api/admin/companies` | Admin | List companies |
| `PATCH` | `/api/admin/companies/:id` | Admin | Update company moderation fields |
| `DELETE` | `/api/admin/companies/:id` | Admin | Delete company |
| `GET` | `/api/admin/jobs` | Admin | List jobs |
| `PATCH` | `/api/admin/jobs/:id` | Admin | Moderate/update job |
| `DELETE` | `/api/admin/jobs/:id` | Admin | Delete job |
| `GET` | `/api/admin/logs` | Admin | List admin logs |
| `POST` | `/api/admin/logs` | Admin | Create an admin log entry |

## AI

| Method | Route | Auth | Purpose |
| --- | --- | --- | --- |
| `POST` | `/api/ai/resume-analysis` | Candidate | Compare candidate skills to target job skills |
| `POST` | `/api/ai/resume-feedback` | Candidate | Generate resume improvement suggestions |
| `POST` | `/api/ai/cover-letter` | Candidate | Generate a cover letter |
| `GET` | `/api/ai/recommendations` | Candidate | Rank published jobs for the candidate |
| `POST` | `/api/ai/job-description` | Recruiter | Generate a job description |
| `POST` | `/api/ai/screen` | Recruiter/Admin | Score an applicant against a job |

AI routes use deterministic fallback behavior when possible, but OpenAI-backed output requires `OPENAI_API_KEY`.
