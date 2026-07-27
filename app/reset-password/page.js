"use client";
import { useState, useEffect, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";

function ResetForm() {
  const params = useSearchParams();
  const router = useRouter();
  const token = params.get("token");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);

  useEffect(() => { if (!token) setError("Invalid or missing reset token."); }, [token]);

  async function submit(e) {
    e.preventDefault();
    if (password !== confirm) return setError("Passwords do not match.");
    setLoading(true); setError("");
    const res = await fetch("/api/auth/reset-password", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ token, password }) });
    const data = await res.json(); setLoading(false);
    if (!res.ok) return setError(data.error || "Unable to reset password.");
    setDone(true);
    setTimeout(() => router.push("/login"), 2500);
  }

  return (
    <main className="auth-page">
      
      <section className="auth-card">
        <p className="eyebrow">ACCOUNT RECOVERY</p>
        <h1>Choose a new password.</h1>
        {done ? (
          <p>Password updated. Redirecting you to sign in…</p>
        ) : (
          <form onSubmit={submit}>
            <label>New password<input type="password" required minLength={8} value={password} onChange={e => setPassword(e.target.value)} placeholder="At least 8 characters" /></label>
            <label>Confirm password<input type="password" required minLength={8} value={confirm} onChange={e => setConfirm(e.target.value)} placeholder="Repeat your new password" /></label>
            {error && <p className="form-error">{error}</p>}
            <button className="submit" disabled={loading || !token}>{loading ? "Saving…" : "Set new password →"}</button>
          </form>
        )}
        <p className="auth-switch"><a href="/login">Back to sign in</a></p>
      </section>
    </main>
  );
}

export default function ResetPasswordPage() {
  return <Suspense><ResetForm /></Suspense>;
}
