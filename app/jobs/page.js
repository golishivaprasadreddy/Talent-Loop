"use client";
import { useEffect, useMemo, useRef, useState, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense } from "react";

const CATEGORIES = ["All", "Engineering", "Design", "Product", "Data", "Marketing", "Sales", "Operations"];
const WORK_MODES = ["Any", "Remote", "Hybrid", "Onsite"];
const SORT_OPTIONS = ["Latest", "Salary", "Popularity"];
const PER_PAGE = 12;
const COLOR_MAP = { Engineering: "blue", Design: "purple", Product: "green", Data: "orange", Marketing: "yellow", Sales: "pink", Operations: "green" };

function JobsPageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [jobs, setJobs] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [saved, setSaved] = useState([]);

  // Filters from URL
  const [query, setQuery] = useState(searchParams.get("q") || "");
  const [location, setLocation] = useState(searchParams.get("location") || "");
  const [category, setCategory] = useState(searchParams.get("category") || "All");
  const [workMode, setWorkMode] = useState(searchParams.get("workMode") || "Any");
  const [salaryMin, setSalaryMin] = useState(searchParams.get("salaryMin") || "");
  const [sortBy, setSortBy] = useState(searchParams.get("sort") || "Latest");
  const [page, setPage] = useState(Number(searchParams.get("page")) || 1);

  const [suggestions, setSuggestions] = useState([]);
  const [showSug, setShowSug] = useState(false);
  const sugRef = useRef();
  const inputRef = useRef();

  const totalPages = Math.ceil(total / PER_PAGE);

  const fetchJobs = useCallback(async (params) => {
    setLoading(true);
    const qs = new URLSearchParams();
    if (params.q) qs.set("q", params.q);
    if (params.category && params.category !== "All") qs.set("category", params.category);
    if (params.workMode && params.workMode !== "Any") qs.set("workMode", params.workMode);
    if (params.salaryMin) qs.set("salaryMin", Number(params.salaryMin) * 100000);
    qs.set("limit", PER_PAGE);
    qs.set("page", params.page || 1);
    const res = await fetch(`/api/jobs?${qs}`);
    const data = await res.json();
    let list = data.jobs || [];
    if (params.sortBy === "Salary") list = [...list].sort((a, b) => (b.salaryMin || 0) - (a.salaryMin || 0));
    else if (params.sortBy === "Popularity") list = [...list].sort((a, b) => (b.views || 0) - (a.views || 0));
    // client-side location filter (API doesn't support it)
    if (params.location) list = list.filter(j => (j.location || "").toLowerCase().includes(params.location.toLowerCase()));
    setJobs(list);
    setTotal(data.total || list.length);
    setLoading(false);
  }, []);

  useEffect(() => {
    setSaved(JSON.parse(localStorage.getItem("talentloop-saved") || "[]"));
  }, []);

  useEffect(() => {
    fetchJobs({ q: query, category, workMode, salaryMin, sortBy, location, page });
  }, [query, category, workMode, salaryMin, sortBy, location, page, fetchJobs]);

  // Search suggestions
  useEffect(() => {
    if (!query || query.length < 2) { setSuggestions([]); return; }
    const q = query.toLowerCase();
    const hits = [...new Set(jobs.flatMap(j => [j.title, j.company?.name || j.company]).filter(s => s && s.toLowerCase().includes(q)))].slice(0, 5);
    setSuggestions(hits);
    setShowSug(hits.length > 0);
  }, [query, jobs]);

  function toggleSave(id) {
    const next = saved.includes(id) ? saved.filter(x => x !== id) : [...saved, id];
    setSaved(next);
    localStorage.setItem("talentloop-saved", JSON.stringify(next));
  }

  function handleSearch(e) {
    e.preventDefault();
    setPage(1);
  }

  function clearFilters() {
    setQuery(""); setLocation(""); setCategory("All");
    setWorkMode("Any"); setSalaryMin(""); setSortBy("Latest"); setPage(1);
  }

  const hasFilters = query || location || category !== "All" || workMode !== "Any" || salaryMin;

  return (
    <main style={{ minHeight: "100vh", background: "var(--cream)" }}>
      <nav className="nav shell">
        <a className="brand" href="/"><span>✦</span> TalentLoop</a>
        <div className="navlinks">
          <a href="/" style={{ fontSize: 14, color: "var(--muted)", textDecoration: "none" }}>← Home</a>
          <a href="/login">Sign in</a>
          <a className="nav-button" href="/register">Get started</a>
        </div>
      </nav>

      {/* Page header */}
      <div className="shell" style={{ padding: "40px 0 0" }}>
        <p className="eyebrow">ALL OPPORTUNITIES</p>
        <h1 style={{ font: "600 clamp(32px,5vw,52px)/1.05 Fraunces", letterSpacing: "-2px", margin: "0 0 8px" }}>
          Find your next role
        </h1>
        <p style={{ fontSize: 15, color: "var(--muted)", margin: "0 0 28px" }}>
          {total > 0 ? `${total} open position${total !== 1 ? "s" : ""}` : "Browse all open positions"}
        </p>

        {/* Search bar */}
        <form onSubmit={handleSearch} className="jobs-search-bar">
          <div className="jobs-search-input" style={{ position: "relative" }}>
            <span style={{ fontSize: 18, color: "var(--muted)", flexShrink: 0 }}>🔍</span>
            <input
              ref={inputRef}
              value={query}
              onChange={e => setQuery(e.target.value)}
              onFocus={() => setShowSug(suggestions.length > 0)}
              onBlur={() => setTimeout(() => setShowSug(false), 150)}
              placeholder="Job title, skill, or company"
              autoComplete="off"
            />
            {showSug && (
              <div ref={sugRef} className="jobs-suggestions">
                {suggestions.map(s => (
                  <button key={s} type="button" onMouseDown={() => { setQuery(s); setShowSug(false); }}>{s}</button>
                ))}
              </div>
            )}
          </div>
          <div className="jobs-search-input jobs-search-location">
            <span style={{ fontSize: 18, color: "var(--muted)", flexShrink: 0 }}>📍</span>
            <input value={location} onChange={e => setLocation(e.target.value)} placeholder="City or remote" />
          </div>
          <button type="submit" className="submit" style={{ whiteSpace: "nowrap", padding: "14px 24px" }}>Search →</button>
        </form>
      </div>

      <div className="shell jobs-page-layout">
        {/* Sidebar filters */}
        <aside className="jobs-filters-sidebar">
          <div className="jobs-filters-header">
            <span>Filters</span>
            {hasFilters && <button onClick={clearFilters}>Clear all</button>}
          </div>

          <div className="jobs-filter-group">
            <p>Category</p>
            {CATEGORIES.map(c => (
              <label key={c} className="jobs-filter-radio">
                <input type="radio" name="category" checked={category === c} onChange={() => { setCategory(c); setPage(1); }} />
                {c}
              </label>
            ))}
          </div>

          <div className="jobs-filter-group">
            <p>Work mode</p>
            {WORK_MODES.map(m => (
              <label key={m} className="jobs-filter-radio">
                <input type="radio" name="workMode" checked={workMode === m} onChange={() => { setWorkMode(m); setPage(1); }} />
                {m}
              </label>
            ))}
          </div>

          <div className="jobs-filter-group">
            <p>Min salary (LPA)</p>
            <input
              className="jobs-filter-input"
              type="number"
              value={salaryMin}
              onChange={e => { setSalaryMin(e.target.value); setPage(1); }}
              placeholder="e.g. 10"
              min="0"
            />
          </div>

          <div className="jobs-filter-group">
            <p>Sort by</p>
            {SORT_OPTIONS.map(s => (
              <label key={s} className="jobs-filter-radio">
                <input type="radio" name="sort" checked={sortBy === s} onChange={() => { setSortBy(s); setPage(1); }} />
                {s}
              </label>
            ))}
          </div>
        </aside>

        {/* Jobs list */}
        <div className="jobs-list-area">
          {/* Active filter chips */}
          {hasFilters && (
            <div className="jobs-active-filters">
              {query && <span className="jobs-filter-chip">{query} <button onClick={() => setQuery("")}>×</button></span>}
              {location && <span className="jobs-filter-chip">{location} <button onClick={() => setLocation("")}>×</button></span>}
              {category !== "All" && <span className="jobs-filter-chip">{category} <button onClick={() => setCategory("All")}>×</button></span>}
              {workMode !== "Any" && <span className="jobs-filter-chip">{workMode} <button onClick={() => setWorkMode("Any")}>×</button></span>}
              {salaryMin && <span className="jobs-filter-chip">₹{salaryMin}L+ <button onClick={() => setSalaryMin("")}>×</button></span>}
            </div>
          )}

          <div className="jobs-results-row">
            <span>{loading ? "Loading…" : `${jobs.length} result${jobs.length !== 1 ? "s" : ""}${total > jobs.length ? ` of ${total}` : ""}`}</span>
            <div style={{ display: "flex", gap: 8 }}>
              {SORT_OPTIONS.map(s => (
                <button key={s} onClick={() => { setSortBy(s); setPage(1); }} style={{ border: 0, background: "none", font: `${sortBy === s ? "700" : "400"} 12px DM Sans`, color: sortBy === s ? "var(--ink)" : "var(--muted)", cursor: "pointer", textDecoration: sortBy === s ? "underline" : "none" }}>{s}</button>
              ))}
            </div>
          </div>

          {loading ? (
            <div className="jobs-list-grid">
              {Array(PER_PAGE).fill(0).map((_, i) => <div key={i} className="skeleton-card" style={{ height: 200, borderRadius: 10 }} />)}
            </div>
          ) : jobs.length === 0 ? (
            <div className="jobs-empty">
              <p style={{ fontSize: 32 }}>🔍</p>
              <h3>No roles found</h3>
              <p>Try adjusting your filters or search terms.</p>
              <button className="submit" style={{ marginTop: 8, width: "auto", padding: "12px 24px" }} onClick={clearFilters}>Clear filters</button>
            </div>
          ) : (
            <div className="jobs-list-grid">
              {jobs.map(job => {
                const id = job.id || job._id;
                const companyName = job.company?.name || job.company;
                const color = COLOR_MAP[job.category] || "green";
                const initials = (companyName || "?").toString().slice(0, 2).toUpperCase();
                return (
                  <article className="job-card" key={id}>
                    <div className="job-top">
                      <div className={`avatar ${job.color || color}`}>{job.initials || initials}</div>
                      <button className={saved.includes(id) ? "save saved" : "save"} onClick={() => toggleSave(id)} aria-label="Save job">♥</button>
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
                        {job._id && <a href={`/jobs/${job._id}`} style={{ border: 0, background: "none", font: "600 12px DM Sans", color: "var(--muted)", textDecoration: "none" }}>Details</a>}
                        {job._id && <a href={`/apply/${job._id}`} style={{ border: 0, background: "none", font: "600 12px DM Sans", color: "var(--ink)", textDecoration: "none" }}>Apply →</a>}
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="jobs-pagination">
              <button className="jobs-page-btn" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>← Prev</button>
              <div className="jobs-page-numbers">
                {Array.from({ length: totalPages }, (_, i) => i + 1)
                  .filter(n => n === 1 || n === totalPages || Math.abs(n - page) <= 1)
                  .reduce((acc, n, i, arr) => {
                    if (i > 0 && n - arr[i - 1] > 1) acc.push("…");
                    acc.push(n);
                    return acc;
                  }, [])
                  .map((n, i) => n === "…"
                    ? <span key={`ellipsis-${i}`} style={{ padding: "0 4px", color: "var(--muted)" }}>…</span>
                    : <button key={n} className={`jobs-page-btn ${page === n ? "active" : ""}`} onClick={() => setPage(n)}>{n}</button>
                  )}
              </div>
              <button className="jobs-page-btn" disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}>Next →</button>
            </div>
          )}
        </div>
      </div>

      <footer style={{ marginTop: 80 }}>
        <div className="shell footer-inner">
          <a className="brand" href="/"><span>✦</span> TalentLoop</a>
          <p>Good work starts with the right match.</p>
          <span>© 2025 TalentLoop</span>
        </div>
      </footer>
    </main>
  );
}

export default function JobsPage() {
  return (
    <Suspense>
      <JobsPageInner />
    </Suspense>
  );
}
