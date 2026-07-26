"use client";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";

export default function CompanyPage() {
  const { id } = useParams();
  const [company, setCompany] = useState(null);
  const [jobs, setJobs] = useState([]);
  const [reviews, setReviews] = useState([]);
  const [reviewForm, setReviewForm] = useState({ rating: 5, pros: "", cons: "", body: "" });
  const [submitting, setSubmitting] = useState(false);
  const [reviewMsg, setReviewMsg] = useState("");

  useEffect(() => {
    fetch(`/api/jobs?companyId=${id}`).then(r => r.json()).then(d => {
      if (d.jobs?.length) setCompany(d.jobs[0].company);
      setJobs((d.jobs || []).filter(j => j.company?._id === id || j.company === id));
    });
    fetch(`/api/reviews?companyId=${id}`).then(r => r.json()).then(d => setReviews(d.reviews || []));
  }, [id]);

  async function submitReview(e) {
    e.preventDefault(); setSubmitting(true); setReviewMsg("");
    const res = await fetch("/api/reviews", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...reviewForm, companyId: id }) });
    const data = await res.json(); setSubmitting(false);
    if (res.ok) { setReviewMsg("Review submitted!"); setReviews(prev => [data.review, ...prev]); }
    else setReviewMsg(data.error || "Unable to submit review.");
  }

  const avgRating = reviews.length ? (reviews.reduce((s, r) => s + r.rating, 0) / reviews.length).toFixed(1) : null;

  return (
    <main style={{ minHeight: "100vh", background: "var(--cream)" }}>
      <nav className="nav shell">
        <a className="brand" href="/"><span>✦</span> TalentLoop</a>
        <div className="navlinks"><a href="/">← All jobs</a><a href="/login">Sign in</a></div>
      </nav>

      <div className="shell" style={{ padding: "48px 0 80px" }}>
        {/* Header */}
        <div style={{ background: "var(--card)", border: "1px solid var(--line)", borderRadius: 12, padding: 32, marginBottom: 24 }}>
          <div style={{ display: "flex", gap: 20, alignItems: "center" }}>
            <div className="avatar green" style={{ width: 64, height: 64, fontSize: 20, borderRadius: 14 }}>{(company?.name || "?").slice(0, 2).toUpperCase()}</div>
            <div>
              <h1 style={{ font: "600 32px/1 Fraunces", letterSpacing: "-1.2px", margin: "0 0 6px" }}>{company?.name || "Company"}</h1>
              <div style={{ display: "flex", gap: 16, fontSize: 13, color: "var(--muted)" }}>
                {company?.industry && <span>{company.industry}</span>}
                {company?.headquarters && <span>📍 {company.headquarters}</span>}
                {company?.size && <span>👥 {company.size}</span>}
                {avgRating && <span>⭐ {avgRating} ({reviews.length} reviews)</span>}
              </div>
            </div>
            {company?.website && <a href={company.website} target="_blank" rel="noreferrer" className="nav-button" style={{ marginLeft: "auto", textDecoration: "none" }}>Visit website →</a>}
          </div>
          {company?.description && <p style={{ fontSize: 14, lineHeight: 1.7, color: "var(--muted)", margin: "20px 0 0" }}>{company.description}</p>}
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "minmax(0,1.6fr) minmax(280px,1fr)", gap: 24, alignItems: "start" }}>
          {/* Jobs */}
          <div>
            <h2 style={{ font: "600 22px Fraunces", margin: "0 0 16px" }}>Open roles ({jobs.length})</h2>
            {jobs.length === 0 && <p style={{ color: "var(--muted)", fontSize: 14 }}>No open roles at the moment.</p>}
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {jobs.map(job => (
                <a key={job._id} href={`/jobs/${job._id}`} style={{ textDecoration: "none", color: "inherit" }}>
                  <div style={{ background: "var(--card)", border: "1px solid var(--line)", borderRadius: 10, padding: "18px 20px", transition: "transform .15s", cursor: "pointer" }}>
                    <p style={{ font: "600 16px DM Sans", margin: "0 0 4px" }}>{job.title}</p>
                    <p style={{ fontSize: 12, color: "var(--muted)", margin: 0 }}>{job.location} · {job.workMode} · {job.employmentType}</p>
                    {job.salaryMin && <p style={{ fontSize: 12, color: "#48651a", fontWeight: 600, margin: "6px 0 0" }}>₹{(job.salaryMin / 100000).toFixed(0)}L – ₹{(job.salaryMax / 100000).toFixed(0)}L</p>}
                  </div>
                </a>
              ))}
            </div>

            {/* Reviews */}
            <h2 style={{ font: "600 22px Fraunces", margin: "32px 0 16px" }}>Reviews ({reviews.length})</h2>
            {reviews.map(r => (
              <div key={r._id} style={{ background: "var(--card)", border: "1px solid var(--line)", borderRadius: 10, padding: "18px 20px", marginBottom: 12 }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
                  <span style={{ font: "600 14px DM Sans" }}>{r.candidate?.name || "Candidate"}</span>
                  <span style={{ color: "#967a25" }}>{"★".repeat(r.rating)}{"☆".repeat(5 - r.rating)}</span>
                </div>
                {r.pros && <p style={{ fontSize: 13, color: "#41531a", margin: "0 0 4px" }}>✓ {r.pros}</p>}
                {r.cons && <p style={{ fontSize: 13, color: "#b14444", margin: "0 0 4px" }}>✗ {r.cons}</p>}
                {r.body && <p style={{ fontSize: 13, color: "var(--muted)", margin: 0 }}>{r.body}</p>}
              </div>
            ))}
          </div>

          {/* Review form */}
          <div style={{ background: "var(--card)", border: "1px solid var(--line)", borderRadius: 12, padding: 24, position: "sticky", top: 24 }}>
            <h3 style={{ font: "600 18px Fraunces", margin: "0 0 16px" }}>Leave a review</h3>
            <form onSubmit={submitReview} style={{ display: "grid", gap: 12 }}>
              <label style={{ fontSize: 12, fontWeight: 600, display: "grid", gap: 6 }}>Rating
                <select value={reviewForm.rating} onChange={e => setReviewForm({ ...reviewForm, rating: Number(e.target.value) })} style={{ padding: 10, border: "1px solid #cbd1c9", borderRadius: 6, font: "14px DM Sans" }}>
                  {[5, 4, 3, 2, 1].map(n => <option key={n} value={n}>{"★".repeat(n)} {n}/5</option>)}
                </select>
              </label>
              <label style={{ fontSize: 12, fontWeight: 600, display: "grid", gap: 6 }}>Pros<input value={reviewForm.pros} onChange={e => setReviewForm({ ...reviewForm, pros: e.target.value })} placeholder="What did you like?" style={{ padding: 10, border: "1px solid #cbd1c9", borderRadius: 6, font: "14px DM Sans" }} /></label>
              <label style={{ fontSize: 12, fontWeight: 600, display: "grid", gap: 6 }}>Cons<input value={reviewForm.cons} onChange={e => setReviewForm({ ...reviewForm, cons: e.target.value })} placeholder="What could be better?" style={{ padding: 10, border: "1px solid #cbd1c9", borderRadius: 6, font: "14px DM Sans" }} /></label>
              <label style={{ fontSize: 12, fontWeight: 600, display: "grid", gap: 6 }}>Review<textarea value={reviewForm.body} onChange={e => setReviewForm({ ...reviewForm, body: e.target.value })} rows={3} placeholder="Share your experience…" style={{ padding: 10, border: "1px solid #cbd1c9", borderRadius: 6, font: "14px DM Sans", resize: "vertical" }} /></label>
              <button className="portal-button" type="submit" disabled={submitting}>{submitting ? "Submitting…" : "Submit review"}</button>
              {reviewMsg && <p style={{ fontSize: 12, color: reviewMsg.includes("!") ? "#5b7623" : "#b14444", margin: 0 }}>{reviewMsg}</p>}
            </form>
          </div>
        </div>
      </div>
    </main>
  );
}
