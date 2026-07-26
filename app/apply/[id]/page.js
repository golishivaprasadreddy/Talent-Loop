"use client";
import { useEffect, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";

const STEPS = ["Your details", "Resume", "Cover letter", "Questions", "Review & submit"];

export default function ApplyPage() {
  const { id } = useParams();
  const router = useRouter();

  const [job, setJob] = useState(null);
  const [loading, setLoading] = useState(true);
  const [step, setStep] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(null);

  // Form state — pre-filled from profile
  const [details, setDetails] = useState({ name: "", email: "", phone: "", linkedinUrl: "", portfolioLink: "" });
  const [resume, setResume] = useState({ url: "", fileName: "", dragging: false });
  const [coverLetter, setCoverLetter] = useState("");
  const [generating, setGenerating] = useState(false);
  const [answers, setAnswers] = useState([]);
  const fileRef = useRef();

  useEffect(() => {
    async function load() {
      const [jobRes, profileRes] = await Promise.all([
        fetch(`/api/jobs/${id}`),
        fetch("/api/profile"),
      ]);
      const jobData = await jobRes.json();
      const profileData = profileRes.ok ? await profileRes.json() : {};

      const j = jobData.job;
      const u = profileData.user || {};

      setJob(j);
      setDetails({
        name: u.name || "",
        email: u.email || "",
        phone: u.phone || "",
        linkedinUrl: u.portfolio?.linkedin || "",
        portfolioLink: u.portfolio?.website || u.portfolio?.github || "",
      });
      if (u.resumeUrl) setResume({ url: u.resumeUrl, fileName: "Profile resume", dragging: false });
      setAnswers((j?.customQuestions || []).map((q) => ({ questionId: q._id, question: q.question, answer: "" })));
      setLoading(false);
    }
    load();
  }, [id]);

  const questions = job?.customQuestions || [];
  const steps = questions.length > 0 ? STEPS : STEPS.filter((s) => s !== "Questions");
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
    if (currentLabel === "Questions") return answers.every((a, i) => !questions[i]?.required || a.answer.trim());
    return true;
  }

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
      <div className="shell apply-shell">
        <div className="apply-done-page">
          {done.success ? (
            <>
              <div className="apply-done-icon">✓</div>
              <h1>Application submitted!</h1>
              <p>Reference: <strong>{done.ref}</strong></p>
              <p>You'll receive updates in your notifications when the recruiter reviews your application.</p>
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
      <nav className="nav shell">
        <a className="brand" href="/"><span>✦</span> TalentLoop</a>
        <div className="navlinks">
          <a href={`/jobs/${id}`}>← Back to job</a>
        </div>
      </nav>

      <div className="shell apply-shell">
        {/* Left: job summary */}
        <aside className="apply-job-card">
          <div className="apply-job-initials">{(company.name || "?").slice(0, 2).toUpperCase()}</div>
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
                  <button className="apply-remove-btn" onClick={() => setResume({ url: "", fileName: "", dragging: false })}>Remove file</button>
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
                  <label key={q._id} style={{ display: "grid", gap: 8, fontSize: 14, fontWeight: 600, color: "var(--ink)" }}>
                    {i + 1}. {q.question} {q.required && <span className="req">*</span>}
                    {q.type === "yesno" ? (
                      <select
                        value={answers[i]?.answer || ""}
                        onChange={(e) => setAnswers(answers.map((a, j) => j === i ? { ...a, answer: e.target.value } : a))}
                        className="apply-select"
                      >
                        <option value="">Select an answer…</option>
                        <option value="Yes">Yes</option>
                        <option value="No">No</option>
                      </select>
                    ) : q.type === "textarea" ? (
                      <textarea
                        rows={4}
                        value={answers[i]?.answer || ""}
                        onChange={(e) => setAnswers(answers.map((a, j) => j === i ? { ...a, answer: e.target.value } : a))}
                        className="apply-select"
                        style={{ resize: "vertical" }}
                      />
                    ) : (
                      <input
                        value={answers[i]?.answer || ""}
                        onChange={(e) => setAnswers(answers.map((a, j) => j === i ? { ...a, answer: e.target.value } : a))}
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
                <button className="apply-back" onClick={() => setStep(step - 1)}>← Back</button>
              )}
              {step < totalSteps - 1 ? (
                <button className="submit apply-next" disabled={!canAdvance()} onClick={() => setStep(step + 1)}>
                  Continue →
                </button>
              ) : (
                <button className="submit apply-next" disabled={submitting || !canAdvance()} onClick={submit}>
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
