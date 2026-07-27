"use client";
import { useEffect, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";

const BASE_STEPS = ["Your details", "Background", "Resume", "Cover letter", "Review & submit"];

function summarizeValue(value) {
  if (!value) return "";
  if (Array.isArray(value)) {
    return value
      .map((item) => (typeof item === "string" ? item : summarizeValue(item)))
      .filter(Boolean)
      .join("; ");
  }
  if (typeof value === "object") {
    return Object.entries(value)
      .filter(([, nestedValue]) => nestedValue !== undefined && nestedValue !== null && nestedValue !== "")
      .map(([key, nestedValue]) => `${key}: ${Array.isArray(nestedValue) ? nestedValue.join(", ") : String(nestedValue)}`)
      .join("; ");
  }
  return String(value);
}

const EMPTY_EXP = () => ({ type: "", role: "", company: "", duration: "", summary: "" });
const EMPTY_EDU = () => ({ level: "", institution: "", year: "" });

function pickBackground(user) {
  const exps = Array.isArray(user?.experience) ? user.experience : (user?.experience ? [user.experience] : []);
  const edus = Array.isArray(user?.education) ? user.education : (user?.education ? [user.education] : []);
  return {
    experiences: exps.length ? exps.map((e) => ({
      type: e.type || e.employmentType || "",
      role: e.title || e.role || "",
      company: e.company || "",
      duration: e.duration || e.period || "",
      summary: e.summary || "",
    })) : [EMPTY_EXP()],
    educations: edus.length ? edus.map((e) => ({
      level: e.degree || e.level || "",
      institution: e.institution || e.school || "",
      year: e.year || e.graduationYear || "",
    })) : [EMPTY_EDU()],
    govtIdType: "",
    govtIdNumber: "",
    certifications: Array.isArray(user?.certifications) ? user.certifications : [],
  };
}

export default function ApplyPage() {
  const { id } = useParams();
  const router = useRouter();

  const [job, setJob] = useState(null);
  const [loading, setLoading] = useState(true);
  const [step, setStep] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(null);

  // Form state — pre-filled from profile
  const [details, setDetails] = useState({ name: "", email: "", phone: "", govtId: "", linkedinUrl: "", portfolioLink: "" });
  const [resume, setResume] = useState({ url: "", fileName: "", dragging: false });
  const [coverLetter, setCoverLetter] = useState("");
  const [generating, setGenerating] = useState(false);
  const [answers, setAnswers] = useState([]);
  const [background, setBackground] = useState(pickBackground({}));
  const [certInput, setCertInput] = useState("");
  const fileRef = useRef();

  useEffect(() => {
    async function load() {
      const [jobRes, profileRes, appRes] = await Promise.all([
        fetch(`/api/jobs/${id}`),
        fetch("/api/profile"),
        fetch(`/api/applications?jobId=${id}`),
      ]);
      const jobData = await jobRes.json();
      const profileData = profileRes.ok ? await profileRes.json() : {};
      const appData = appRes.ok ? await appRes.json() : {};

      const j = jobData.job;
      const u = profileData.user || {};

      if (appData.application) {
        setJob(j);
        setDone({ success: true, ref: appData.application._id, existing: true });
        setLoading(false);
        return;
      }

      setJob(j);
      setDetails({
        name: u.name || "",
        email: u.email || "",
        phone: u.phone || "",
        govtId: "",
        linkedinUrl: u.portfolio?.linkedin || "",
        portfolioLink: u.portfolio?.website || u.portfolio?.github || "",
      });
      if (u.resumeUrl) setResume({ url: u.resumeUrl, fileName: "Profile resume", dragging: false });
      const bg = pickBackground(u);
      setBackground(bg);
      setAnswers((j?.customQuestions || []).map((q) => ({ questionId: String(q._id?.$oid || q._id), question: q.question, answer: "" })));
      setLoading(false);
    }
    load();
  }, [id]);

  const questions = job?.customQuestions || [];
  const qId = (q) => String(q._id?.$oid || q._id);
  const steps = questions.length > 0 ? [...BASE_STEPS.slice(0, 4), "Questions", BASE_STEPS[4]] : BASE_STEPS;
  const totalSteps = steps.length;
  const currentLabel = steps[step];

  function handleFile(file) {
    if (!file) return;
    if (file.type !== "application/pdf") { alert("Please upload a PDF file."); return; }
    if (file.size > 5 * 1024 * 1024) { alert("File must be under 5 MB."); return; }
    const reader = new FileReader();
    reader.onload = () => setResume({ url: reader.result, fileName: file.name, dragging: false });
    reader.readAsDataURL(file);
  }

  async function generateCoverLetter() {
    setGenerating(true);
    try {
      const profileRes = await fetch("/api/profile");
      const { user } = profileRes.ok ? await profileRes.json() : { user: {} };
      const res = await fetch("/api/ai/cover-letter", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role: job.title, experience: user?.experience || "", skills: user?.skills || job.skills || [] }),
      });
      const data = await res.json();
      if (data.coverLetter) setCoverLetter(data.coverLetter);
    } finally {
      setGenerating(false);
    }
  }

  function canAdvance() {
    if (currentLabel === "Your details") return details.name.trim() && details.email.trim();
    if (currentLabel === "Questions") return questions.every((q) => !q.required || answers.find(a => a.questionId === qId(q))?.answer?.trim());
    return true;
  }

  function submitBackground(event) {
    event.preventDefault();
  }

  const experiencePayload = background.experiences.filter((e) => e.role || e.company);
  const educationPayload = background.educations.filter((e) => e.level || e.institution);
  const govtIdPayload = background.govtIdNumber ? { type: background.govtIdType, number: background.govtIdNumber } : undefined;

  async function submit() {
    setSubmitting(true);
    const res = await fetch("/api/applications", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        jobId: job._id,
        ...details,
        resumeUrl: resume.url || undefined,
        resumeFileName: resume.fileName || undefined,
        coverLetter: coverLetter || undefined,
        experience: experiencePayload.length ? experiencePayload : undefined,
        education: educationPayload.length ? educationPayload : undefined,
        govtId: govtIdPayload,
        certifications: background.certifications.length ? background.certifications : undefined,
        answers: answers.filter((a) => a.answer.trim()),
      }),
    });
    const data = await res.json();
    setSubmitting(false);
    setDone(res.ok ? { success: true, ref: data.applicationId } : { success: false, error: data.error });
  }

  if (loading) return (
    <main className="apply-page">
      <nav className="nav shell">
        <a className="brand" href="/"><span>✦</span> TalentLoop</a>
      </nav>
      <div className="shell apply-shell">
        <div className="apply-skeleton" />
      </div>
    </main>
  );

  const company = job?.company || {};

  if (done) return (
    <main className="apply-page">
      <nav className="nav shell">
        <a className="brand" href="/"><span>✦</span> TalentLoop</a>
      </nav>
      <div className="shell apply-done-shell">
        <div className="apply-done-page">
          {done.success ? (
            <>
              <div className="apply-done-icon">✓</div>
              <h1>Application submitted!</h1>
              <p>Reference: <strong>{done.ref}</strong></p>
              <p>{done.existing ? "You have already applied for this role. We'll notify you when the recruiter reviews your application." : "You'll receive updates in your notifications when the recruiter reviews your application."}</p>
              <div style={{ display: "flex", gap: 12, justifyContent: "center", marginTop: 8 }}>
                <a className="submit" href="/dashboard/candidate">View my applications</a>
                <a href="/" style={{ padding: "13px 18px", border: "1px solid var(--line)", borderRadius: 7, font: "600 14px DM Sans", color: "var(--ink)", textDecoration: "none" }}>Browse more jobs</a>
              </div>
            </>
          ) : (
            <>
              <div className="apply-done-icon" style={{ background: "#fde8e8", color: "#9b2c2c" }}>✕</div>
              <h1>Submission failed</h1>
              <p style={{ color: "#9b2c2c" }}>{done.error}</p>
              <button className="submit" onClick={() => setDone(null)}>Try again</button>
            </>
          )}
        </div>
      </div>
    </main>
  );

  return (
    <main className="apply-page">
    

      <div className="shell apply-shell">
        {/* Left: job summary */}
        <aside className="apply-job-card">
          {company.logo
            ? <img src={company.logo} alt={company.name} style={{ width: 52, height: 52, objectFit: "contain", borderRadius: 10, border: "1px solid var(--line)", background: "#fff", marginBottom: 4 }} />
            : <div className="apply-job-initials">{(company.name || "?").slice(0, 2).toUpperCase()}</div>}
          <h2>{job.title}</h2>
          <p className="apply-job-meta">{company.name} · {job.location}</p>
          {job.employmentType && <span className="apply-job-tag">{job.employmentType}</span>}
          {job.workMode && <span className="apply-job-tag">{job.workMode}</span>}
          {job.salaryMin && (
            <p className="apply-job-salary">₹{(job.salaryMin / 100000).toFixed(0)}L – ₹{(job.salaryMax / 100000).toFixed(0)}L</p>
          )}
          {job.skills?.length > 0 && (
            <div style={{ marginTop: 16 }}>
              <p style={{ fontSize: 11, fontWeight: 600, color: "var(--muted)", margin: "0 0 8px", textTransform: "uppercase", letterSpacing: "0.8px" }}>Skills</p>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                {job.skills.map((s) => <span key={s} style={{ background: "#eef0ea", padding: "4px 8px", borderRadius: 4, fontSize: 11, color: "#5b6660" }}>{s}</span>)}
              </div>
            </div>
          )}
          {/* Step progress on sidebar */}
          <div className="apply-progress">
            {steps.map((label, i) => (
              <div key={label} className={`apply-progress-step ${i === step ? "active" : ""} ${i < step ? "done" : ""}`}>
                <span className="apply-progress-dot">{i < step ? "✓" : i + 1}</span>
                <span>{label}</span>
              </div>
            ))}
          </div>
        </aside>

        {/* Right: form */}
        <div className="apply-form-area">
          <div className="apply-form-card">
            <div className="apply-form-header">
              <p className="eyebrow">Step {step + 1} of {totalSteps}</p>
              <h1>{currentLabel}</h1>
              {currentLabel === "Your details" && (
                <p style={{ fontSize: 13, color: "var(--muted)", margin: "6px 0 0" }}>
                  Pre-filled from your profile. Edit anything before continuing.
                </p>
              )}
            </div>

            {/* ── Step: Your details ── */}
            {currentLabel === "Your details" && (
              <div className="apply-fields">
                <label>
                  Full name <span className="req">*</span>
                  <input value={details.name} onChange={(e) => setDetails({ ...details, name: e.target.value })} placeholder="Jane Smith" />
                </label>
                <label>
                  Email address <span className="req">*</span>
                  <input type="email" value={details.email} onChange={(e) => setDetails({ ...details, email: e.target.value })} placeholder="jane@example.com" />
                </label>
                <label>
                  Phone number
                  <input type="tel" value={details.phone} onChange={(e) => setDetails({ ...details, phone: e.target.value })} placeholder="+91 98765 43210" />
                </label>
                <label>
                  LinkedIn URL
                  <input value={details.linkedinUrl} onChange={(e) => setDetails({ ...details, linkedinUrl: e.target.value })} placeholder="https://linkedin.com/in/..." />
                </label>
                <label style={{ gridColumn: "1/-1" }}>
                  Portfolio / website
                  <input value={details.portfolioLink} onChange={(e) => setDetails({ ...details, portfolioLink: e.target.value })} placeholder="https://..." />
                </label>
              </div>
            )}

            {/* ── Step: Background ── */}
            {currentLabel === "Background" && (
              <form onSubmit={submitBackground}>

                {/* Experience entries */}
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
                      <label>
                        Experience type
                        <select value={exp.type} onChange={(e) => setBackground((b) => { const a = [...b.experiences]; a[idx] = { ...a[idx], type: e.target.value }; return { ...b, experiences: a }; })} className="apply-select">
                          <option value="">Select type…</option>
                          <option>Full-time</option>
                          <option>Internship</option>
                          <option>Contract</option>
                          <option>Freelance</option>
                        </select>
                      </label>
                      <label>
                        Role / title
                        <input value={exp.role} onChange={(e) => setBackground((b) => { const a = [...b.experiences]; a[idx] = { ...a[idx], role: e.target.value }; return { ...b, experiences: a }; })} placeholder="Software Engineer" />
                      </label>
                      <label>
                        Company / organization
                        <input value={exp.company} onChange={(e) => setBackground((b) => { const a = [...b.experiences]; a[idx] = { ...a[idx], company: e.target.value }; return { ...b, experiences: a }; })} placeholder="Acme Inc." />
                      </label>
                      <label>
                        Duration
                        <input value={exp.duration} onChange={(e) => setBackground((b) => { const a = [...b.experiences]; a[idx] = { ...a[idx], duration: e.target.value }; return { ...b, experiences: a }; })} placeholder="Jan 2024 - Present" />
                      </label>
                      <label style={{ gridColumn: "1/-1" }}>
                        Experience summary
                        <textarea rows={3} className="apply-textarea" value={exp.summary} onChange={(e) => setBackground((b) => { const a = [...b.experiences]; a[idx] = { ...a[idx], summary: e.target.value }; return { ...b, experiences: a }; })} placeholder="Briefly describe your experience." />
                      </label>
                    </div>
                  </div>
                ))}

                {/* Education entries */}
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
                      <label>
                        Highest education
                        <input value={edu.level} onChange={(e) => setBackground((b) => { const a = [...b.educations]; a[idx] = { ...a[idx], level: e.target.value }; return { ...b, educations: a }; })} placeholder="B.Tech Computer Science" />
                      </label>
                      <label>
                        Institution
                        <input value={edu.institution} onChange={(e) => setBackground((b) => { const a = [...b.educations]; a[idx] = { ...a[idx], institution: e.target.value }; return { ...b, educations: a }; })} placeholder="University / college name" />
                      </label>
                      <label>
                        Graduation year
                        <input value={edu.year} onChange={(e) => setBackground((b) => { const a = [...b.educations]; a[idx] = { ...a[idx], year: e.target.value }; return { ...b, educations: a }; })} placeholder="2025" />
                      </label>
                    </div>
                  </div>
                ))}

                {/* Govt ID */}
                <div className="bg-section-header" style={{ marginTop: 24 }}><span>Government ID</span></div>
                <div className="apply-fields">
                  <label>
                    Govt ID type
                    <select value={background.govtIdType} onChange={(e) => setBackground({ ...background, govtIdType: e.target.value })} className="apply-select">
                      <option value="">Select type…</option>
                      <option>Aadhaar</option>
                      <option>PAN</option>
                      <option>Passport</option>
                      <option>Driving License</option>
                    </select>
                  </label>
                  <label>
                    Govt ID number
                    <input value={background.govtIdNumber} onChange={(e) => setBackground({ ...background, govtIdNumber: e.target.value })} placeholder="Enter the number" />
                  </label>
                </div>

                {/* Certifications */}
                <div className="bg-section-header" style={{ marginTop: 24 }}><span>Certifications</span></div>
                <div className="bg-cert-input-row">
                  <input
                    className="bg-cert-input"
                    value={certInput}
                    onChange={(e) => setCertInput(e.target.value)}
                    onKeyDown={(e) => {
                      if ((e.key === "Enter" || e.key === ",") && certInput.trim()) {
                        e.preventDefault();
                        setBackground((b) => ({ ...b, certifications: [...b.certifications, certInput.trim()] }));
                        setCertInput("");
                      }
                    }}
                    placeholder="Type and press Enter to add…"
                  />
                  <button type="button" className="bg-add-btn" onClick={() => {
                    if (!certInput.trim()) return;
                    setBackground((b) => ({ ...b, certifications: [...b.certifications, certInput.trim()] }));
                    setCertInput("");
                  }}>+ Add</button>
                </div>
                {background.certifications.length > 0 && (
                  <div className="bg-cert-tags">
                    {background.certifications.map((c, i) => (
                      <span key={i} className="bg-cert-tag">
                        {c}
                        <button type="button" onClick={() => setBackground((b) => ({ ...b, certifications: b.certifications.filter((_, j) => j !== i) }))}>✕</button>
                      </span>
                    ))}
                  </div>
                )}

              </form>
            )}

            {/* ── Step: Resume ── */}
            {currentLabel === "Resume" && (
              <div>
                {resume.fileName && resume.fileName === "Profile resume" && (
                  <div className="apply-prefill-notice">
                    <span>✓</span> Resume loaded from your profile. Upload a new one to replace it.
                  </div>
                )}
                <div
                  className={`apply-dropzone ${resume.dragging ? "dragging" : ""} ${resume.fileName ? "has-file" : ""}`}
                  onDragOver={(e) => { e.preventDefault(); setResume((r) => ({ ...r, dragging: true })); }}
                  onDragLeave={() => setResume((r) => ({ ...r, dragging: false }))}
                  onDrop={(e) => { e.preventDefault(); handleFile(e.dataTransfer.files?.[0]); }}
                  onClick={() => fileRef.current?.click()}
                >
                  {resume.fileName ? (
                    <>
                      <span className="apply-dropzone-icon">📄</span>
                      <strong>{resume.fileName}</strong>
                      <span style={{ fontSize: 12, color: "var(--muted)" }}>Click to replace</span>
                    </>
                  ) : (
                    <>
                      <span className="apply-dropzone-icon">⬆</span>
                      <strong>Drag & drop your resume PDF</strong>
                      <span style={{ fontSize: 12, color: "var(--muted)" }}>or click to browse · max 5 MB</span>
                    </>
                  )}
                  <input ref={fileRef} type="file" accept="application/pdf" style={{ display: "none" }} onChange={(e) => handleFile(e.target.files?.[0])} />
                </div>
                {resume.fileName && (
                  <button type="button" className="apply-remove-btn" onClick={() => setResume({ url: "", fileName: "", dragging: false })}>Remove file</button>
                )}
                <label className="apply-url-label">
                  Or paste a hosted resume URL
                  <input
                    value={resume.url.startsWith("data:") ? "" : resume.url}
                    onChange={(e) => setResume({ url: e.target.value, fileName: "", dragging: false })}
                    placeholder="https://drive.google.com/..."
                  />
                </label>
              </div>
            )}

            {/* ── Step: Cover letter ── */}
            {currentLabel === "Cover letter" && (
              <div>
                <div className="apply-cl-header">
                  <p style={{ fontSize: 13, color: "var(--muted)", margin: 0 }}>Write a tailored cover letter or let AI draft one based on your profile and this role.</p>
                  <button className="ai-gen-btn" onClick={generateCoverLetter} disabled={generating}>
                    {generating ? "Generating…" : "✦ AI generate"}
                  </button>
                </div>
                <textarea
                  className="apply-textarea"
                  rows={14}
                  value={coverLetter}
                  onChange={(e) => setCoverLetter(e.target.value)}
                  placeholder={`Dear Hiring Team,\n\nI'm excited to apply for the ${job.title} position at ${company.name}…`}
                />
                <p style={{ fontSize: 11, color: "var(--muted)", margin: "6px 0 0" }}>{coverLetter.length} characters</p>
              </div>
            )}

            {/* ── Step: Questions ── */}
            {currentLabel === "Questions" && (
              <div style={{ display: "flex", flexDirection: "column", gap: 22 }}>
                <p style={{ fontSize: 13, color: "var(--muted)", margin: 0 }}>
                  {company.name} has added {questions.length} screening question{questions.length > 1 ? "s" : ""} for this role.
                </p>
                {questions.map((q, i) => (
                  <label key={qId(q)} style={{ display: "grid", gap: 8, fontSize: 14, fontWeight: 600, color: "var(--ink)" }}>
                    {i + 1}. {q.question} {q.required && <span className="req">*</span>}
                    {q.type === "yesno" ? (
                      <select
                        value={answers.find(a => a.questionId === qId(q))?.answer || ""}
                        onChange={(e) => setAnswers(answers.map((a) => a.questionId === qId(q) ? { ...a, answer: e.target.value } : a))}
                        className="apply-select"
                      >
                        <option value="">Select an answer…</option>
                        <option value="Yes">Yes</option>
                        <option value="No">No</option>
                      </select>
                    ) : q.type === "textarea" ? (
                      <textarea
                        rows={4}
                        value={answers.find(a => a.questionId === qId(q))?.answer || ""}
                        onChange={(e) => setAnswers(answers.map((a) => a.questionId === qId(q) ? { ...a, answer: e.target.value } : a))}
                        className="apply-textarea"
                        style={{ resize: "vertical" }}
                      />
                    ) : (
                      <input
                        value={answers.find(a => a.questionId === qId(q))?.answer || ""}
                        onChange={(e) => setAnswers(answers.map((a) => a.questionId === qId(q) ? { ...a, answer: e.target.value } : a))}
                        className="apply-select"
                      />
                    )}
                  </label>
                ))}
              </div>
            )}

            {/* ── Step: Review & submit ── */}
            {currentLabel === "Review & submit" && (
              <div>
                <p style={{ fontSize: 13, color: "var(--muted)", margin: "0 0 16px" }}>Review your application before submitting. Go back to make any changes.</p>
                <div className="apply-review">
                  <ReviewSection title="Personal details">
                    <ReviewRow label="Name" value={details.name} />
                    <ReviewRow label="Email" value={details.email} />
                    {details.phone && <ReviewRow label="Phone" value={details.phone} />}
                    {details.linkedinUrl && <ReviewRow label="LinkedIn" value={details.linkedinUrl} />}
                    {details.portfolioLink && <ReviewRow label="Portfolio" value={details.portfolioLink} />}
                  </ReviewSection>
                  <ReviewSection title="Background">
                    {experiencePayload.map((e, i) => <ReviewRow key={i} label={`Experience ${experiencePayload.length > 1 ? i + 1 : ""}`} value={[e.type, e.role, e.company, e.duration].filter(Boolean).join(" · ")} />)}
                    {educationPayload.map((e, i) => <ReviewRow key={i} label={`Education ${educationPayload.length > 1 ? i + 1 : ""}`} value={[e.level, e.institution, e.year].filter(Boolean).join(" · ")} />)}
                    {govtIdPayload && <ReviewRow label="Govt ID" value={`${govtIdPayload.type}: ${govtIdPayload.number}`} />}
                    {background.certifications.length > 0 && <ReviewRow label="Certifications" value={background.certifications.join(", ")} />}
                  </ReviewSection>
                  <ReviewSection title="Resume">
                    <ReviewRow label="File" value={resume.fileName || (resume.url ? "URL provided" : "Not uploaded")} />
                  </ReviewSection>
                  <ReviewSection title="Cover letter">
                    <ReviewRow label="" value={coverLetter ? `${coverLetter.slice(0, 120)}…` : "Not provided"} />
                  </ReviewSection>
                  {answers.filter((a) => a.answer).length > 0 && (
                    <ReviewSection title="Screening answers">
                      {answers.filter((a) => a.answer).map((a) => (
                        <ReviewRow key={a.questionId} label={a.question.slice(0, 50)} value={a.answer} />
                      ))}
                    </ReviewSection>
                  )}
                </div>
              </div>
            )}

            {/* Navigation */}
            <div className="apply-nav">
              {step > 0 && (
                <button type="button" className="apply-back" onClick={() => setStep(step - 1)}>← Back</button>
              )}
              {step < totalSteps - 1 ? (
                <button type="button" className="submit apply-next" disabled={!canAdvance()} onClick={() => setStep(step + 1)}>
                  Continue →
                </button>
              ) : (
                <button type="button" className="submit apply-next" disabled={submitting || !canAdvance()} onClick={submit}>
                  {submitting ? "Submitting…" : "Submit application →"}
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}

function ReviewSection({ title, children }) {
  return (
    <div className="review-section">
      <p className="review-section-title">{title}</p>
      {children}
    </div>
  );
}

function ReviewRow({ label, value }) {
  return (
    <div className="review-row">
      {label && <span className="review-label">{label}</span>}
      <span className={`review-value ${label ? "" : "review-value-full"}`}>{value || <em style={{ color: "var(--muted)" }}>Not provided</em>}</span>
    </div>
  );
}
