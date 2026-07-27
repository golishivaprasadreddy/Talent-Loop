"use client";
import { useEffect, useMemo, useRef, useState } from "react";

const CATEGORIES = ["All roles", "Engineering", "Design", "Product", "Data", "Marketing", "Sales", "Operations"];
const WORK_MODES = ["Any mode", "Remote", "Hybrid", "Onsite"];
const SORT_OPTIONS = ["Latest", "Salary", "Relevance", "Popularity"];
const FAQS = [
  ["Is TalentLoop free for candidates?", "Yes. Candidates can build a profile, discover roles, save opportunities, track applications, and use their dashboard at no cost."],
  ["How does AI matching work?", "TalentLoop compares the skills in a profile with role requirements and highlights transparent matches and gaps. Candidates remain in control."],
  ["Can companies manage the entire hiring flow?", "Yes. Recruiters can publish jobs, screen applicants, shortlist talent, track interviews, and understand their hiring funnel."],
  ["How is my information protected?", "The platform uses hashed passwords, secure httpOnly sessions, role-protected routes, input validation, and environment-managed secrets."],
];

function Toast({ toasts, remove }) {
  return (
    <div style={{ position: "fixed", bottom: 24, right: 24, zIndex: 100, display: "flex", flexDirection: "column", gap: 10 }}>
      {toasts.map(t => (
        <div key={t.id} onClick={() => remove(t.id)} style={{ background: t.type === "error" ? "#fde8e8" : "#d4f7c5", color: t.type === "error" ? "#9b2c2c" : "#356220", border: `1px solid ${t.type === "error" ? "#f5c6c6" : "#a3d98a"}`, borderRadius: 8, padding: "12px 18px", fontSize: 13, fontWeight: 600, cursor: "pointer", boxShadow: "0 4px 16px #0002", maxWidth: 320, animation: "slideIn .2s ease" }}>
          {t.msg}
        </div>
      ))}
    </div>
  );
}

function Skeleton({ h = 180 }) {
  return <div className="skeleton-card" style={{ borderRadius: 10, height: h }} />;
}

export default function JobsBoard() {
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [location, setLocation] = useState("");
  const [category, setCategory] = useState("All roles");
  const [workMode, setWorkMode] = useState("Any mode");
  const [sortBy, setSortBy] = useState("Latest");
  const [salaryMin, setSalaryMin] = useState("");
  const [saved, setSaved] = useState([]);

  const [openFaq, setOpenFaq] = useState(0);
  const [newsletter, setNewsletter] = useState("");
  const [subscribed, setSubscribed] = useState(false);
  const [suggestions, setSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [toasts, setToasts] = useState([]);
  const [user, setUser] = useState(undefined); // undefined = loading, null = guest
  const [loginPrompt, setLoginPrompt] = useState(false);
  const suggestRef = useRef(null);

  useEffect(() => {
    fetch("/api/jobs").then(r => r.json()).then(d => { setJobs(d.jobs || []); setLoading(false); });
    fetch("/api/profile").then(r => r.ok ? r.json() : null).then(d => {
      const u = d?.user || null;
      setUser(u);
      if (u) {
        // Signed in — load saved jobs from DB
        fetch("/api/saved-jobs").then(r => r.json()).then(d => {
          const ids = (d.saved || []).map(s => String(s.job?._id || s.job));
          setSaved(ids);
          localStorage.setItem("talentloop-saved", JSON.stringify(ids));
        });
      } else {
        setSaved(JSON.parse(localStorage.getItem("talentloop-saved") || "[]"));
      }
    });
  }, []);

  function toast(msg, type = "success") {
    const id = Date.now();
    setToasts(t => [...t, { id, msg, type }]);
    setTimeout(() => setToasts(t => t.filter(x => x.id !== id)), 3500);
  }

  function removeToast(id) { setToasts(t => t.filter(x => x.id !== id)); }

  // Search suggestions from job titles + companies
  useEffect(() => {
    if (!query || query.length < 2) { setSuggestions([]); return; }
    const q = query.toLowerCase();
    const hits = [...new Set(jobs.flatMap(j => [j.title, j.company?.name || j.company]).filter(s => s && s.toLowerCase().includes(q)))].slice(0, 6);
    setSuggestions(hits);
    setShowSuggestions(hits.length > 0);
  }, [query, jobs]);

  const filteredJobs = useMemo(() => {
    let list = jobs.filter(job => {
      const text = `${job.title} ${job.company?.name || job.company} ${job.location} ${job.category} ${(job.skills || []).join(" ")}`.toLowerCase();
      const matchQuery = !query || text.includes(query.toLowerCase());
      const matchLocation = !location || (job.location || "").toLowerCase().includes(location.toLowerCase());
      const matchCategory = category === "All roles" || job.category === category;
      const matchMode = workMode === "Any mode" || (job.workMode || job.mode || "").toLowerCase() === workMode.toLowerCase();
      const matchSalary = !salaryMin || (job.salaryMin && job.salaryMin >= Number(salaryMin) * 100000);
      return matchQuery && matchLocation && matchCategory && matchMode && matchSalary;
    });
    if (sortBy === "Salary") list = [...list].sort((a, b) => (b.salaryMin || 0) - (a.salaryMin || 0));
    else if (sortBy === "Popularity") list = [...list].sort((a, b) => (b.views || 0) - (a.views || 0));
    else if (sortBy === "Latest") list = [...list].sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
    return list;
  }, [jobs, query, location, category, workMode, salaryMin, sortBy]);

  async function toggleSaved(id) {
    if (!user) { setLoginPrompt(true); return; }
    const isSaved = saved.includes(String(id));
    if (isSaved) {
      // Unsave — no DELETE endpoint yet, just remove from local state
      const next = saved.filter(x => x !== String(id));
      setSaved(next);
      localStorage.setItem("talentloop-saved", JSON.stringify(next));
      toast("Removed from saved jobs");
    } else {
      const res = await fetch("/api/saved-jobs", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ jobId: id }) });
      if (res.ok || res.status === 409) {
        const next = [...saved, String(id)];
        setSaved(next);
        localStorage.setItem("talentloop-saved", JSON.stringify(next));
        toast("Job saved!");
      } else {
        toast("Could not save job.", "error");
      }
    }
  }

