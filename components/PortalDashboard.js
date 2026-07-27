"use client";

import { useEffect, useMemo, useRef, useState } from "react";

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

function formatDetailValue(value) {
  if (value === null || value === undefined || value === "") return "Not provided";
  if (Array.isArray(value)) {
    if (value.length === 0) return "Not provided";
    return value.map((item) => {
      if (item === null || item === undefined || item === "") return "Not provided";
      if (typeof item === "string") return item;
      if (typeof item === "object") {
        return Object.entries(item)
          .filter(([, nestedValue]) => nestedValue !== null && nestedValue !== undefined && nestedValue !== "")
          .map(([key, nestedValue]) => `${key}: ${Array.isArray(nestedValue) ? nestedValue.join(", ") : String(nestedValue)}`)
          .join(" | ");
      }
      return String(item);
    }).join("\n");
  }
  if (typeof value === "object") {
    const entries = Object.entries(value)
      .filter(([, nestedValue]) => nestedValue !== null && nestedValue !== undefined && nestedValue !== "")
      .map(([key, nestedValue]) => `${key}: ${Array.isArray(nestedValue) ? nestedValue.join(", ") : String(nestedValue)}`);
    return entries.length ? entries.join("\n") : "Not provided";
  }
  return String(value);
}

function detailLink(value) {
  if (!value) return null;
  const href = String(value).trim();
  if (!href) return null;
  if (href.startsWith("http") || href.startsWith("data:") || href.startsWith("/") || href.startsWith("./") || href.startsWith("../")) {
    return href;
  }
  return null;
}

