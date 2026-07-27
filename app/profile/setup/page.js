"use client";
import { useRef, useState } from "react";
import { useRouter } from "next/navigation";

const STEPS = ["Your details", "Background", "Resume"];

const EMPTY_EXP = () => ({ type: "", role: "", company: "", duration: "", summary: "" });
const EMPTY_EDU = () => ({ level: "", institution: "", year: "" });

export default function ProfileSetupPage() {
  const router = useRouter();
  const fileRef = useRef();
  const [step, setStep] = useState(0);
  const [saving, setSaving] = useState(false);
  const [certInput, setCertInput] = useState("");

  const [details, setDetails] = useState({ name: "", phone: "", linkedinUrl: "", githubUrl: "", websiteUrl: "", about: "", skills: [] });
  const [skillInput, setSkillInput] = useState("");

  const [background, setBackground] = useState({
    experiences: [EMPTY_EXP()],
    educations: [EMPTY_EDU()],
    govtIdType: "",
    govtIdNumber: "",
    certifications: [],
  });

  const [resume, setResume] = useState({ url: "", fileName: "", dragging: false });

  function handleFile(file) {
    if (!file) return;
    if (file.type !== "application/pdf") { alert("Please upload a PDF file."); return; }
    if (file.size > 5 * 1024 * 1024) { alert("File must be under 5 MB."); return; }
    const reader = new FileReader();
    reader.onload = () => setResume({ url: reader.result, fileName: file.name, dragging: false });
    reader.readAsDataURL(file);
  }

  function addTag(field, value, setter) {
    const v = value.trim();
    if (!v) return;
    if (field === "skills") setDetails((d) => ({ ...d, skills: [...d.skills, v] }));
    else setBackground((b) => ({ ...b, certifications: [...b.certifications, v] }));
    setter("");
  }

  function canAdvance() {
    if (step === 0) return details.name.trim().length >= 2;
    return true;
  }

  async function finish() {
    setSaving(true);
    const payload = {
      name: details.name,
      about: details.about,
      skills: details.skills,
      certifications: background.certifications,
      portfolio: {
        linkedin: details.linkedinUrl || undefined,
        github: details.githubUrl || undefined,
        website: details.websiteUrl || undefined,
      },
      experience: background.experiences.filter((e) => e.role || e.company).map((e) => ({
        type: e.type, role: e.role, company: e.company, duration: e.duration, summary: e.summary,
      })),
      education: background.educations.filter((e) => e.level || e.institution).map((e) => ({
        degree: e.level, institution: e.institution, year: e.year,
      })),
      resumeUrl: resume.url || undefined,
    };
    await fetch("/api/profile", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    setSaving(false);
    router.push("/dashboard/candidate");
  }

  return (
    <main className="apply-page">
      <nav className="nav shell">
        <a className="brand" href="/"><span>✦</span> TalentLoop</a>
      </nav>

      <div className="shell setup-shell">
        {/* Left sidebar */}
        <aside className="apply-job-card">
          <div className="apply-job-initials">👤</div>
          <h2>Complete your profile</h2>
          <p className="apply-job-meta">Takes about 2 minutes. You can always update it later.</p>
          <div className="apply-progress">
            {STEPS.map((label, i) => (
              <div key={label} className={`apply-progress-step ${i === step ? "active" : ""} ${i < step ? "done" : ""}`}>
                <span className="apply-progress-dot">{i < step ? "✓" : i + 1}</span>
                <span>{label}</span>
              </div>
            ))}
          </div>
        </aside>

        {/* Right form */}
        <div className="apply-form-area">
          <div className="apply-form-card">
            <div className="apply-form-header">
              <p className="eyebrow">Step {step + 1} of {STEPS.length}</p>
              <h1>{STEPS[step]}</h1>
            </div>

            {/* ── Step 0: Your details ── */}
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
                    <input
                      className="bg-cert-input"
                      value={skillInput}
                      onChange={(e) => setSkillInput(e.target.value)}
                      onKeyDown={(e) => { if ((e.key === "Enter" || e.key === ",") && skillInput.trim()) { e.preventDefault(); addTag("skills", skillInput, setSkillInput); } }}
                      placeholder="Type a skill and press Enter…"
                    />
                    <button type="button" className="bg-add-btn" onClick={() => addTag("skills", skillInput, setSkillInput)}>+ Add</button>
                  </div>
                  {details.skills.length > 0 && (
                    <div className="bg-cert-tags">
                      {details.skills.map((s, i) => (
                        <span key={i} className="bg-cert-tag">
                          {s}
                          <button type="button" onClick={() => setDetails((d) => ({ ...d, skills: d.skills.filter((_, j) => j !== i) }))}>✕</button>
                        </span>
                      ))}
                    </div>
                  )}
                </label>
              </div>
            )}

            {/* ── Step 1: Background ── */}
            {step === 1 && (
              <div>
                {/* Experience */}
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
                        <input value={exp.duration} onChange={(e) => setBackground((b) => { const a = [...b.experiences]; a[idx] = { ...a[idx], duration: e.target.value }; return { ...b, experiences: a }; })} placeholder="Jan 2024 – Present" />
                      </label>
                      <label style={{ gridColumn: "1/-1" }}>
                        Summary
                        <textarea rows={3} className="apply-textarea" value={exp.summary} onChange={(e) => setBackground((b) => { const a = [...b.experiences]; a[idx] = { ...a[idx], summary: e.target.value }; return { ...b, experiences: a }; })} placeholder="Briefly describe your experience." />
                      </label>
                    </div>
                  </div>
                ))}

                {/* Education */}
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
                        Degree / level
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

                {/* Certifications */}
                <div className="bg-section-header" style={{ marginTop: 24 }}><span>Certifications</span></div>
                <div className="bg-cert-input-row">
                  <input
                    className="bg-cert-input"
                    value={certInput}
                    onChange={(e) => setCertInput(e.target.value)}
                    onKeyDown={(e) => { if ((e.key === "Enter" || e.key === ",") && certInput.trim()) { e.preventDefault(); addTag("certifications", certInput, setCertInput); } }}
                    placeholder="Type and press Enter to add…"
                  />
                  <button type="button" className="bg-add-btn" onClick={() => addTag("certifications", certInput, setCertInput)}>+ Add</button>
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
              </div>
            )}

            {/* ── Step 2: Resume ── */}
            {step === 2 && (
              <div>
                <p style={{ fontSize: 13, color: "var(--muted)", margin: "0 0 16px" }}>
                  Upload your resume so recruiters and AI tools can use it when you apply.
                </p>
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

            {/* Navigation */}
            <div className="apply-nav">
              {step > 0 && (
                <button type="button" className="apply-back" onClick={() => setStep(step - 1)}>← Back</button>
              )}
              {step < STEPS.length - 1 ? (
                <button type="button" className="submit apply-next" disabled={!canAdvance()} onClick={() => setStep(step + 1)}>
                  Continue →
                </button>
              ) : (
                <button type="button" className="submit apply-next" disabled={saving} onClick={finish}>
                  {saving ? "Saving…" : "Save & go to dashboard →"}
                </button>
              )}
              {step === STEPS.length - 1 && (
                <button type="button" className="setup-skip-btn" onClick={() => router.push("/dashboard/candidate")}>
                  Skip for now
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
