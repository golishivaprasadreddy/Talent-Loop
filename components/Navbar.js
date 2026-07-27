"use client";
import { useEffect, useRef, useState } from "react";

export default function Navbar() {
  const [user, setUser] = useState(undefined);
  const [open, setOpen] = useState(false);
  const [mobileMenu, setMobileMenu] = useState(false);
  const ref = useRef();

  useEffect(() => {
    fetch("/api/profile").then(r => r.ok ? r.json() : null).then(d => setUser(d?.user || null));
  }, []);

  useEffect(() => {
    function close(e) { if (ref.current && !ref.current.contains(e.target)) setOpen(false); }
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, []);

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    window.location.href = "/";
  }

  const initials = user?.name
    ? user.name.split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase()
    : user?.email?.[0]?.toUpperCase() || "";

  const dashPath = user?.role === "recruiter"
    ? "/dashboard/recruiter"
    : user?.role === "admin"
    ? "/dashboard/admin"
    : "/dashboard/candidate";

  return (
    <>
      <nav className="nav shell global-nav">
        <a className="brand" href="/"><span>✦</span> TalentLoop</a>
        <div className="navlinks">
          <a href="/#jobs">Find jobs</a>
          <a href="/#features">Platform</a>
          <a href="/#how">How it works</a>

          {/* loading skeleton */}
          {user === undefined && (
            <div style={{ width: 36, height: 36, borderRadius: "50%", background: "var(--line)" }} />
          )}

          {/* logged out */}
          {user === null && (
            <>
              <a href="/login" className="nav-login-btn">Login</a>
              <a href="/register" className="nav-button">Get started</a>
            </>
          )}

          {/* logged in — avatar dropdown */}
          {user && (
            <div ref={ref} style={{ position: "relative" }}>
              <button
                onClick={() => setOpen(o => !o)}
                className="nav-avatar-btn"
                aria-label="Account menu"
              >
                {user.avatar
                  ? <img src={user.avatar} alt={user.name} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                  : initials}
              </button>
              {open && (
                <div className="nav-dropdown">
                  <div className="nav-dropdown-header">
                    <p>{user.name || "Account"}</p>
                    <span>{user.email}</span>
                    <em>{user.role}</em>
                  </div>
                  <a href={dashPath} onClick={() => setOpen(false)}>Dashboard</a>
                  {user.role === "candidate" && (
                    <a href={`${dashPath}?tab=${encodeURIComponent("Saved jobs")}`} onClick={() => setOpen(false)}>Saved jobs</a>
                  )}
                  <a href={`${dashPath}?tab=Profile`} onClick={() => setOpen(false)}>Edit profile</a>
                  <button onClick={logout}>Log out</button>
                </div>
              )}
            </div>
          )}

          <button className="nav-hamburger" onClick={() => setMobileMenu(true)} aria-label="Open menu">☰</button>
        </div>
      </nav>

      {/* Mobile menu */}
      <div className={`mobile-menu ${mobileMenu ? "open" : ""}`}>
        <button className="mobile-menu-close" onClick={() => setMobileMenu(false)}>×</button>
        <a href="/#jobs" onClick={() => setMobileMenu(false)}>Find jobs</a>
        <a href="/#features" onClick={() => setMobileMenu(false)}>Platform</a>
        <a href="/#how" onClick={() => setMobileMenu(false)}>How it works</a>
        {user === null && <a href="/login" onClick={() => setMobileMenu(false)}>Login</a>}
        {user === null && <a href="/register" onClick={() => setMobileMenu(false)}>Get started</a>}
        {user && <a href={dashPath} onClick={() => setMobileMenu(false)}>Dashboard</a>}
        {user && <button className="mobile-link" onClick={async () => { await fetch("/api/auth/logout", { method: "POST" }); window.location.href = "/"; }}>Log out</button>}
      </div>
    </>
  );
}
