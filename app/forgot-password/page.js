"use client";
import { useState } from "react";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [resetUrl, setResetUrl] = useState("");
  const [done, setDone] = useState(false);
  const [error, setError] = useState("");

  async function submit(e) {
    e.preventDefault(); setLoading(true); setError("");
    const res = await fetch("/api/auth/forgot-password", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email }) });
    const data = await res.json(); setLoading(false);
    if (!res.ok) return setError(data.error || "Something went wrong.");
    setDone(true);
    if (data.resetUrl) setResetUrl(data.resetUrl);
  }

  return (
    <main className="auth-page">
      <a className="brand" href="/"><span>✦</span> TalentLoop</a>
      <section className="auth-card">
        <p className="eyebrow">ACCOUNT RECOVERY</p>
        <h1>Reset your password.</h1>
        {!done ? (
          <>
            <p>Enter your email and we'll send secure reset instructions.</p>
            <form onSubmit={submit}>
              <label>Email address<input type="email" required value={email} onChange={e => setEmail(e.target.value)} placeholder="you@example.com" /></label>
              {error && <p className="form-error">{error}</p>}
              <button className="submit" disabled={loading}>{loading ? "Sending…" : "Send reset link →"}</button>
            </form>
          </>
        ) : (
          <>
            <p>If an account exists for <strong>{email}</strong>, a reset link has been sent.</p>
            {resetUrl && (
              <div style={{ marginTop: 16, padding: "12px 14px", background: "#edf3d9", borderRadius: 7, fontSize: 12 }}>
                <p style={{ margin: "0 0 6px", fontWeight: 600, color: "#41531a" }}>Dev mode — reset link:</p>
                <a href={resetUrl} style={{ color: "#48651a", wordBreak: "break-all" }}>{resetUrl}</a>
              </div>
            )}
          </>
        )}
        <p className="auth-switch"><a href="/login">Back to sign in</a></p>
      </section>
    </main>
  );
}