const colorMap = { Engineering: "blue", Design: "purple", Product: "green", Data: "orange", Marketing: "yellow", Sales: "pink", Operations: "green" };

  return (
    <>
      <style>{`
        @keyframes shimmer { 0%{background-position:200% 0} 100%{background-position:-200% 0} }
        @keyframes slideIn { from{transform:translateX(40px);opacity:0} to{transform:translateX(0);opacity:1} }
      `}</style>

      <Toast toasts={toasts} remove={removeToast} />

      {/* Login prompt modal */}
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

      <main>
        {/* Hero */}
        <section className="hero shell" id="top">
          <p className="eyebrow">THE COMPLETE HIRING PLATFORM</p>
          <h1>Find work worth<br /><em>showing up for.</em></h1>
          <p className="hero-copy">One thoughtful place for talented people to grow and ambitious teams to hire.</p>
          <div className="search-panel" style={{ position: "relative" }}>
            <label>Search
              <input aria-label="Search jobs" value={query} onChange={e => setQuery(e.target.value)} onFocus={() => setShowSuggestions(suggestions.length > 0)} onBlur={() => setTimeout(() => setShowSuggestions(false), 150)} placeholder="Job title, skill, or company" autoComplete="off" />
            </label>
            <label className="location">Location
              <input aria-label="Search locations" value={location} onChange={e => setLocation(e.target.value)} placeholder="City or remote" />
            </label>
            <button onClick={() => document.getElementById("jobs").scrollIntoView({ behavior: "smooth" })}>Search jobs →</button>
            {showSuggestions && (
              <div ref={suggestRef} style={{ position: "absolute", top: "100%", left: 0, right: 0, background: "var(--card)", border: "1px solid var(--line)", borderRadius: 8, zIndex: 20, boxShadow: "0 8px 24px #0002", marginTop: 4 }}>
                {suggestions.map(s => <button key={s} onMouseDown={() => { setQuery(s); setShowSuggestions(false); }} style={{ display: "block", width: "100%", textAlign: "left", padding: "10px 16px", border: 0, background: "transparent", font: "14px DM Sans", cursor: "pointer", color: "var(--ink)" }}>{s}</button>)}
              </div>
            )}
          </div>
          <div className="hero-meta">
            <span><b>2,400+</b> live opportunities</span>
            <span><b>850+</b> growing teams</span>
            <span><b>92%</b> candidate satisfaction</span>
          </div>
        </section>

        {/* Trusted */}
        <section className="trusted">
          <div className="shell trusted-inner">
            <span>TRUSTED BY TEAMS AT</span>
            <b>luma</b><b>orbital</b><b>Wander</b><b>nexora</b><b>mosaic</b>
          </div>
        </section>

        {/* Platform intro */}
        <section className="platform-intro shell" id="features">
          <div><p className="eyebrow">ONE PLATFORM, EVERY HIRING MOMENT</p><h2>Everything great careers<br />and great teams need.</h2></div>
          <p>TalentLoop brings job discovery, hiring workflows, secure collaboration, and useful AI into one focused platform.</p>
        </section>
        <section className="feature-grid shell">
          <article><span className="feature-icon">01</span><h3>For candidates</h3><p>Build a standout profile, discover relevant roles, save favourites, track every application, and prepare with AI.</p><a href="/register">Build your profile →</a></article>
          <article><span className="feature-icon">02</span><h3>For hiring teams</h3><p>Publish polished jobs, screen applicants, manage interviews, and understand your hiring funnel in real time.</p><a href="/register">Register a company →</a></article>
          <article><span className="feature-icon">03</span><h3>Built for trust</h3><p>Verified companies, secure accounts, protected routes, human reviews, and tools to keep the marketplace healthy.</p><a href="/admin">Explore operations →</a></article>
        </section>

        {/* AI section */}
        <section className="ai-section">
          <div className="shell ai-inner">
            <div>
              <p className="eyebrow">PRACTICAL AI, HUMAN CONTROL</p>
              <h2>Make every next step<br /><em>more confident.</em></h2>
              <p>AI is a thoughtful co-pilot, surfacing the right signals while you remain in control of every important decision.</p>
              <a className="ai-link" href="/dashboard">Try the AI workspace →</a>
            </div>
            <div className="ai-tools">
              <div><b>87%</b><span>Job match score</span><small>React, product thinking, APIs</small></div>
              <div><b>AI</b><span>Resume feedback</span><small>Find missing skills and stronger framing</small></div>
              <div><b>CL</b><span>Application kit</span><small>Tailored cover letters in moments</small></div>
              <div><b>JD</b><span>Description studio</span><small>Inclusive recruiter drafts</small></div>
            </div>
          </div>
        </section>

        {/* Jobs section */}
        <section className="jobs-section shell" id="jobs">
          <div className="section-heading">
            <div><p className="eyebrow">CURATED FOR YOU</p><h2>Open roles with real impact.</h2></div>

          </div>

          {/* Filters removed — use /jobs page for filtering */}

          <div className="results-row">
            <span>{filteredJobs.length} roles found</span>
            <div style={{ display: "flex", gap: 8 }}>
              {SORT_OPTIONS.map(s => <button key={s} onClick={() => setSortBy(s)} style={{ border: 0, background: "none", font: `${sortBy === s ? "700" : "400"} 12px DM Sans`, color: sortBy === s ? "var(--ink)" : "var(--muted)", cursor: "pointer", textDecoration: sortBy === s ? "underline" : "none" }}>{s}</button>)}
            </div>
          </div>

          <div className="job-grid">
            {loading ? Array(6).fill(0).map((_, i) => <Skeleton key={i} />) : filteredJobs.slice(0, 6).map(job => {
              const id = job.id || job._id;
              const companyName = job.company?.name || job.company;
              const color = colorMap[job.category] || "green";
              const initials = (companyName || "?").toString().slice(0, 2).toUpperCase();
              return (
                <article className="job-card" key={id}>
                  <div className="job-top">
                    <div className={`avatar ${job.color || color}`}>{job.initials || initials}</div>
                    <button className={saved.includes(String(id)) ? "save saved" : "save"} onClick={() => toggleSaved(id)} aria-label="Save job">♥</button>
                  </div>
                  <p className="company">{companyName} <span>· {job.posted || "New"}</span></p>
                  <h3>{job.title}</h3>
                  <p className="job-location">{job.location} · {job.mode || job.workMode}</p>
                  <div className="tags">
                    <span>{job.type || job.employmentType}</span>
                    {job.category && <span>{job.category}</span>}
                  </div>
                  <div className="job-footer">
                    <b>{job.salary || (job.salaryMin ? `₹${(job.salaryMin / 100000).toFixed(0)}L–₹${(job.salaryMax / 100000).toFixed(0)}L` : "Competitive")}</b>
                    <div style={{ display: "flex", gap: 8 }}>
                      {job._id && <a href={`/jobs/${job._id}`} style={{ border: 0, background: "none", font: "600 12px DM Sans", color: "var(--muted)", cursor: "pointer", textDecoration: "none" }}>Details</a>}
                      {job._id && <a href={`/apply/${job._id}`} style={{ border: 0, background: "none", font: "600 12px DM Sans", color: "var(--ink)", cursor: "pointer", textDecoration: "none" }}>Apply →</a>}
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
          {!loading && filteredJobs.length === 0 && <p className="empty">No roles match those filters. Try a broader search.</p>}
          <div style={{ textAlign: "center", marginTop: 36 }}>
            <a href="/jobs" className="view-all-btn">View all {filteredJobs.length > 6 ? `${filteredJobs.length}+` : ""} open roles →</a>
          </div>
        </section>

        {/* How it works */}
        <section className="how shell" id="how">
          <div><p className="eyebrow">A SIMPLER SEARCH</p><h2>Less searching.<br />More <em>belonging.</em></h2></div>
          <div className="steps">
            <p><b>01</b><span><strong>Discover your fit</strong>Thoughtfully selected roles from teams growing with purpose.</span></p>
            <p><b>02</b><span><strong>Apply with confidence</strong>A clear, human application experience with no black-box process.</span></p>
            <p><b>03</b><span><strong>Build what is next</strong>Join work that challenges you and a team that helps you thrive.</span></p>
          </div>
        </section>

        {/* Proof */}
        <section className="proof shell">
          <div className="proof-stats">
            <div><b>2,400+</b><span>live opportunities</span></div>
            <div><b>850+</b><span>growing companies</span></div>
            <div><b>34k+</b><span>applications sent</span></div>
            <div><b>92%</b><span>candidate satisfaction</span></div>
          </div>
          <div className="testimonial">
            <p className="eyebrow">FROM THE COMMUNITY</p>
            <blockquote>"I did not just find a role. I found a team whose values and pace felt right from the first conversation."</blockquote>
            <p><b>Priya Nair</b> — Product Designer at Luma</p>
          </div>
        </section>

        {/* FAQ */}
        <section className="faq shell">
          <div><p className="eyebrow">QUESTIONS, ANSWERED</p><h2>A better hiring experience starts here.</h2></div>
          <div>
            {FAQS.map(([q, a], i) => (
              <button className="faq-item" key={q} onClick={() => setOpenFaq(openFaq === i ? -1 : i)}>
                <span>{q}</span><b>{openFaq === i ? "−" : "+"}</b>
                {openFaq === i && <p>{a}</p>}
              </button>
            ))}
          </div>
        </section>

        {/* Newsletter */}
        <section className="newsletter">
          <div className="shell newsletter-inner">
            <div>
              <p className="eyebrow">STAY IN THE LOOP</p>
              <h2>Career clarity, delivered.</h2>
              <p>Job-search tips, hiring insights, and useful platform updates. No noise.</p>
            </div>
            <form onSubmit={e => { e.preventDefault(); if (newsletter) { setSubscribed(true); toast("You're subscribed!"); } }}>
              <input type="email" required value={newsletter} onChange={e => setNewsletter(e.target.value)} placeholder="Your email address" />
              <button>{subscribed ? "Subscribed ✓" : "Subscribe →"}</button>
            </form>
          </div>
        </section>

        {/* Footer */}
        <footer>
          <div className="shell footer-inner">
            <a className="brand" href="#top"><span>✦</span> TalentLoop</a>
            <p>Good work starts with the right match.</p>
            <span>© 2025 TalentLoop</span>
          </div>
        </footer>


      </main>
    </>
  );
}