function escapeCsv(value) {
  if (value === null || value === undefined) return "";
  const text = String(value).replace(/"/g, '""');
  return text.includes(",") || text.includes("\n") || text.includes("\"") ? `"${text}"` : text;
}

function applicantCsvRow(app) {
  const candidate = app.candidate || {};
  const resumeUrl = app.resumeUrl || candidate.resumeUrl || "";
  const govtId = app.govtId ? (typeof app.govtId === "object" ? `${app.govtId.type || ""}:${app.govtId.number || app.govtId}` : String(app.govtId)) : "";
  const experience = formatDetailValue(app.experience || candidate.experience || []);
  const education = formatDetailValue(app.education || candidate.education || []);
  const certifications = (app.certifications || candidate.certifications || []).join("; ");
  const answers = (app.answers || []).map((a) => `${a.question}: ${a.answer}`).join("; ");
  return [
    app._id,
    app.job?.title || "",
    candidate.name || app.name || "",
    candidate.email || app.email || "",
    app.phone || "",
    govtId,
    resumeUrl,
    candidate.portfolio?.website || app.portfolioLink || "",
    candidate.portfolio?.linkedin || app.linkedinUrl || "",
    experience,
    education,
    certifications,
    app.coverLetter || "",
    answers,
    app.status,
    app.createdAt ? new Date(app.createdAt).toISOString() : "",
  ].map(escapeCsv).join(",");
}

function downloadApplicantsCsv(applicants) {
  if (!applicants || applicants.length === 0) return;
  const headers = [
    "Application ID",
    "Job title",
    "Candidate name",
    "Candidate email",
    "Phone",
    "Government ID",
    "Resume URL",
    "Portfolio",
    "LinkedIn",
    "Experience",
    "Education",
    "Certifications",
    "Cover letter",
    "Answer details",
    "Status",
    "Submitted at",
  ];
  const csv = [headers.map(escapeCsv).join(","), ...applicants.map(applicantCsvRow)].join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `applicants-${new Date().toISOString().slice(0, 10)}.csv`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

function openUrl(url) {
  if (url.startsWith("data:")) {
    const [header, b64] = url.split(",");
    const mime = header.split(":")[1].split(";")[0];
    const bytes = Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
    const blob = new Blob([bytes], { type: mime });
    const blobUrl = URL.createObjectURL(blob);
    window.open(blobUrl, "_blank", "noreferrer");
  } else {
    window.open(url, "_blank", "noreferrer");
  }
}

function DetailItem({ label, value }) {
  const href = detailLink(value);
  const displayValue = formatDetailValue(value);
  return (
    <div className="applicant-detail-item">
      <span className="applicant-detail-label">{label}</span>
      {href
        ? <button type="button" className="applicant-detail-value applicant-detail-link" onClick={() => openUrl(href)}>Open</button>
        : <pre className="applicant-detail-value">{displayValue}</pre>}
    </div>
  );
}

function ApplicationAnswers({ answers, job }) {
  const questions = job?.customQuestions || [];
  // Merge job questions with submitted answers so unanswered ones still show
  const merged = questions.length
    ? questions.map((q) => {
        const qId = String(q._id?.$oid || q._id);
        const submitted = (answers || []).find((a) => a.questionId === qId || a.question === q.question);
        return { question: q.question, answer: submitted?.answer || null };
      })
    : (answers || []);

  if (!merged.length) return <EmptyState>No screening questions for this job.</EmptyState>;
  return (
    <div className="applicant-answers">
      {merged.map((item, index) => (
        <article className="applicant-answer" key={item.question || index}>
          <strong>{item.question || `Question ${index + 1}`}</strong>
          <p style={!item.answer ? { color: "var(--muted)", fontStyle: "italic" } : {}}>{item.answer || "Not answered"}</p>
        </article>
      ))}
    </div>
  );
}

function ApplicantDetailCard({ app, updateStatus }) {
  const candidate = app.candidate || {};
  const fullName = app.name || candidate.name || "Candidate";
  const email = app.email || candidate.email;
  const phone = app.phone;
  const rawGovtId = app.govtId ? String(typeof app.govtId === "object" ? (app.govtId.number || JSON.stringify(app.govtId)) : app.govtId) : null;
  const govtId = rawGovtId ? `****${rawGovtId.slice(-4)}` : null;
  const resumeUrl = app.resumeUrl || candidate.resumeUrl;
  const resumeFileName = app.resumeFileName || "Resume";
  const education = app.education || candidate.education;
  const experience = app.experience || candidate.experience;
  const certifications = app.certifications || candidate.certifications;
  const languages = candidate.languages;
  const about = candidate.about || app.notes;
  const portfolio = app.portfolioLink || candidate.portfolio?.website || candidate.portfolio?.github || candidate.portfolio?.linkedin;
  const linkedin = app.linkedinUrl || candidate.portfolio?.linkedin;

  return (
    <article className="applicant-card">
      {/* Header */}
      <div className="applicant-card-head">
        <div>
          <p className="eyebrow">{app.job?.title || "Application"}</p>
          <h3>{fullName}</h3>
          <p className="applicant-card-subtitle">Submitted {new Date(app.createdAt).toLocaleString()}</p>
        </div>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 10 }}>
          <select className="applicant-status" value={app.status} onChange={(e) => updateStatus(app._id, e.target.value)}>
            {APPLICATION_STATUSES.map((s) => <option key={s} value={s}>{STATUS_LABELS[s]}</option>)}
          </select>
          {resumeUrl && (
            <button
              type="button"
              onClick={() => openUrl(resumeUrl)}
              style={{ padding: "9px 16px", background: "#18251f", color: "#fff", border: "none", borderRadius: 7, font: "600 13px 'DM Sans'", cursor: "pointer", whiteSpace: "nowrap" }}
            >
              📄 Open resume
            </button>
          )}
        </div>
      </div>

      {/* Contact row */}
      <div className="applicant-summary-grid">
        <DetailItem label="Email" value={email} />
        <DetailItem label="Phone" value={phone} />
        <DetailItem label="Govt ID" value={govtId} />
        <DetailItem label="LinkedIn" value={linkedin} />
      </div>

      {/* Experience */}
      {experience && (
        <div className="applicant-panel">
          <h4>Experience</h4>
          <div style={{ display: "grid", gap: 8 }}>
            {(Array.isArray(experience) ? experience : [experience]).map((e, i) => (
              <div key={i} style={{ padding: "12px 14px", border: "1px solid #e1e5dc", borderRadius: 10, background: "#fff", fontSize: 13, lineHeight: 1.6, color: "#18251f" }}>
                {[e.type && <span key="t" style={{ background: "#eef2e8", color: "#4b5d1f", padding: "2px 8px", borderRadius: 4, fontSize: 11, fontWeight: 600, marginRight: 8 }}>{e.type || e.employmentType}</span>, e.role || e.title, e.company && `@ ${e.company}`, e.duration && `· ${e.duration}`].filter(Boolean)}
                {(e.summary) && <div style={{ marginTop: 4, color: "#5c665f", fontSize: 12 }}>{e.summary}</div>}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Education */}
      {education && (
        <div className="applicant-panel">
          <h4>Education</h4>
          <div style={{ display: "grid", gap: 8 }}>
            {(Array.isArray(education) ? education : [education]).map((e, i) => (
              <div key={i} style={{ padding: "12px 14px", border: "1px solid #e1e5dc", borderRadius: 10, background: "#fff", fontSize: 13, color: "#18251f" }}>
                {[e.degree || e.level, e.institution && `· ${e.institution}`, e.year && `(${e.year})`].filter(Boolean).join(" ")}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Skills + Certifications + Languages */}
      {(candidate.skills?.length > 0 || certifications?.length > 0 || languages?.length > 0) && (
        <div className="applicant-panel">
          <h4>Skills &amp; credentials</h4>
          <div style={{ display: "grid", gap: 10 }}>
            {candidate.skills?.length > 0 && (
              <div>
                <p style={{ fontSize: 11, fontWeight: 600, color: "#6f7b74", margin: "0 0 6px", textTransform: "uppercase", letterSpacing: "0.8px" }}>Skills</p>
                <div className="applicant-tags">{candidate.skills.map((s, i) => <span key={i}>{s}</span>)}</div>
              </div>
            )}
            {certifications?.length > 0 && (
              <div>
                <p style={{ fontSize: 11, fontWeight: 600, color: "#6f7b74", margin: "0 0 6px", textTransform: "uppercase", letterSpacing: "0.8px" }}>Certifications</p>
                <div className="applicant-tags">{(Array.isArray(certifications) ? certifications : [certifications]).map((c, i) => <span key={i}>{c}</span>)}</div>
              </div>
            )}
            {languages?.length > 0 && (
              <div>
                <p style={{ fontSize: 11, fontWeight: 600, color: "#6f7b74", margin: "0 0 6px", textTransform: "uppercase", letterSpacing: "0.8px" }}>Languages</p>
                <div className="applicant-tags">{(Array.isArray(languages) ? languages : [languages]).map((l, i) => <span key={i}>{l}</span>)}</div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Application extras */}
      {(app.coverLetter || portfolio || about) && (
        <div className="applicant-panel">
          <h4>Application</h4>
          <div className="applicant-summary-grid applicant-summary-grid-tight">
            {portfolio && <DetailItem label="Portfolio" value={portfolio} />}
            {app.coverLetter && <DetailItem label="Cover letter" value={app.coverLetter} />}
            {about && <DetailItem label="About" value={about} />}
          </div>
        </div>
      )}

      {/* Screening answers */}
      <div className="applicant-panel">
        <h4>Screening answers</h4>
        <ApplicationAnswers answers={app.answers} job={app.job} />
      </div>
    </article>
  );
}

function CandidateDashboard() {
  const [data, setData] = useState(null);
  const [profile, setProfile] = useState(null);
  const [tab, setTab] = useState("Overview");

  useEffect(() => {
    const p = new URLSearchParams(window.location.search).get("tab");
    if (p) setTab(p);
  }, []);
  const [savedJobs, setSavedJobs] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [aiResult, setAiResult] = useState("");

  useEffect(() => {
    Promise.all([
      fetch("/api/dashboard/candidate").then((r) => r.json()),
      fetch("/api/profile").then((r) => r.json()),
    ]).then(([dashData, profileData]) => {
      setData(dashData);
      setProfile(profileData.user);
    });
  }, []);

  useEffect(() => {
    if (tab === "Saved jobs") fetch("/api/saved-jobs").then((res) => res.json()).then((payload) => setSavedJobs(payload.saved || []));
    if (tab === "Notifications") fetch("/api/notifications").then((res) => res.json()).then((payload) => setNotifications(payload.notifications || []));
    if (tab === "Profile" && profile && !profile.avatar) {
      fetch("/api/profile/avatar").then((r) => r.json()).then((p) => {
        if (p.avatar) setProfile((prev) => ({ ...prev, avatar: p.avatar }));
      });
    }
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
    <PortalShell role="candidate" tabs={["Overview", "Applications", "Saved jobs", "Notifications", "Profile"]} tab={tab} setTab={setTab} user={profile}>
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

function CameraCapture({ onCapture, onClose }) {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState("");
  const streamRef = useRef(null);

  useEffect(() => {
    navigator.mediaDevices.getUserMedia({ video: { facingMode: "user" } })
      .then((stream) => {
        streamRef.current = stream;
        if (videoRef.current) { videoRef.current.srcObject = stream; }
        setReady(true);
      })
      .catch(() => setError("Camera access denied. Please allow camera permission."));
    return () => streamRef.current?.getTracks().forEach((t) => t.stop());
  }, []);

  function snap() {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    canvas.getContext("2d").drawImage(video, 0, 0);
    const dataUrl = canvas.toDataURL("image/jpeg", 0.85);
    streamRef.current?.getTracks().forEach((t) => t.stop());
    onCapture(dataUrl);
  }

  return (
    <div className="cam-backdrop" onClick={onClose}>
      <div className="cam-modal" onClick={(e) => e.stopPropagation()}>
        <button className="cam-close" onClick={onClose}>✕</button>
        <p className="eyebrow" style={{ margin: "0 0 12px" }}>Take a photo</p>
        {error ? (
          <p style={{ color: "#9b2c2c", fontSize: 13 }}>{error}</p>
        ) : (
          <video ref={videoRef} autoPlay playsInline className="cam-video" />
        )}
        <canvas ref={canvasRef} style={{ display: "none" }} />
        {ready && (
          <button className="submit" style={{ marginTop: 14, width: "100%" }} onClick={snap}>📷 Capture</button>
        )}
      </div>
    </div>
  );
}

const PROFILE_STEPS = ["Your details", "Background", "Resume"];
const EMPTY_EXP = () => ({ type: "", role: "", company: "", duration: "", summary: "" });
const EMPTY_EDU = () => ({ level: "", institution: "", year: "" });

function ProfileEditor({ profile, onSave }) {
  const avatarRef = useRef(null);
  const resumeRef = useRef(null);
  const [step, setStep] = useState(0);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [skillInput, setSkillInput] = useState("");
  const [certInput, setCertInput] = useState("");
  const [showCamera, setShowCamera] = useState(false);

  const exps = Array.isArray(profile.experience) ? profile.experience : (profile.experience ? [profile.experience] : []);
  const edus = Array.isArray(profile.education) ? profile.education : (profile.education ? [profile.education] : []);

  const [details, setDetails] = useState({
    name: profile.name || "",
    phone: profile.phone || "",
    about: profile.about || "",
    skills: profile.skills || [],
    linkedinUrl: profile.portfolio?.linkedin || "",
    githubUrl: profile.portfolio?.github || "",
    websiteUrl: profile.portfolio?.website || "",
    avatar: profile.avatar || "",
  });

  const [background, setBackground] = useState({
    experiences: exps.length ? exps.map((e) => ({ type: e.type || e.employmentType || "", role: e.title || e.role || "", company: e.company || "", duration: e.duration || e.period || "", summary: e.summary || "" })) : [EMPTY_EXP()],
    educations: edus.length ? edus.map((e) => ({ level: e.degree || e.level || "", institution: e.institution || e.school || "", year: e.year || e.graduationYear || "" })) : [EMPTY_EDU()],
    certifications: profile.certifications || [],
  });

  const [resume, setResume] = useState({ url: profile.resumeUrl || "", fileName: profile.resumeUrl ? "Current resume" : "", dragging: false });

  function handleAvatar(file) {
    if (!file) return;
    if (!file.type.startsWith("image/")) { setMessage("Please upload an image file."); return; }
    if (file.size > 2 * 1024 * 1024) { setMessage("Image must be under 2 MB."); return; }
    const reader = new FileReader();
    reader.onload = () => setDetails((d) => ({ ...d, avatar: reader.result }));
    reader.readAsDataURL(file);
  }

  function handleResume(file) {
    if (!file) return;
    if (file.type !== "application/pdf") { setMessage("Please upload a PDF file."); return; }
    if (file.size > 5 * 1024 * 1024) { setMessage("File must be under 5 MB."); return; }
    const reader = new FileReader();
    reader.onload = () => setResume({ url: reader.result, fileName: file.name, dragging: false });
    reader.readAsDataURL(file);
  }

  function addTag(kind, value, setter) {
    const v = value.trim();
    if (!v) return;
    if (kind === "skills") setDetails((d) => ({ ...d, skills: [...d.skills, v] }));
    else setBackground((b) => ({ ...b, certifications: [...b.certifications, v] }));
    setter("");
  }

  async function save() {
    setSaving(true);
    setMessage("");
    const payload = {
      name: details.name,
      phone: details.phone || undefined,
      about: details.about,
      skills: details.skills,
      certifications: background.certifications,
      avatar: details.avatar || undefined,
      portfolio: { linkedin: details.linkedinUrl || undefined, github: details.githubUrl || undefined, website: details.websiteUrl || undefined },
      experience: background.experiences.filter((e) => e.role || e.company).map((e) => ({ type: e.type, role: e.role, company: e.company, duration: e.duration, summary: e.summary })),
      education: background.educations.filter((e) => e.level || e.institution).map((e) => ({ degree: e.level, institution: e.institution, year: e.year })),
      resumeUrl: resume.url || undefined,
    };
    const res = await fetch("/api/profile", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
    const data = await res.json();
    setSaving(false);
    if (res.ok) { onSave(data.user); setMessage("Profile saved ✓"); } else setMessage(data.error || "Unable to save.");
  }

  return (
    <div className="profile-editor-shell">
      {showCamera && (
        <CameraCapture
          onCapture={(dataUrl) => { setDetails((d) => ({ ...d, avatar: dataUrl })); setShowCamera(false); }}
          onClose={() => setShowCamera(false)}
        />
      )}
      {/* Step sidebar */}
      <aside className="profile-editor-sidebar">
        <div className="profile-avatar-wrap">
          <div className="profile-avatar-ring" onClick={() => avatarRef.current?.click()}>
            {details.avatar
              ? <img src={details.avatar} alt="Avatar" className="profile-avatar-img" />
              : <div className="profile-avatar-placeholder">{details.name ? details.name[0].toUpperCase() : "?"}</div>}
            <div className="profile-avatar-cam">📷</div>
          </div>
          <input ref={avatarRef} type="file" accept="image/*" style={{ display: "none" }} onChange={(e) => handleAvatar(e.target.files?.[0])} />
          <div className="profile-avatar-btns">
            <button type="button" className="profile-avatar-edit" onClick={() => avatarRef.current?.click()}>Upload photo</button>
            <button type="button" className="profile-avatar-edit" onClick={() => setShowCamera(true)}>📷 Take photo</button>
          </div>
        </div>
        <div className="apply-progress" style={{ marginTop: 20 }}>
          {PROFILE_STEPS.map((label, i) => (
            <div key={label} className={`apply-progress-step ${i === step ? "active" : ""} ${i < step ? "done" : ""}`} style={{ cursor: "pointer" }} onClick={() => setStep(i)}>
              <span className="apply-progress-dot">{i < step ? "✓" : i + 1}</span>
              <span>{label}</span>
            </div>
          ))}
        </div>
      </aside>

      {/* Form area */}
      <div className="profile-editor-form">
        <div className="apply-form-header" style={{ marginBottom: 24 }}>
          <p className="eyebrow">Step {step + 1} of {PROFILE_STEPS.length}</p>
          <h2 style={{ font: "600 24px/1.1 'Fraunces'", letterSpacing: "-0.5px", margin: "4px 0 0" }}>{PROFILE_STEPS[step]}</h2>
        </div>

        {/* Step 0 — Your details */}
        {step === 0 && (
          <div className="apply-fields">
            <label style={{ gridColumn: "1/-1" }}>
              Full name <span className="req">*</span>
              <input value={details.name} onChange={(e) => setDetails({ ...details, name: e.target.value })} placeholder="Jane Smith" />
            </label>
            <label>
              Phone number
              <input value={details.phone} onChange={(e) => setDetails({ ...details, phone: e.target.value })} placeholder="+91 98765 43210" />
            </label>
            <label>
              LinkedIn URL
              <input value={details.linkedinUrl} onChange={(e) => setDetails({ ...details, linkedinUrl: e.target.value })} placeholder="https://linkedin.com/in/..." />
            </label>
            <label>
              GitHub URL
              <input value={details.githubUrl} onChange={(e) => setDetails({ ...details, githubUrl: e.target.value })} placeholder="https://github.com/..." />
            </label>
            <label>
              Personal website
              <input value={details.websiteUrl} onChange={(e) => setDetails({ ...details, websiteUrl: e.target.value })} placeholder="https://..." />
            </label>
            <label style={{ gridColumn: "1/-1" }}>
              About me
              <textarea rows={3} className="apply-textarea" value={details.about} onChange={(e) => setDetails({ ...details, about: e.target.value })} placeholder="A short bio about yourself…" />
            </label>
            <label style={{ gridColumn: "1/-1" }}>
              Skills
              <div className="bg-cert-input-row">
                <input className="bg-cert-input" value={skillInput} onChange={(e) => setSkillInput(e.target.value)} onKeyDown={(e) => { if ((e.key === "Enter" || e.key === ",") && skillInput.trim()) { e.preventDefault(); addTag("skills", skillInput, setSkillInput); } }} placeholder="Type a skill and press Enter…" />
                <button type="button" className="bg-add-btn" onClick={() => addTag("skills", skillInput, setSkillInput)}>+ Add</button>
              </div>
              {details.skills.length > 0 && (
                <div className="bg-cert-tags">
                  {details.skills.map((s, i) => (
                    <span key={i} className="bg-cert-tag">{s}<button type="button" onClick={() => setDetails((d) => ({ ...d, skills: d.skills.filter((_, j) => j !== i) }))}>✕</button></span>
                  ))}
                </div>
              )}
            </label>
          </div>
        )}

        {/* Step 1 — Background */}
        {step === 1 && (
          <div>
            <div className="bg-section-header">
              <span>Experience</span>
              <button type="button" className="bg-add-btn" onClick={() => setBackground((b) => ({ ...b, experiences: [...b.experiences, EMPTY_EXP()] }))}>+ Add</button>
            </div>
            {background.experiences.map((exp, idx) => (
              <div key={idx} className="bg-entry">
                {background.experiences.length > 1 && (
                  <div className="bg-entry-header">
                    <span className="bg-entry-label">Experience {idx + 1}</span>
                    <button type="button" className="bg-remove-btn" onClick={() => setBackground((b) => ({ ...b, experiences: b.experiences.filter((_, i) => i !== idx) }))}>✕ Remove</button>
                  </div>
                )}
                <div className="apply-fields">
                  <label>Experience type
                    <select value={exp.type} onChange={(e) => setBackground((b) => { const a = [...b.experiences]; a[idx] = { ...a[idx], type: e.target.value }; return { ...b, experiences: a }; })} className="apply-select">
                      <option value="">Select type…</option>
                      <option>Full-time</option><option>Internship</option><option>Contract</option><option>Freelance</option>
                    </select>
                  </label>
                  <label>Role / title<input value={exp.role} onChange={(e) => setBackground((b) => { const a = [...b.experiences]; a[idx] = { ...a[idx], role: e.target.value }; return { ...b, experiences: a }; })} placeholder="Software Engineer" /></label>
                  <label>Company<input value={exp.company} onChange={(e) => setBackground((b) => { const a = [...b.experiences]; a[idx] = { ...a[idx], company: e.target.value }; return { ...b, experiences: a }; })} placeholder="Acme Inc." /></label>
                  <label>Duration<input value={exp.duration} onChange={(e) => setBackground((b) => { const a = [...b.experiences]; a[idx] = { ...a[idx], duration: e.target.value }; return { ...b, experiences: a }; })} placeholder="Jan 2024 – Present" /></label>
                  <label style={{ gridColumn: "1/-1" }}>Summary<textarea rows={3} className="apply-textarea" value={exp.summary} onChange={(e) => setBackground((b) => { const a = [...b.experiences]; a[idx] = { ...a[idx], summary: e.target.value }; return { ...b, experiences: a }; })} placeholder="Briefly describe your experience." /></label>
                </div>
              </div>
            ))}

            <div className="bg-section-header" style={{ marginTop: 24 }}>
              <span>Education</span>
              <button type="button" className="bg-add-btn" onClick={() => setBackground((b) => ({ ...b, educations: [...b.educations, EMPTY_EDU()] }))}>+ Add</button>
            </div>
            {background.educations.map((edu, idx) => (
              <div key={idx} className="bg-entry">
                {background.educations.length > 1 && (
                  <div className="bg-entry-header">
                    <span className="bg-entry-label">Education {idx + 1}</span>
                    <button type="button" className="bg-remove-btn" onClick={() => setBackground((b) => ({ ...b, educations: b.educations.filter((_, i) => i !== idx) }))}>✕ Remove</button>
                  </div>
                )}
                <div className="apply-fields">
                  <label>Degree / level<input value={edu.level} onChange={(e) => setBackground((b) => { const a = [...b.educations]; a[idx] = { ...a[idx], level: e.target.value }; return { ...b, educations: a }; })} placeholder="B.Tech Computer Science" /></label>
                  <label>Institution<input value={edu.institution} onChange={(e) => setBackground((b) => { const a = [...b.educations]; a[idx] = { ...a[idx], institution: e.target.value }; return { ...b, educations: a }; })} placeholder="University / college name" /></label>
                  <label>Graduation year<input value={edu.year} onChange={(e) => setBackground((b) => { const a = [...b.educations]; a[idx] = { ...a[idx], year: e.target.value }; return { ...b, educations: a }; })} placeholder="2025" /></label>
                </div>
              </div>
            ))}

            <div className="bg-section-header" style={{ marginTop: 24 }}><span>Certifications</span></div>
            <div className="bg-cert-input-row">
              <input className="bg-cert-input" value={certInput} onChange={(e) => setCertInput(e.target.value)} onKeyDown={(e) => { if ((e.key === "Enter" || e.key === ",") && certInput.trim()) { e.preventDefault(); addTag("certifications", certInput, setCertInput); } }} placeholder="Type and press Enter to add…" />
              <button type="button" className="bg-add-btn" onClick={() => addTag("certifications", certInput, setCertInput)}>+ Add</button>
            </div>
            {background.certifications.length > 0 && (
              <div className="bg-cert-tags">
                {background.certifications.map((c, i) => (
                  <span key={i} className="bg-cert-tag">{c}<button type="button" onClick={() => setBackground((b) => ({ ...b, certifications: b.certifications.filter((_, j) => j !== i) }))}>✕</button></span>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Step 2 — Resume */}
        {step === 2 && (
          <div>
            <p style={{ fontSize: 13, color: "var(--muted)", margin: "0 0 16px" }}>Upload your resume PDF. It will be pre-filled when you apply for jobs.</p>
            <div
              className={`apply-dropzone ${resume.dragging ? "dragging" : ""} ${resume.fileName ? "has-file" : ""}`}
              onDragOver={(e) => { e.preventDefault(); setResume((r) => ({ ...r, dragging: true })); }}
              onDragLeave={() => setResume((r) => ({ ...r, dragging: false }))}
              onDrop={(e) => { e.preventDefault(); handleResume(e.dataTransfer.files?.[0]); }}
              onClick={() => resumeRef.current?.click()}
            >
              {resume.fileName ? (
                <><span className="apply-dropzone-icon">📄</span><strong>{resume.fileName}</strong><span style={{ fontSize: 12, color: "var(--muted)" }}>Click to replace</span></>
              ) : (
                <><span className="apply-dropzone-icon">⬆</span><strong>Drag & drop your resume PDF</strong><span style={{ fontSize: 12, color: "var(--muted)" }}>or click to browse · max 5 MB</span></>
              )}
              <input ref={resumeRef} type="file" accept="application/pdf" style={{ display: "none" }} onChange={(e) => handleResume(e.target.files?.[0])} />
            </div>
            {resume.fileName && <button type="button" className="apply-remove-btn" onClick={() => setResume({ url: "", fileName: "", dragging: false })}>Remove file</button>}
            <label className="apply-url-label">
              Or paste a hosted resume URL
              <input value={resume.url.startsWith("data:") ? "" : resume.url} onChange={(e) => setResume({ url: e.target.value, fileName: "", dragging: false })} placeholder="https://drive.google.com/..." />
            </label>
          </div>
        )}

        {/* Nav */}
        <div className="apply-nav">
          {step > 0 && <button type="button" className="apply-back" onClick={() => setStep(step - 1)}>← Back</button>}
          {step < PROFILE_STEPS.length - 1
            ? <button type="button" className="submit apply-next" onClick={() => setStep(step + 1)}>Continue →</button>
            : <button type="button" className="submit apply-next" disabled={saving} onClick={save}>{saving ? "Saving…" : "Save profile →"}</button>}
        </div>
        {message && <p className="form-message" style={{ marginTop: 12 }}>{message}</p>}
      </div>
    </div>
  );
}

function RecruiterCompanyEditor({ company, onSave }) {
  const logoRef = useRef(null);
  const [form, setForm] = useState({
    name: company?.name || "",
    logo: company?.logo || "",
    description: company?.description || "",
    website: company?.website || "",
    industry: company?.industry || "",
    size: company?.size || "",
    headquarters: company?.headquarters || "",
  });
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  function handleLogo(file) {
    if (!file) return;
    if (!file.type.startsWith("image/")) { setMessage("Please upload an image file."); return; }
    if (file.size > 2 * 1024 * 1024) { setMessage("Logo must be under 2 MB."); return; }
    const reader = new FileReader();
    reader.onload = () => setForm((f) => ({ ...f, logo: reader.result }));
    reader.readAsDataURL(file);
  }

  async function save() {
    setSaving(true); setMessage("");
    const res = await fetch("/api/company", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) });
    const data = await res.json();
    setSaving(false);
    if (res.ok) { onSave(data.company); setMessage("Company profile saved ✓"); }
    else setMessage(data.error || "Unable to save.");
  }

  return (
    <section className="panel form-panel">
      <div className="panel-top"><h2>Company profile</h2></div>
      <div style={{ display: "grid", gap: 18, maxWidth: 600, marginTop: 8 }}>
        {/* Logo */}
        <div style={{ display: "grid", gap: 8 }}>
          <span style={{ fontSize: 12, fontWeight: 600, color: "#34423a" }}>Company logo</span>
          <div style={{ display: "flex", alignItems: "center", gap: 14, padding: 14, border: "1px dashed #9daa9f", borderRadius: 8, cursor: "pointer", background: "#fbfcf6" }} onClick={() => logoRef.current?.click()}>
            {form.logo
              ? <img src={form.logo} alt="Logo" style={{ width: 52, height: 52, objectFit: "contain", borderRadius: 8, border: "1px solid #e1e5dc" }} />
              : <div style={{ width: 52, height: 52, borderRadius: 8, background: "#e8eddf", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22 }}>🏢</div>}
            <div>
              <p style={{ margin: 0, fontSize: 13, fontWeight: 600, color: "#34423a" }}>{form.logo ? "Change logo" : "Upload logo"}</p>
              <p style={{ margin: "2px 0 0", fontSize: 11, color: "#6f7b74" }}>PNG, JPG · max 2 MB</p>
            </div>
          </div>
          <input ref={logoRef} type="file" accept="image/*" style={{ display: "none" }} onChange={(e) => handleLogo(e.target.files?.[0])} />
        </div>
        <Field label={<>Company name <span className="req">*</span></>}><input value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} placeholder="Acme Inc." /></Field>
        <Field label="Description"><textarea rows={3} value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} placeholder="What does your company do?" style={{ width: "100%", border: "1px solid #cbd1c9", borderRadius: 6, padding: 10, font: "14px 'DM Sans'", resize: "vertical" }} /></Field>
        <Field label="Website"><input value={form.website} onChange={(e) => setForm((f) => ({ ...f, website: e.target.value }))} placeholder="https://yourcompany.com" /></Field>
        <Field label="Industry"><input value={form.industry} onChange={(e) => setForm((f) => ({ ...f, industry: e.target.value }))} placeholder="e.g. SaaS, Fintech" /></Field>
        <Field label="Company size">
          <select value={form.size} onChange={(e) => setForm((f) => ({ ...f, size: e.target.value }))} style={{ width: "100%", border: "1px solid #cbd1c9", borderRadius: 6, padding: 10, font: "14px 'DM Sans'" }}>
            <option value="">Select size…</option>
            <option>1–10</option><option>11–50</option><option>51–200</option>
            <option>201–500</option><option>501–1000</option><option>1000+</option>
          </select>
        </Field>
        <Field label="Headquarters"><input value={form.headquarters} onChange={(e) => setForm((f) => ({ ...f, headquarters: e.target.value }))} placeholder="e.g. Bengaluru, India" /></Field>
        <div>
          <button className="submit" disabled={saving} onClick={save}>{saving ? "Saving…" : "Save changes →"}</button>
          {message && <p className="form-message" style={{ marginTop: 10 }}>{message}</p>}
        </div>
      </div>
    </section>
  );
}

function RecruiterDashboard() {
  const [data, setData] = useState(null);
  const [tab, setTab] = useState("Overview");
  const [editingJobId, setEditingJobId] = useState(null);
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

  const BLANK_JOB_FORM = { title: "", location: "", description: "", responsibilities: "", requirements: "", skills: "", salaryMin: "", salaryMax: "", experience: "", employmentType: "Full-time", workMode: "Remote", category: "Engineering", status: "published", customQuestions: [] };

  function openEditJob(job, initialStep) {
    setJobForm({
      title: job.title || "",
      location: job.location || "",
      description: job.description || "",
      responsibilities: (job.responsibilities || []).join(", "),
      requirements: (job.requirements || []).join(", "),
      skills: (job.skills || []).join(", "),
      salaryMin: job.salaryMin || "",
      salaryMax: job.salaryMax || "",
      experience: job.experience || "",
      employmentType: job.employmentType || "Full-time",
      workMode: job.workMode || "Remote",
      category: job.category || "Engineering",
      status: job.status || "published",
      customQuestions: (job.customQuestions || []).map((q) => ({ question: q.question, type: q.type || "text", required: !!q.required })),
      _initialStep: initialStep ?? 0,
    });
    setEditingJobId(job._id);
    setMessage("");
    setTab("Post a job");
  }

  async function postJob(event) {
    if (event?.preventDefault) event.preventDefault();
    const isEdit = !!editingJobId;
    setMessage(isEdit ? "Saving..." : "Publishing...");
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
    const res = isEdit
      ? await fetch(`/api/jobs/${editingJobId}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) })
      : await fetch("/api/jobs", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    const payload = await res.json();
    if (res.ok) {
      if (isEdit) {
        setData((prev) => ({ ...prev, jobs: prev.jobs.map((j) => j._id === editingJobId ? payload.job : j) }));
        setMessage("Job updated.");
      } else {
        setData((prev) => ({ ...prev, jobs: [payload.job, ...(prev?.jobs || [])] }));
        setMessage("Job published.");
      }
      setEditingJobId(null);
      setJobForm(BLANK_JOB_FORM);
    } else setMessage(payload.error || (isEdit ? "Unable to update job." : "Unable to publish job."));
  }

  async function generateDescription() {
    setMessage("Generating job description...");
    const res = await fetch("/api/ai/job-description", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ title: jobForm.title, experience: jobForm.experience, skills: csv(jobForm.skills) }) });
    const payload = await res.json();
    setJobForm((prev) => ({ ...prev, description: payload.summary || payload.description || prev.description, responsibilities: (payload.responsibilities || []).join(", "), requirements: (payload.requirements || payload.qualifications || []).join(", ") }));
    setMessage("AI draft added.");
  }

  return (
    <PortalShell role="recruiter" tabs={["Overview", "Pipeline", "Applicants", "Jobs", "Post a job", "Analytics", "Company profile"]} tab={tab} setTab={(t) => { if (t !== "Post a job") { setEditingJobId(null); setJobForm(BLANK_JOB_FORM); setMessage(""); } setTab(t); }}>
      <DashboardHeader eyebrow="Recruiter dashboard" title="Build the team that builds the future." action={<button className="portal-button" onClick={() => { setEditingJobId(null); setJobForm(BLANK_JOB_FORM); setMessage(""); setTab("Post a job"); }}>Post a job</button>} />
      <div className="stat-grid">
        <article><span>Active jobs</span><strong>{stats.activeJobs ?? 0}</strong><small>Published listings</small></article>
        <article><span>Closed jobs</span><strong>{stats.closedJobs ?? jobs.filter((job) => job.status === "closed").length}</strong><small>Archived roles</small></article>
        <article><span>Applications</span><strong>{stats.totalApplicants ?? 0}</strong><small>Received</small></article>
        <article><span>Total views</span><strong>{stats.totalViews ?? 0}</strong><small>Across all jobs</small></article>
      </div>
      {tab === "Overview" && <div className="dashboard-grid"><ApplicantsPanel applicants={applicants.slice(0, 6)} updateStatus={updateStatus} /><FunnelPanel stats={stats} /></div>}
      {tab === "Pipeline" && <PipelinePage applicants={applicants} updateStatus={updateStatus} />}
      {tab === "Applicants" && <ApplicantsPanel applicants={applicants} updateStatus={updateStatus} />}
      {tab === "Jobs" && <RecruiterJobsPanel jobs={jobs} setData={setData} onEditJob={openEditJob} />}
      {tab === "Post a job" && <JobForm form={jobForm} setForm={setJobForm} onSubmit={postJob} onGenerate={generateDescription} message={message} editingJobId={editingJobId} />}
      {tab === "Analytics" && <FunnelPanel stats={stats} full />}
      {tab === "Company profile" && <RecruiterCompanyEditor company={data?.company} onSave={(c) => setData((prev) => ({ ...prev, company: c }))} />}
    </PortalShell>
  );
}

const PIPELINE_STAGES = [
  { key: "applied",      label: "Applied",      color: "#e8eddf" },
  { key: "under_review", label: "Under Review",  color: "#fff8e1" },
  { key: "shortlisted",  label: "Shortlisted",   color: "#e8f5e9" },
  { key: "interview",    label: "Interview",     color: "#e3f2fd" },
  { key: "offered",      label: "Offered",       color: "#f3e5f5" },
  { key: "rejected",     label: "Rejected",      color: "#fde8e8" },
];

function PipelineBoard({ applicants, updateStatus, onView, scores = {} }) {
  const [dragging, setDragging] = useState(null);
  const [overCol, setOverCol] = useState(null);

  const byStage = useMemo(() => {
    const map = {};
    PIPELINE_STAGES.forEach(s => { map[s.key] = []; });
    applicants.forEach(app => { if (map[app.status]) map[app.status].push(app); else map["applied"].push(app); });
    return map;
  }, [applicants]);

  function onDragStart(app) { setDragging(app); }
  function onDragOver(e, stageKey) { e.preventDefault(); setOverCol(stageKey); }
  function onDrop(stageKey) {
    if (dragging && dragging.status !== stageKey) updateStatus(dragging._id, stageKey);
    setDragging(null); setOverCol(null);
  }

  return (
    <div className="pipeline-board">
      {PIPELINE_STAGES.map(stage => (
        <div
          key={stage.key}
          className={`pipeline-col${overCol === stage.key ? " pipeline-col-over" : ""}`}
          onDragOver={(e) => onDragOver(e, stage.key)}
          onDragLeave={() => setOverCol(null)}
          onDrop={() => onDrop(stage.key)}
        >
          <div className="pipeline-col-head" style={{ background: stage.color }}>
            <span>{stage.label}</span>
            <span className="pipeline-count">{byStage[stage.key].length}</span>
          </div>
          <div className="pipeline-cards">
            {byStage[stage.key].length === 0 && (
              <p className="pipeline-empty">Drop here</p>
            )}
            {byStage[stage.key].map(app => {
              const sc = scores[app._id];
              const scoreColor = !sc ? null : sc.score >= 70 ? "#356220" : sc.score >= 45 ? "#7a5c00" : "#9b2c2c";
              const scoreBg   = !sc ? null : sc.score >= 70 ? "#d4f7c5" : sc.score >= 45 ? "#fff8e1" : "#fde8e8";
              return (
                <div
                  key={app._id}
                  className="pipeline-card"
                  draggable
                  onDragStart={() => onDragStart(app)}
                  onClick={() => onView(app)}
                  title={sc?.reason || ""}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 6 }}>
                    <div className="pipeline-card-name">{app.name || app.candidate?.name || "Candidate"}</div>
                    {sc && (
                      <span style={{ flexShrink: 0, fontSize: 11, fontWeight: 700, background: scoreBg, color: scoreColor, padding: "2px 7px", borderRadius: 4 }}>
                        {sc.score}
                      </span>
                    )}
                  </div>
                  <div className="pipeline-card-job">{app.job?.title || "—"}</div>
                  <div className="pipeline-card-meta">{new Date(app.createdAt).toLocaleDateString()}</div>
                  {sc && <div style={{ fontSize: 10, color: scoreColor, marginTop: 4, fontStyle: "italic" }}>{sc.reason}</div>}
                  {(app.resumeUrl || app.candidate?.resumeUrl) && (
                    <span className="pipeline-card-badge">📄 Resume</span>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}

function PipelinePage({ applicants, updateStatus }) {
  const [selected, setSelected] = useState(null);
  const [jobFilter, setJobFilter] = useState("all");
  const [scores, setScores] = useState({});       // { appId: { score, verdict, reason } }
  const [threshold, setThreshold] = useState(70);
  const [screening, setScreening] = useState(false);
  const [screenMsg, setScreenMsg] = useState("");

  const jobs = useMemo(() => {
    const seen = new Set();
    return applicants.reduce((acc, a) => {
      const id = a.job?._id;
      if (id && !seen.has(id)) { seen.add(id); acc.push({ _id: id, title: a.job.title }); }
      return acc;
    }, []);
  }, [applicants]);

  const filtered = jobFilter === "all" ? applicants : applicants.filter(a => a.job?._id === jobFilter);

  async function runAutoScreen(autoMove) {
    setScreening(true);
    setScreenMsg(autoMove ? "Scoring & moving candidates…" : "Scoring candidates…");
    const ids = filtered.map(a => a._id);
    const res = await fetch("/api/ai/screen", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ applicationIds: ids, threshold, autoMove }),
    });
    const data = await res.json();
    if (res.ok) {
      const map = {};
      data.results.forEach(r => { map[r.applicationId] = r; });
      setScores(map);
      if (autoMove) {
        // Reflect moves in local state
        data.results.forEach(r => {
          const app = filtered.find(a => a._id === r.applicationId);
          if (!app) return;
          const newStatus = r.score >= threshold ? "shortlisted" : r.score >= threshold * 0.6 ? "under_review" : "applied";
          if (newStatus !== app.status) updateStatus(r.applicationId, newStatus);
        });
        setScreenMsg(`Done — ${data.results.filter(r => r.score >= threshold).length} candidates auto-shortlisted.`);
      } else {
        setScreenMsg(`Scored ${data.results.length} candidates.`);
      }
    } else {
      setScreenMsg(data.error || "Screening failed.");
    }
    setScreening(false);
  }

  return (
    <section className="panel" style={{ overflow: "visible" }}>
      <div className="panel-top" style={{ flexWrap: "wrap", gap: 12 }}>
        <div>
          <h2>Hiring pipeline</h2>
          <span>Drag cards between stages · AI auto-screen below</span>
        </div>
        <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
          {jobs.length > 1 && (
            <select value={jobFilter} onChange={e => setJobFilter(e.target.value)} style={{ border: "1px solid #cbd1c9", borderRadius: 6, padding: "8px 12px", font: "13px 'DM Sans'", background: "#fff" }}>
              <option value="all">All jobs</option>
              {jobs.map(j => <option key={j._id} value={j._id}>{j.title}</option>)}
            </select>
          )}
        </div>
      </div>

      {/* Auto-screen bar */}
      <div className="autoscreen-bar">
        <span className="autoscreen-label">✦ AI Auto-screen</span>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ fontSize: 12, color: "#526237" }}>Shortlist threshold</span>
          <input
            type="number" min={0} max={100} value={threshold}
            onChange={e => setThreshold(Number(e.target.value))}
            style={{ width: 60, border: "1px solid #ccd9a6", borderRadius: 6, padding: "6px 8px", font: "13px 'DM Sans'", textAlign: "center" }}
          />
          <span style={{ fontSize: 12, color: "#526237" }}>/ 100</span>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <button className="autoscreen-btn" disabled={screening || !filtered.length} onClick={() => runAutoScreen(false)}>
            {screening ? "Scoring…" : "Score only"}
          </button>
          <button className="autoscreen-btn autoscreen-btn-primary" disabled={screening || !filtered.length} onClick={() => runAutoScreen(true)}>
            {screening ? "Moving…" : "Score & auto-move"}
          </button>
        </div>
        {screenMsg && <span style={{ fontSize: 12, color: "#41531a", fontWeight: 600 }}>{screenMsg}</span>}
      </div>

      {filtered.length === 0
        ? <EmptyState>No applicants yet.</EmptyState>
        : <PipelineBoard applicants={filtered} updateStatus={updateStatus} onView={setSelected} scores={scores} />}
      <ApplicantModal
        app={selected}
        updateStatus={(id, status) => { updateStatus(id, status); setSelected(p => p?._id === id ? { ...p, status } : p); }}
        onClose={() => setSelected(null)}
      />
    </section>
  );
}

function ApplicantModal({ app, updateStatus, onClose }) {
  if (!app) return null;
  return (
    <div className="applicant-modal-backdrop" onClick={onClose}>
      <div className="applicant-modal" onClick={(e) => e.stopPropagation()}>
        <button className="applicant-modal-close" onClick={onClose}>✕</button>
        <ApplicantDetailCard app={app} updateStatus={updateStatus} />
      </div>
    </div>
  );
}

function ApplicantsPanel({ applicants, updateStatus }) {
  const [selected, setSelected] = useState(null);
  return (
    <section className="panel">
      <div className="panel-top">
        <div>
          <h2>Applicants</h2>
          <span>{applicants.length} total</span>
        </div>
        <button className="portal-button secondary" type="button" onClick={() => downloadApplicantsCsv(applicants)} disabled={applicants.length === 0}>
          Export CSV
        </button>
      </div>
      {applicants.length === 0 ? <EmptyState>No applicants yet.</EmptyState> : (
        <div className="table applicant-table">
          <div className="table-row applicant-table-head">
            <span>Candidate</span>
            <span>Job</span>
            <span>Applied</span>
            <span>Status</span>
            <span></span>
          </div>
          {applicants.map((app) => (
            <div className="table-row" key={app._id}>
              <span style={{ fontWeight: 600 }}>{app.name || app.candidate?.name || "—"}</span>
              <span>{app.job?.title || "—"}</span>
              <span>{new Date(app.createdAt).toLocaleDateString()}</span>
              <Badge status={app.status} />
              <span>
                <button onClick={() => setSelected(app)} style={{ background: "#18251f", color: "#fff", border: "none", borderRadius: 6, padding: "6px 12px", font: "600 12px 'DM Sans'", cursor: "pointer" }}>View</button>
              </span>
            </div>
          ))}
        </div>
      )}
      <ApplicantModal
        app={selected}
        updateStatus={(id, status) => { updateStatus(id, status); setSelected((prev) => prev && prev._id === id ? { ...prev, status } : prev); }}
        onClose={() => setSelected(null)}
      />
    </section>
  );
}

function RecruiterJobsPanel({ jobs, setData, onEditJob }) {
  async function patchJob(jobId, body) {
    const res = await fetch(`/api/jobs/${jobId}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    const payload = await res.json();
    if (res.ok) setData((prev) => ({ ...prev, jobs: prev.jobs.map((job) => job._id === jobId ? payload.job : job) }));
    return res.ok;
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
            <div key={job._id}>
              <div className="table-row">
                <span>{job.title}</span>
                <span>{job.location}</span>
                <Badge status={job.status} />
                <span className="row-actions">
                  <button onClick={() => onEditJob(job, 0)}>Edit job</button>
                  <button onClick={() => onEditJob(job, 2)}>
                    Questions {(job.customQuestions || []).length > 0 ? `(${job.customQuestions.length})` : "(0)"}
                  </button>
                  <button onClick={() => patchJob(job._id, { status: job.status === "closed" ? "published" : "closed" })}>{job.status === "closed" ? "Publish" : "Close"}</button>
                  <button onClick={() => deleteJob(job._id)}>Delete</button>
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

const JOB_STEPS = ["Job details", "Description", "Screening questions"];

function JobForm({ form, setForm, onSubmit, onGenerate, message, editingJobId }) {
  const [step, setStep] = useState(0);
  const questions = form.customQuestions || [];
  const currentLabel = JOB_STEPS[step];

  // Reset step when form is cleared after publish, or jump to initialStep when editing
  useEffect(() => {
    if (!form.title && !form.location) { setStep(0); return; }
    if (form._initialStep !== undefined) { setStep(form._initialStep); setForm((f) => { const { _initialStep, ...rest } = f; return rest; }); }
  }, [form.title, form.location, form._initialStep]);

  function addQuestion() {
    setForm({ ...form, customQuestions: [...questions, { question: "", type: "text", required: false }] });
  }
  function updateQuestion(i, patch) {
    setForm({ ...form, customQuestions: questions.map((q, j) => j === i ? { ...q, ...patch } : q) });
  }
  function removeQuestion(i) {
    setForm({ ...form, customQuestions: questions.filter((_, j) => j !== i) });
  }

  function canAdvance() {
    if (currentLabel === "Job details") return form.title.trim() && form.location.trim();
    return true;
  }

  return (
    <section className="panel form-panel">
      <div className="panel-top"><h2>{editingJobId ? "Edit job" : "Create job"}</h2></div>
      <div className="job-form-shell">
        {/* Step sidebar */}
        <aside className="job-form-sidebar">
          <div className="apply-progress">
            {JOB_STEPS.map((label, i) => (
              <div key={label} className={`apply-progress-step ${i === step ? "active" : ""} ${i < step ? "done" : ""}`}>
                <span className="apply-progress-dot">{i < step ? "✓" : i + 1}</span>
                <span>{label}</span>
              </div>
            ))}
          </div>
        </aside>

        {/* Form area */}
        <div className="job-form-area">
          <form id="job-form" onSubmit={onSubmit}>
            <div className="apply-form-header">
              <p className="eyebrow">Step {step + 1} of {JOB_STEPS.length}</p>
              <h2 style={{ font: "600 22px/1.1 'Fraunces'", letterSpacing: "-0.4px", margin: "4px 0 0" }}>{currentLabel}</h2>
            </div>

          {/* Step 0 — Job details */}
          {currentLabel === "Job details" && (
            <div className="apply-fields">
              <Field label={<>Title <span className="req">*</span></>}><input required value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="e.g. Senior Frontend Engineer" /></Field>
              <Field label={<>Location <span className="req">*</span></>}><input required value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} placeholder="e.g. Bangalore / Remote" /></Field>
              <Field label="Employment type"><select value={form.employmentType} onChange={(e) => setForm({ ...form, employmentType: e.target.value })}>{["Full-time","Part-time","Contract","Internship"].map((t) => <option key={t}>{t}</option>)}</select></Field>
              <Field label="Work mode"><select value={form.workMode} onChange={(e) => setForm({ ...form, workMode: e.target.value })}>{["Remote","Hybrid","Onsite"].map((t) => <option key={t}>{t}</option>)}</select></Field>
              <Field label="Salary min"><input value={form.salaryMin} onChange={(e) => setForm({ ...form, salaryMin: e.target.value })} placeholder="e.g. 800000" /></Field>
              <Field label="Salary max"><input value={form.salaryMax} onChange={(e) => setForm({ ...form, salaryMax: e.target.value })} placeholder="e.g. 1500000" /></Field>
              <Field label="Experience required"><input value={form.experience} onChange={(e) => setForm({ ...form, experience: e.target.value })} placeholder="e.g. 2–4 years" /></Field>
            </div>
          )}

          {/* Step 1 — Description */}
          {currentLabel === "Description" && (
            <div className="apply-fields">
              <div style={{ gridColumn: "1/-1", display: "flex", justifyContent: "flex-end" }}>
                <button type="button" className="ai-gen-btn" onClick={onGenerate}>✦ AI generate</button>
              </div>
              <div style={{ gridColumn: "1/-1" }}><Field label="Description"><textarea rows={4} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Describe the role and team…" /></Field></div>
              <div style={{ gridColumn: "1/-1" }}><Field label="Responsibilities"><input value={form.responsibilities} onChange={(e) => setForm({ ...form, responsibilities: e.target.value })} placeholder="Comma-separated" /></Field></div>
              <div style={{ gridColumn: "1/-1" }}><Field label="Requirements"><input value={form.requirements} onChange={(e) => setForm({ ...form, requirements: e.target.value })} placeholder="Comma-separated" /></Field></div>
              <div style={{ gridColumn: "1/-1" }}><Field label="Skills"><input value={form.skills} onChange={(e) => setForm({ ...form, skills: e.target.value })} placeholder="React, MongoDB, APIs" /></Field></div>
            </div>
          )}

          {/* Step 2 — Screening questions */}
          {currentLabel === "Screening questions" && (
            <div className="cq-section">
              <div className="cq-header">
                <span>Questions <em>({questions.length})</em></span>
                <button type="button" onClick={addQuestion}>+ Add question</button>
              </div>
              {questions.length === 0 && <p style={{ fontSize: 13, color: "var(--muted)", margin: "8px 0" }}>No screening questions yet. Add one or skip to publish.</p>}
              {questions.map((q, i) => (
                <div className="cq-row" key={i}>
                  <input className="cq-input" value={q.question} onChange={(e) => updateQuestion(i, { question: e.target.value })} placeholder={`Question ${i + 1}`} />
                  <select value={q.type} onChange={(e) => updateQuestion(i, { type: e.target.value })}>
                    <option value="text">Short text</option>
                    <option value="textarea">Long text</option>
                    <option value="yesno">Yes / No</option>
                  </select>
                  <label className="cq-required"><input type="checkbox" checked={q.required} onChange={(e) => updateQuestion(i, { required: e.target.checked })} />Required</label>
                  <button type="button" className="cq-remove" onClick={() => removeQuestion(i)}>✕</button>
                </div>
              ))}
            </div>
          )}

          {/* Navigation */}
          <div className="apply-nav">
            {step > 0 && <button type="button" className="apply-back" onClick={() => setStep(step - 1)}>← Back</button>}
            {step < JOB_STEPS.length - 1
              ? <button type="button" className="submit apply-next" disabled={!canAdvance()} onClick={() => setStep(step + 1)}>Continue →</button>
              : <button type="button" className="submit apply-next" onClick={(e) => { e.preventDefault(); onSubmit(e); }}>{editingJobId ? "Save changes →" : "Publish job →"}</button>}
          </div>
          {message && <p className="form-message">{message}</p>}
          </form>
        </div>
      </div>
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
      <DashboardHeader eyebrow="Admin panel" title="Platform control center." action={<a className="portal-button" href="/">Browse jobs</a>} />
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

function UserCard({ user, role, compact }) {
  const initials = user?.name
    ? user.name.split(" ").map((w) => w[0]).slice(0, 2).join("").toUpperCase()
    : role[0].toUpperCase();
  return (
    <div className={compact ? "user-card user-card-compact" : "user-card"}>
      <div className="user-avatar">
        {user?.avatar
          ? <img src={user.avatar} alt={user.name} />
          : <span>{initials}</span>}
      </div>
      <div className="user-card-info">
        <strong>{user?.name || "User"}</strong>
        <span>{user?.email || role}</span>
      </div>
    </div>
  );
}

function PortalShell({ role, tabs, tab, setTab, user: userProp, children }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [accountOpen, setAccountOpen] = useState(false);
  const [fetchedUser, setFetchedUser] = useState(null);
  const user = userProp ?? fetchedUser;

  useEffect(() => {
    if (!userProp) fetch("/api/profile").then((r) => r.json()).then((p) => setFetchedUser(p.user || null));
  }, [userProp]);

  function navigate(item) {
    setTab(item);
    setMenuOpen(false);
  }

  const navIcons = {
    Overview: "🏠",
    Pipeline: "🗂️",
    Applicants: "👥",
    Jobs: "💼",
    "Post a job": "➕",
    Analytics: "📊",
    "Saved jobs": "💾",
    Notifications: "🔔",
    Profile: "👤",
    "Company profile": "🏢",
  };

  return (
    <main className="portal" onClick={() => setAccountOpen(false)}>
      {/* mobile top bar */}
      <nav className="mobile-nav">
        <span className="mobile-nav-title">{tab}</span>
        <div className="mobile-nav-right">
          <div className="account-wrap" onClick={(e) => e.stopPropagation()}>
            <button className="account-trigger" onClick={() => setAccountOpen((o) => !o)} aria-label="Account">
              <div className="user-avatar user-avatar-sm">
                {user?.avatar
                  ? <img src={user.avatar} alt={user.name} />
                  : <span>{user?.name ? user.name[0].toUpperCase() : role[0].toUpperCase()}</span>}
              </div>
            </button>
            {accountOpen && (
              <div className="account-menu">
                <UserCard user={user} role={role} />
                <div className="account-menu-links">
                  <a href="/api/auth/logout">Logout</a>
                  <a href="/">Back to site</a>
                </div>
              </div>
            )}
          </div>
          <button className="hamburger" onClick={() => setMenuOpen((o) => !o)} aria-label="Menu">
            <span /><span /><span />
          </button>
        </div>
      </nav>

      {menuOpen && <div className="drawer-overlay" onClick={() => setMenuOpen(false)} />}

      {/* sidebar / drawer */}
      <aside className={menuOpen ? "drawer-open" : ""}>
        <p className="portal-label">{role} workspace</p>
        {tabs.map((item) => (
          <button key={item} className={tab === item ? "side-active" : ""} onClick={() => navigate(item)}>{item}</button>
        ))}
      </aside>

      <section className="portal-content">{children}</section>
      <nav className="mobile-bottom-nav">
        {tabs.map((item) => (
          <button
            key={item}
            type="button"
            className={tab === item ? "bottom-active" : ""}
            onClick={() => navigate(item)}
          >
            <span className="bottom-icon">{navIcons[item] || "•"}</span>
            <span>{item}</span>
          </button>
        ))}
      </nav>
    </main>
  );
}

export default function PortalDashboard({ role }) {
  if (role === "candidate") return <CandidateDashboard />;
  if (role === "recruiter") return <RecruiterDashboard />;
  return <AdminDashboard />;
}
