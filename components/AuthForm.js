"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

export default function AuthForm({ mode }) {
  const register = mode === "register"; const [form, setForm] = useState({ name: "", email: "", password: "", role: "candidate", companyName: "", remember: true }); const [error, setError] = useState(""); const [loading, setLoading] = useState(false); const router = useRouter();
  async function submit(event) {
    event.preventDefault();
    setLoading(true);
    setError("");

    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{8,}$/;

    if (register) {
      if (!form.name || form.name.trim().length < 2) {
        setLoading(false);
        return setError("Full name must contain at least 2 characters.");
      }
      if (!passwordRegex.test(form.password)) {
        setLoading(false);
        return setError("Password must be at least 8 characters and include uppercase, lowercase, a number, and a special character.");
      }
      if (form.role === "recruiter" && !form.companyName?.trim()) {
        setLoading(false);
        return setError("Company name is required for recruiters.");
      }
    }

    const payload = {
      name: form.name,
      email: form.email,
      password: form.password,
      role: form.role,
      remember: form.remember,
      companyName: form.role === "recruiter" ? form.companyName : undefined,
    };

    const response = await fetch(`/api/auth/${register ? "register" : "login"}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      credentials: "same-origin",
    });

    const data = await response.json();
    setLoading(false);
    if (!response.ok) return setError(data.error);
    router.push(data.user.role === "recruiter" ? "/recruiter" : data.user.role === "admin" ? "/admin" : "/dashboard");
    router.refresh();
  }
  return <main className="auth-page"><a className="brand" href="/"><span>✦</span> TalentLoop</a><section className="auth-card"><p className="eyebrow">{register ? "JOIN TALENTLOOP" : "WELCOME BACK"}</p><h1>{register ? "Your next chapter starts here." : "Good to see you again."}</h1><p>{register ? "Create a candidate profile or register your company." : "Sign in to continue your job search or hiring work."}</p><form onSubmit={submit}>{register && <label>Full name<input name="name" required value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="Your full name" /></label>}<label>Email address<input name="email" required type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} placeholder="you@example.com" /></label><label>Password<input name="password" required minLength="8" type="password" value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} placeholder="At least 8 characters" /></label>{register && <><label>I am a<select name="role" value={form.role} onChange={e => setForm({ ...form, role: e.target.value })}><option value="candidate">Candidate</option><option value="recruiter">Recruiter / company</option></select></label>{form.role === "recruiter" && <label>Company name<input name="companyName" required value={form.companyName} onChange={e => setForm({ ...form, companyName: e.target.value })} placeholder="Company name" /></label>}</>}<label className="check"><input name="remember" type="checkbox" checked={form.remember} onChange={e => setForm({ ...form, remember: e.target.checked })} /> Remember me</label>{error && <p className="form-error">{error}</p>}<button className="submit" disabled={loading}>{loading ? "Please wait…" : register ? "Create account →" : "Sign in →"}</button></form>{!register && <a className="forgot" href="/forgot-password">Forgot password?</a>}<p className="auth-switch">{register ? "Already have an account?" : "New to TalentLoop?"} <a href={register ? "/login" : "/register"}>{register ? "Sign in" : "Create an account"}</a></p></section></main>;
}
