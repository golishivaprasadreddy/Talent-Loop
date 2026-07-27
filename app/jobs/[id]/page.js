"use client";
import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";

export default function JobDetailPage() {
  const { id } = useParams();
  const router = useRouter();
  const [job, setJob] = useState(null);
  const [saved, setSaved] = useState(false);
  const [user, setUser] = useState(null);
  const [loginPrompt, setLoginPrompt] = useState(false);

  useEffect(() => {
    fetch(`/api/jobs/${id}`).then((r) => r.json()).then((d) => setJob(d.job));
    fetch("/api/profile").then(r => r.ok ? r.json() : null).then(d => {
      const u = d?.user || null;
      setUser(u);
      if (u) {
        fetch("/api/saved-jobs").then(r => r.json()).then(d => {
          setSaved((d.saved || []).some(s => String(s.job?._id || s.job) === id));
        });
      } else {
        const s = JSON.parse(localStorage.getItem("talentloop-saved") || "[]");
        setSaved(s.includes(id));
      }
    });
  }, [id]);

  async function toggleSave() {
    if (!user) { setLoginPrompt(true); return; }
    if (saved) {
      setSaved(false);
      toast && toast("Removed from saved jobs");
    } else {
      const res = await fetch("/api/saved-jobs", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ jobId: id }) });
      if (res.ok || res.status === 409) setSaved(true);
    }
  }

  if (!job) return (
    <main style={{ minHeight: "100vh", background: "var(--cream)", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div className="skeleton-block" style={{ width: 600, height: 400, borderRadius: 12 }} />
    </main>
  );

  const company = job.company || {};
  const initials = (company.name || "?").slice(0, 2).toUpperCase();

  return (
    <main style={{ minHeight: "100vh", background: "var(--cream)" }}>
      {loginPrompt && (
        <div style={{ position: "fixed", inset: 0, background: "#00000066", zIndex: 200, display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }} onClick={() => setLoginPrompt(false)}>
          <div style={{ background: "#fffefa", border: "1px solid #d9ddd5", borderRadius: 14, padding: "36px 32px", maxWidth: 380, width: "100%", textAlign: "center", boxShadow: "0 24px 60px #0003" }} onClick={e => e.stopPropagation()}>
            <p style={{ fontSize: 28, margin: "0 0 8px" }}>♡</p>
            <h2 style={{ font: "600 22px/1.1 'Fraunces'", letterSpacing: "-.5px", margin: "0 0 10px" }}>Save this job</h2>
            <p style={{ fontSize: 14, color: "#66716b", margin: "0 0 24px", lineHeight: 1.6 }}>Sign in to save jobs and track them from your dashboard.</p>
            <div style={{ display: "flex", gap: 10 }}>
              <a href="/login" style={{ flex: 1, padding: "12px", background: "#18251f", color: "#fff", borderRadius: 7, font: "600 14px 'DM Sans'", textDecoration: "none", textAlign: "center" }}>Sign in</a>
              <a href="/register" style={{ flex: 1, padding: "12px", border: "1px solid #d9ddd5", borderRadius: 7, font: "600 14px 'DM Sans'", color: "#18251f", textDecoration: "none", textAlign: "center" }}>Create account</a>
            </div>
            <button onClick={() => setLoginPrompt(false)} style={{ marginTop: 14, background: "none", border: "none", font: "13px 'DM Sans'", color: "#66716b", cursor: "pointer" }}>Maybe later</button>
          </div>
        </div>
      )}

      <div className="shell job-detail-grid" style={{ padding: "48px 0 80px", display: "grid", gridTemplateColumns: "minmax(0,1.8fr) minmax(280px,1fr)", gap: 28, alignItems: "start" }}>
        {/* Main */}
        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          <div style={{ background: "var(--card)", border: "1px solid var(--line)", borderRadius: 12, padding: 32 }}>
            <div style={{ display: "flex", gap: 18, alignItems: "center", marginBottom: 24 }}>
              {company.logo
                ? <img src={company.logo} alt={company.name} style={{ width: 56, height: 56, objectFit: "contain", borderRadius: 12, border: "1px solid var(--line)", background: "#fff" }} />
                : <div className="avatar green" style={{ width: 56, height: 56, fontSize: 16, borderRadius: 12 }}>{initials}</div>}
              <div>
                <h1 style={{ font: "600 28px/1.1 Fraunces", letterSpacing: "-1px", margin: "0 0 4px" }}>{job.title}</h1>
                <p style={{ margin: 0, fontSize: 14, color: "var(--muted)" }}>{company.name} · {job.location}</p>
              </div>
            </div>

            <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 24 }}>
              {job.employmentType && <span className="tags"><span>{job.employmentType}</span></span>}
              {job.workMode && <span className="tags"><span>{job.workMode}</span></span>}
              {job.category && <span className="tags"><span>{job.category}</span></span>}
              {job.experience && <span className="tags"><span>{job.experience}</span></span>}
            </div>

            {job.description && <><h3 style={{ font: "600 16px DM Sans", margin: "0 0 8px" }}>About the role</h3><p style={{ fontSize: 14, lineHeight: 1.7, color: "var(--muted)", margin: "0 0 20px" }}>{job.description}</p></>}
            {job.responsibilities?.length > 0 && <><h3 style={{ font: "600 16px DM Sans", margin: "0 0 8px" }}>Responsibilities</h3><ul style={{ paddingLeft: 20, margin: "0 0 20px" }}>{job.responsibilities.map((r, i) => <li key={i} style={{ fontSize: 14, lineHeight: 1.7, color: "var(--muted)" }}>{r}</li>)}</ul></>}
            {job.requirements?.length > 0 && <><h3 style={{ font: "600 16px DM Sans", margin: "0 0 8px" }}>Requirements</h3><ul style={{ paddingLeft: 20, margin: "0 0 20px" }}>{job.requirements.map((r, i) => <li key={i} style={{ fontSize: 14, lineHeight: 1.7, color: "var(--muted)" }}>{r}</li>)}</ul></>}
            {job.skills?.length > 0 && <><h3 style={{ font: "600 16px DM Sans", margin: "0 0 8px" }}>Required skills</h3><div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 20 }}>{job.skills.map((s) => <span key={s} style={{ background: "#eef0ea", padding: "5px 10px", borderRadius: 4, fontSize: 12, color: "#5b6660" }}>{s}</span>)}</div></>}
            {job.preferredSkills?.length > 0 && <><h3 style={{ font: "600 16px DM Sans", margin: "0 0 8px" }}>Preferred skills</h3><div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 20 }}>{job.preferredSkills.map((s) => <span key={s} style={{ background: "#f5e8ad", padding: "5px 10px", borderRadius: 4, fontSize: 12, color: "#967a25" }}>{s}</span>)}</div></>}
            {job.benefits?.length > 0 && <><h3 style={{ font: "600 16px DM Sans", margin: "0 0 8px" }}>Benefits</h3><ul style={{ paddingLeft: 20, margin: 0 }}>{job.benefits.map((b, i) => <li key={i} style={{ fontSize: 14, lineHeight: 1.7, color: "var(--muted)" }}>{b}</li>)}</ul></>}


          </div>
        </div>

        {/* Sidebar */}
        <div className="job-detail-sidebar" style={{ display: "flex", flexDirection: "column", gap: 16, position: "sticky", top: 24 }}>
          <div style={{ background: "var(--card)", border: "1px solid var(--line)", borderRadius: 12, padding: 24 }}>
            {job.salaryMin && <p style={{ font: "600 22px Fraunces", margin: "0 0 4px" }}>₹{(job.salaryMin / 100000).toFixed(0)}L – ₹{(job.salaryMax / 100000).toFixed(0)}L</p>}
            {job.deadline && <p style={{ fontSize: 12, color: "var(--muted)", margin: "0 0 16px" }}>Apply by {new Date(job.deadline).toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" })}</p>}
            <button className="submit" style={{ width: "100%", marginBottom: 10 }} onClick={() => router.push(`/apply/${id}`)}>
              Apply now →
            </button>
            <button onClick={toggleSave} style={{ width: "100%", padding: "12px", border: "1px solid var(--line)", borderRadius: 7, background: "transparent", font: "600 14px DM Sans", cursor: "pointer", color: saved ? "#d9617d" : "var(--ink)" }}>
              {saved ? "♥ Saved" : "♡ Save job"}
            </button>
            <button onClick={() => navigator.share?.({ title: job.title, url: window.location.href }) || navigator.clipboard?.writeText(window.location.href)} style={{ width: "100%", padding: "12px", border: "1px solid var(--line)", borderRadius: 7, background: "transparent", font: "600 14px DM Sans", cursor: "pointer", marginTop: 8 }}>
              Share →
            </button>
          </div>
          <div style={{ background: "var(--card)", border: "1px solid var(--line)", borderRadius: 12, padding: 24 }}>
            <div style={{ display: "flex", gap: 12, alignItems: "center", marginBottom: 12 }}>
              {company.logo
                ? <img src={company.logo} alt={company.name} style={{ width: 36, height: 36, objectFit: "contain", borderRadius: 8, border: "1px solid var(--line)", background: "#fff" }} />
                : <div className="avatar green" style={{ width: 36, height: 36, fontSize: 12, borderRadius: 8 }}>{initials}</div>}
              <p style={{ font: "600 14px DM Sans", margin: 0 }}>About {company.name}</p>
            </div>
            {company.description && <p style={{ fontSize: 13, color: "var(--muted)", margin: "0 0 8px", lineHeight: 1.6 }}>{company.description}</p>}
            {company.industry && <p style={{ fontSize: 12, color: "var(--muted)", margin: "0 0 4px" }}>Industry: {company.industry}</p>}
            {company.size && <p style={{ fontSize: 12, color: "var(--muted)", margin: "0 0 4px" }}>Size: {company.size}</p>}
            {company.headquarters && <p style={{ fontSize: 12, color: "var(--muted)", margin: "0 0 4px" }}>HQ: {company.headquarters}</p>}
            {company.website && <a href={company.website} target="_blank" rel="noreferrer" style={{ fontSize: 12, color: "#48651a", fontWeight: 600 }}>Visit website →</a>}
          </div>
        </div>
      </div>
    </main>
  );
}
