"use client";

import { useEffect, useMemo, useState } from "react";

const STATUS_LABELS = {
  applied: "Applied",
  under_review: "Under review",
  shortlisted: "Shortlisted",
  interview: "Interview",
  offered: "Offered",
  rejected: "Rejected",
  draft: "Draft",
  published: "Published",
  closed: "Closed",
};

const APPLICATION_STATUSES = ["applied", "under_review", "shortlisted", "interview", "offered", "rejected"];

function Badge({ status }) {
  return <span className={`badge badge-${status}`}>{STATUS_LABELS[status] || status || "New"}</span>;
}

function EmptyState({ children }) {
  return <p className="empty-state">{children}</p>;
}

function Field({ label, children }) {
  return <label className="form-field"><span>{label}</span>{children}</label>;
}

function csv(value) {
  return value.split(",").map((item) => item.trim()).filter(Boolean);
}

function CandidateDashboard() {
  const [data, setData] = useState(null);
  const [profile, setProfile] = useState(null);
  const [tab, setTab] = useState("Overview");
  const [savedJobs, setSavedJobs] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [aiResult, setAiResult] = useState("");

  useEffect(() => {
    fetch("/api/dashboard/candidate").then((res) => res.json()).then(setData);
    fetch("/api/profile").then((res) => res.json()).then((payload) => setProfile(payload.user));
  }, []);

  useEffect(() => {
    if (tab === "Saved jobs") fetch("/api/saved-jobs").then((res) => res.json()).then((payload) => setSavedJobs(payload.saved || []));
    if (tab === "Notifications") fetch("/api/notifications").then((res) => res.json()).then((payload) => setNotifications(payload.notifications || []));
  }, [tab]);

  const stats = data?.stats || {};
  const applications = data?.applications || [];
  const completion = useMemo(() => {
    if (!profile) return 0;
    const checks = [profile.avatar, profile.resumeUrl, profile.about, profile.skills?.length, profile.experience?.length, profile.education?.length, profile.portfolio?.linkedin || profile.portfolio?.github || profile.portfolio?.website];
    return Math.round((checks.filter(Boolean).length / checks.length) * 100);
  }, [profile]);

  async function runAi(kind) {
    setAiResult("Generating...");
    const endpoint = kind === "cover" ? "/api/ai/cover-letter" : kind === "recommend" ? "/api/ai/recommendations" : "/api/ai/resume-analysis";
    const body = kind === "cover"
      ? { role: "Software Engineer", experience: profile?.experience || [], skills: profile?.skills || [] }
      : { skills: profile?.skills || [], jobSkills: ["React", "APIs", "MongoDB"], summary: profile?.about || "" };
    const res = await fetch(endpoint, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    const payload = await res.json();
    setAiResult(payload.narrative || payload.coverLetter || payload.recommendations?.join("\n") || payload.feedback?.join("\n") || "AI action complete.");
  }

  return (
    <PortalShell role="candidate" tabs={["Overview", "Applications", "Saved jobs", "Notifications", "Profile"]} tab={tab} setTab={setTab}>
      <DashboardHeader eyebrow="Candidate dashboard" title="Your career, in motion." action={<a className="portal-button" href="/">Browse jobs</a>} />
      <div className="stat-grid">
        <article><span>Total applications</span><strong>{stats.total ?? 0}</strong><small>+{stats.thisWeek ?? 0} this week</small></article>
        <article><span>Saved jobs</span><strong>{stats.savedCount ?? 0}</strong><small>Bookmarked roles</small></article>
        <article><span>Interview invites</span><strong>{stats.interviews ?? 0}</strong><small>Active interviews</small></article>
        <article><span>Profile completion</span><strong>{completion}%</strong><small>Resume, skills, links</small></article>
      </div>

      {tab === "Overview" && (
        <div className="dashboard-grid">
          <ApplicationsPanel applications={applications.slice(0, 5)} />
          <section className="panel insight">
            <p className="eyebrow">AI career studio</p>
            <h2>Improve every application</h2>
            <p>Analyze your resume, generate cover letters, surface missing skills, and get recommendations from your profile.</p>
            <div className="action-row">
              <button onClick={() => runAi("resume")}>Resume analyzer</button>
              <button onClick={() => runAi("cover")}>Cover letter</button>
              <button onClick={() => runAi("recommend")}>Recommendations</button>
            </div>
            {aiResult && <pre className="ai-output">{aiResult}</pre>}
          </section>
        </div>
      )}

      {tab === "Applications" && <ApplicationsPanel applications={applications} />}
      {tab === "Saved jobs" && <SavedJobsPanel savedJobs={savedJobs} />}
      {tab === "Notifications" && <NotificationsPanel notifications={notifications} setNotifications={setNotifications} />}
      {tab === "Profile" && profile && <ProfileEditor profile={profile} onSave={setProfile} />}
    </PortalShell>
  );
}

function ApplicationsPanel({ applications }) {
  return (
    <section className="panel">
      <div className="panel-top"><h2>Application history</h2><a href="/">Find more roles</a></div>
      {applications.length === 0 ? <EmptyState>No applications yet. Search roles and submit your first application.</EmptyState> : (
        <div className="table">
          {applications.map((app) => (
            <div className="table-row" key={app._id}>
              <span>{app.job?.title || "Role unavailable"}</span>
              <span>{app.job?.company?.name || app.job?.company || "Company"}</span>
              <span>{new Date(app.createdAt).toLocaleDateString()}</span>
              <Badge status={app.status} />
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

function SavedJobsPanel({ savedJobs }) {
  return (
    <section className="panel">
      <div className="panel-top"><h2>Saved jobs</h2></div>
      {savedJobs.length === 0 ? <EmptyState>No saved jobs yet.</EmptyState> : (
        <div className="table">
          {savedJobs.map((saved) => (
            <div className="table-row" key={saved._id}>
              <span>{saved.job?.title || "Role unavailable"}</span>
              <span>{saved.job?.location || "Location flexible"}</span>
              <span>{saved.job?.workMode || "Work mode"}</span>
              <a href={`/jobs/${saved.job?._id}`}>View</a>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

function NotificationsPanel({ notifications, setNotifications }) {
  return (
    <section className="panel">
      <div className="panel-top">
        <h2>Notifications</h2>
        <button onClick={() => fetch("/api/notifications", { method: "PATCH" }).then(() => setNotifications((items) => items.map((item) => ({ ...item, read: true }))))}>Mark all read</button>
      </div>
      {notifications.length === 0 ? <EmptyState>No notifications yet.</EmptyState> : (
        <div className="table">
          {notifications.map((item) => (
            <div className="table-row" key={item._id} style={{ opacity: item.read ? 0.62 : 1 }}>
              <span>{item.title}</span><span>{item.body}</span><span>{item.type}</span><span>{new Date(item.createdAt).toLocaleDateString()}</span>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

function ProfileEditor({ profile, onSave }) {
  const [form, setForm] = useState({
    name: profile.name || "", avatar: profile.avatar || "", about: profile.about || "", skills: (profile.skills || []).join(", "),
    resumeUrl: profile.resumeUrl || "", certifications: (profile.certifications || []).join(", "), languages: (profile.languages || []).join(", "),
    portfolio: { github: profile.portfolio?.github || "", linkedin: profile.portfolio?.linkedin || "", website: profile.portfolio?.website || "" },
  });
  const [message, setMessage] = useState("");

  function uploadResume(file) {
    if (!file) return;
    if (file.type !== "application/pdf") {
      setMessage("Please upload a PDF resume.");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      setForm((current) => ({ ...current, resumeUrl: reader.result }));
      setMessage(`${file.name} attached. Save your profile to keep it.`);
    };
    reader.readAsDataURL(file);
  }

  async function save(event) {
    event.preventDefault();
    setMessage("Saving...");
    const res = await fetch("/api/profile", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...form, skills: csv(form.skills), certifications: csv(form.certifications), languages: csv(form.languages) }),
    });
    const payload = await res.json();
    if (res.ok) { onSave(payload.user); setMessage("Profile saved."); } else setMessage(payload.error || "Unable to save profile.");
  }

  return (
    <section className="panel form-panel">
      <div className="panel-top"><h2>Candidate profile</h2><span>PDF resume links and portfolio included</span></div>
      <form onSubmit={save} className="portal-form">
        <Field label="Full name"><input value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} /></Field>
        <Field label="Profile picture URL"><input value={form.avatar} onChange={(event) => setForm({ ...form, avatar: event.target.value })} /></Field>
        <Field label="Resume PDF URL"><input value={form.resumeUrl} onChange={(event) => setForm({ ...form, resumeUrl: event.target.value })} placeholder="https://..." /></Field>
        <label className="dropzone" onDragOver={(event) => event.preventDefault()} onDrop={(event) => { event.preventDefault(); uploadResume(event.dataTransfer.files?.[0]); }}>
          <span>Drag and drop resume PDF</span>
          <input type="file" accept="application/pdf" onChange={(event) => uploadResume(event.target.files?.[0])} />
        </label>
        <Field label="About me"><textarea rows={4} value={form.about} onChange={(event) => setForm({ ...form, about: event.target.value })} /></Field>
        <Field label="Skills"><input value={form.skills} onChange={(event) => setForm({ ...form, skills: event.target.value })} /></Field>
        <Field label="Certifications"><input value={form.certifications} onChange={(event) => setForm({ ...form, certifications: event.target.value })} /></Field>
        <Field label="Languages"><input value={form.languages} onChange={(event) => setForm({ ...form, languages: event.target.value })} /></Field>
        <Field label="GitHub"><input value={form.portfolio.github} onChange={(event) => setForm({ ...form, portfolio: { ...form.portfolio, github: event.target.value } })} /></Field>
        <Field label="LinkedIn"><input value={form.portfolio.linkedin} onChange={(event) => setForm({ ...form, portfolio: { ...form.portfolio, linkedin: event.target.value } })} /></Field>
        <Field label="Personal website"><input value={form.portfolio.website} onChange={(event) => setForm({ ...form, portfolio: { ...form.portfolio, website: event.target.value } })} /></Field>
        <button className="portal-button" type="submit">Save profile</button>
        {message && <p className="form-message">{message}</p>}
      </form>
    </section>
  );
}

function RecruiterDashboard() {
  const [data, setData] = useState(null);
  const [tab, setTab] = useState("Overview");
  const [jobForm, setJobForm] = useState({ title: "", location: "", description: "", responsibilities: "", requirements: "", skills: "", salaryMin: "", salaryMax: "", experience: "", employmentType: "Full-time", workMode: "Remote", category: "Engineering", status: "published", customQuestions: [] });
  const [message, setMessage] = useState("");

  useEffect(() => { fetch("/api/dashboard/recruiter").then((res) => res.json()).then(setData); }, []);

  const stats = data?.stats || {};
  const applicants = data?.applicants || [];
  const jobs = data?.jobs || [];

  async function updateStatus(appId, status) {
    await fetch(`/api/applications/${appId}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status }) });
    setData((prev) => ({ ...prev, applicants: prev.applicants.map((app) => app._id === appId ? { ...app, status } : app) }));
  }

  async function postJob(event) {
    event.preventDefault();
    setMessage("Publishing...");
    const body = {
      ...jobForm,
      description: jobForm.description || `${jobForm.title} role at a growing team.`,
      responsibilities: csv(jobForm.responsibilities),
      requirements: csv(jobForm.requirements),
      skills: csv(jobForm.skills),
      salaryMin: Number(jobForm.salaryMin) || undefined,
      salaryMax: Number(jobForm.salaryMax) || undefined,
      customQuestions: (jobForm.customQuestions || []).filter((q) => q.question.trim()),
    };
    const res = await fetch("/api/jobs", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    const payload = await res.json();
    if (res.ok) {
      setData((prev) => ({ ...prev, jobs: [payload.job, ...(prev?.jobs || [])] }));
      setMessage("Job published.");
      setJobForm({ ...jobForm, title: "", location: "", description: "", responsibilities: "", requirements: "", skills: "", salaryMin: "", salaryMax: "" });
    } else setMessage(payload.error || "Unable to publish job.");
  }

  async function generateDescription() {
    setMessage("Generating job description...");
    const res = await fetch("/api/ai/job-description", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ title: jobForm.title, experience: jobForm.experience, skills: csv(jobForm.skills) }) });
    const payload = await res.json();
    setJobForm((prev) => ({ ...prev, description: payload.summary || payload.description || prev.description, responsibilities: (payload.responsibilities || []).join(", "), requirements: (payload.requirements || payload.qualifications || []).join(", ") }));
    setMessage("AI draft added.");
  }

  return (
    <PortalShell role="recruiter" tabs={["Overview", "Applicants", "Jobs", "Post a job", "Analytics"]} tab={tab} setTab={setTab}>
      <DashboardHeader eyebrow="Recruiter dashboard" title="Build the team that builds the future." action={<button className="portal-button" onClick={() => setTab("Post a job")}>Post a job</button>} />
      <div className="stat-grid">
        <article><span>Active jobs</span><strong>{stats.activeJobs ?? 0}</strong><small>Published listings</small></article>
        <article><span>Closed jobs</span><strong>{stats.closedJobs ?? jobs.filter((job) => job.status === "closed").length}</strong><small>Archived roles</small></article>
        <article><span>Applications</span><strong>{stats.totalApplicants ?? 0}</strong><small>Received</small></article>
        <article><span>Total views</span><strong>{stats.totalViews ?? 0}</strong><small>Across all jobs</small></article>
      </div>
      {tab === "Overview" && <div className="dashboard-grid"><ApplicantsPanel applicants={applicants.slice(0, 6)} updateStatus={updateStatus} /><FunnelPanel stats={stats} /></div>}
      {tab === "Applicants" && <ApplicantsPanel applicants={applicants} updateStatus={updateStatus} />}
      {tab === "Jobs" && <RecruiterJobsPanel jobs={jobs} setData={setData} />}
      {tab === "Post a job" && <JobForm form={jobForm} setForm={setJobForm} onSubmit={postJob} onGenerate={generateDescription} message={message} />}
      {tab === "Analytics" && <FunnelPanel stats={stats} full />}
    </PortalShell>
  );
}

function ApplicantsPanel({ applicants, updateStatus }) {
  return (
    <section className="panel">
      <div className="panel-top"><h2>Applicants</h2><span>Resume, skills, portfolio, contact</span></div>
      {applicants.length === 0 ? <EmptyState>No applicants yet.</EmptyState> : (
        <div className="table applicant-table">
          {applicants.map((app) => (
            <div className="table-row" key={app._id}>
              <span>{app.candidate?.name || "Candidate"}</span>
              <span>{app.job?.title || "Role"}</span>
              <span>{app.candidate?.skills?.slice(0, 3).join(", ") || "Skills pending"}</span>
              <select value={app.status} onChange={(event) => updateStatus(app._id, event.target.value)}>
                {APPLICATION_STATUSES.map((status) => <option key={status} value={status}>{STATUS_LABELS[status]}</option>)}
              </select>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

function RecruiterJobsPanel({ jobs, setData }) {
  async function patchJob(jobId, body) {
    const res = await fetch(`/api/jobs/${jobId}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    const payload = await res.json();
    if (res.ok) setData((prev) => ({ ...prev, jobs: prev.jobs.map((job) => job._id === jobId ? payload.job : job) }));
  }

  async function deleteJob(jobId) {
    if (!confirm("Delete this job?")) return;
    await fetch(`/api/jobs/${jobId}`, { method: "DELETE" });
    setData((prev) => ({ ...prev, jobs: prev.jobs.filter((job) => job._id !== jobId) }));
  }

  return (
    <section className="panel">
      <div className="panel-top"><h2>Job management</h2></div>
      {jobs.length === 0 ? <EmptyState>No jobs posted yet.</EmptyState> : (
        <div className="table">
          {jobs.map((job) => (
            <div className="table-row" key={job._id}>
              <span>{job.title}</span><span>{job.location}</span><Badge status={job.status} />
              <span className="row-actions"><button onClick={() => patchJob(job._id, { status: job.status === "closed" ? "published" : "closed" })}>{job.status === "closed" ? "Publish" : "Close"}</button><button onClick={() => deleteJob(job._id)}>Delete</button></span>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

function JobForm({ form, setForm, onSubmit, onGenerate, message }) {
  const questions = form.customQuestions || [];

  function addQuestion() {
    setForm({ ...form, customQuestions: [...questions, { question: "", type: "text", required: false }] });
  }

  function updateQuestion(i, patch) {
    setForm({ ...form, customQuestions: questions.map((q, j) => j === i ? { ...q, ...patch } : q) });
  }

  function removeQuestion(i) {
    setForm({ ...form, customQuestions: questions.filter((_, j) => j !== i) });
  }

  return (
    <section className="panel form-panel">
      <div className="panel-top"><h2>Create job</h2><button type="button" onClick={onGenerate}>✦ AI generate</button></div>
      <form onSubmit={onSubmit} className="portal-form">
        <Field label="Title"><input required value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })} /></Field>
        <Field label="Location"><input required value={form.location} onChange={(event) => setForm({ ...form, location: event.target.value })} /></Field>
        <Field label="Description"><textarea rows={4} value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} /></Field>
        <Field label="Responsibilities"><input value={form.responsibilities} onChange={(event) => setForm({ ...form, responsibilities: event.target.value })} placeholder="Comma-separated" /></Field>
        <Field label="Requirements"><input value={form.requirements} onChange={(event) => setForm({ ...form, requirements: event.target.value })} placeholder="Comma-separated" /></Field>
        <Field label="Skills"><input value={form.skills} onChange={(event) => setForm({ ...form, skills: event.target.value })} placeholder="React, MongoDB, APIs" /></Field>
        <Field label="Salary min"><input value={form.salaryMin} onChange={(event) => setForm({ ...form, salaryMin: event.target.value })} /></Field>
        <Field label="Salary max"><input value={form.salaryMax} onChange={(event) => setForm({ ...form, salaryMax: event.target.value })} /></Field>
        <Field label="Experience"><input value={form.experience} onChange={(event) => setForm({ ...form, experience: event.target.value })} /></Field>
        <Field label="Employment type"><select value={form.employmentType} onChange={(event) => setForm({ ...form, employmentType: event.target.value })}>{["Full-time", "Part-time", "Contract", "Internship"].map((item) => <option key={item}>{item}</option>)}</select></Field>
        <Field label="Work mode"><select value={form.workMode} onChange={(event) => setForm({ ...form, workMode: event.target.value })}>{["Remote", "Hybrid", "Onsite"].map((item) => <option key={item}>{item}</option>)}</select></Field>

        {/* Custom screening questions */}
        <div className="cq-section">
          <div className="cq-header">
            <span>Screening questions <em>({questions.length})</em></span>
            <button type="button" onClick={addQuestion}>+ Add question</button>
          </div>
          {questions.map((q, i) => (
            <div className="cq-row" key={i}>
              <input
                className="cq-input"
                value={q.question}
                onChange={(e) => updateQuestion(i, { question: e.target.value })}
                placeholder={`Question ${i + 1}`}
              />
              <select value={q.type} onChange={(e) => updateQuestion(i, { type: e.target.value })}>
                <option value="text">Short text</option>
                <option value="textarea">Long text</option>
                <option value="yesno">Yes / No</option>
              </select>
              <label className="cq-required">
                <input type="checkbox" checked={q.required} onChange={(e) => updateQuestion(i, { required: e.target.checked })} />
                Required
              </label>
              <button type="button" className="cq-remove" onClick={() => removeQuestion(i)}>✕</button>
            </div>
          ))}
        </div>

        <button className="portal-button" type="submit">Publish</button>
        {message && <p className="form-message">{message}</p>}
      </form>
    </section>
  );
}

function FunnelPanel({ stats, full }) {
  const views = stats.totalViews || 1;
  const applications = stats.totalApplicants || 0;
  const shortlisted = stats.shortlisted || 0;
  return (
    <section className="panel insight">
      <p className="eyebrow">Analytics</p>
      <h2>Hiring funnel</h2>
      <div className="metric-bars">
        <span style={{ width: "100%" }}>Views: {views}</span>
        <span style={{ width: `${Math.max(8, Math.min(100, (applications / views) * 100))}%` }}>Applications: {applications}</span>
        <span style={{ width: `${Math.max(8, Math.min(100, (shortlisted / Math.max(1, applications)) * 100))}%` }}>Shortlisted: {shortlisted}</span>
      </div>
      {full && <p>Track views per job, applications, shortlisted candidates, and conversion rates from one place.</p>}
    </section>
  );
}

function AdminDashboard() {
  const [tab, setTab] = useState("Overview");
  const [stats, setStats] = useState({});
  const [users, setUsers] = useState([]);
  const [companies, setCompanies] = useState([]);
  const [jobs, setJobs] = useState([]);

  useEffect(() => {
    fetch("/api/admin/stats").then((res) => res.json()).then((payload) => setStats(payload.stats || {}));
    fetch("/api/admin/users").then((res) => res.json()).then((payload) => setUsers(payload.users || []));
    fetch("/api/admin/companies").then((res) => res.json()).then((payload) => setCompanies(payload.companies || []));
    fetch("/api/admin/jobs").then((res) => res.json()).then((payload) => setJobs(payload.jobs || []));
  }, []);

  async function patchUser(id, body) {
    const res = await fetch(`/api/admin/users/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    const payload = await res.json();
    if (res.ok) setUsers((items) => items.map((item) => item._id === id ? payload.user : item));
  }

  async function patchCompany(id, body) {
    const res = await fetch(`/api/admin/companies/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    const payload = await res.json();
    if (res.ok) setCompanies((items) => items.map((item) => item._id === id ? payload.company : item));
  }

  async function patchAdminJob(id, body) {
    const res = await fetch(`/api/admin/jobs/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    const payload = await res.json();
    if (res.ok) setJobs((items) => items.map((item) => item._id === id ? payload.job : item));
  }

  return (
    <PortalShell role="admin" tabs={["Overview", "Users", "Companies", "Jobs", "Reports"]} tab={tab} setTab={setTab}>
      <DashboardHeader eyebrow="Admin panel" title="Platform control center." action={<a className="portal-button" href="/">View marketplace</a>} />
      <div className="stat-grid">
        <article><span>Users</span><strong>{stats.totalUsers ?? 0}</strong><small>{stats.suspendedUsers ?? 0} suspended</small></article>
        <article><span>Recruiters</span><strong>{stats.totalRecruiters ?? 0}</strong><small>{stats.pendingCompanies ?? 0} pending</small></article>
        <article><span>Jobs</span><strong>{stats.activeJobs ?? 0}</strong><small>Active listings</small></article>
        <article><span>Applications</span><strong>{stats.totalApplications ?? 0}</strong><small>All time</small></article>
      </div>
      {tab === "Overview" && <ReportsPanel users={users} companies={companies} jobs={jobs} />}
      {tab === "Users" && <AdminUsers users={users} patchUser={patchUser} />}
      {tab === "Companies" && <AdminCompanies companies={companies} patchCompany={patchCompany} />}
      {tab === "Jobs" && <AdminJobs jobs={jobs} patchJob={patchAdminJob} />}
      {tab === "Reports" && <ReportsPanel users={users} companies={companies} jobs={jobs} />}
    </PortalShell>
  );
}

function AdminUsers({ users, patchUser }) {
  return <section className="panel"><div className="panel-top"><h2>Manage users</h2></div><div className="table">{users.map((user) => <div className="table-row" key={user._id}><span>{user.name}</span><span>{user.email}</span><span>{user.role}</span><button onClick={() => patchUser(user._id, { suspended: !user.suspended })}>{user.suspended ? "Unsuspend" : "Suspend"}</button></div>)}</div></section>;
}

function AdminCompanies({ companies, patchCompany }) {
  return <section className="panel"><div className="panel-top"><h2>Manage companies</h2></div><div className="table">{companies.map((company) => <div className="table-row" key={company._id}><span>{company.name}</span><span>{company.owner?.email || "Owner"}</span><Badge status={company.approved ? "published" : "draft"} /><span className="row-actions"><button onClick={() => patchCompany(company._id, { approved: !company.approved })}>{company.approved ? "Reject" : "Approve"}</button><button onClick={() => patchCompany(company._id, { featured: !company.featured })}>{company.featured ? "Unfeature" : "Feature"}</button></span></div>)}</div></section>;
}

function AdminJobs({ jobs, patchJob }) {
  return <section className="panel"><div className="panel-top"><h2>Manage jobs</h2></div><div className="table">{jobs.map((job) => <div className="table-row" key={job._id}><span>{job.title}</span><span>{job.company?.name || "Company"}</span><Badge status={job.status} /><span className="row-actions"><button onClick={() => patchJob(job._id, { status: job.status === "published" ? "closed" : "published" })}>{job.status === "published" ? "Remove" : "Approve"}</button><button onClick={() => patchJob(job._id, { featured: !job.featured })}>{job.featured ? "Unfeature" : "Feature"}</button></span></div>)}</div></section>;
}

function ReportsPanel({ users, companies, jobs }) {
  const skills = jobs.flatMap((job) => job.skills || []);
  const popularSkills = [...new Set(skills)].slice(0, 6);
  return (
    <section className="panel">
      <div className="panel-top"><h2>Reports</h2><span>Daily registrations, monthly applications, company activity</span></div>
      <div className="report-grid">
        <article><strong>{users.filter((user) => new Date(user.createdAt).toDateString() === new Date().toDateString()).length}</strong><span>Daily registrations</span></article>
        <article><strong>{companies.filter((company) => company.approved).length}</strong><span>Active companies</span></article>
        <article><strong>{jobs.filter((job) => job.featured).length}</strong><span>Featured jobs</span></article>
        <article><strong>{popularSkills.join(", ") || "No skills yet"}</strong><span>Most popular skills</span></article>
      </div>
    </section>
  );
}

function DashboardHeader({ eyebrow, title, action }) {
  return <header><div><p className="eyebrow">{eyebrow}</p><h1>{title}</h1><p>Manage hiring workflows, notifications, analytics, and AI tools.</p></div>{action}</header>;
}

function PortalShell({ role, tabs, tab, setTab, children }) {
  return (
    <main className="portal">
      <aside>
        <a className="brand" href="/"><span>*</span> TalentLoop</a>
        <p className="portal-label">{role} workspace</p>
        {tabs.map((item) => <button key={item} className={tab === item ? "side-active" : ""} onClick={() => setTab(item)}>{item}</button>)}
        <a className="side-help" href="/api/auth/logout">Logout</a>
        <a className="side-help" href="/">Back to site</a>
      </aside>
      <section className="portal-content">{children}</section>
    </main>
  );
}

export default function PortalDashboard({ role }) {
  if (role === "candidate") return <CandidateDashboard />;
  if (role === "recruiter") return <RecruiterDashboard />;
  return <AdminDashboard />;
}
