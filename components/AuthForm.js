"use client";
import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { setAuthToken } from "../lib/client-auth";

const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{8,}$/;

export default function AuthForm({ mode }) {
  const register = mode === "register";
  const router = useRouter();
  const logoRef = useRef(null);

  const [step, setStep] = useState(0); // 0 = account, 1 = company (recruiter only)
  const [form, setForm] = useState({
    name: "", email: "", password: "", role: "candidate", remember: true,
    companyName: "", companyLogo: "", companyDescription: "", companyWebsite: "",
    companyIndustry: "", companySize: "", companyHeadquarters: "",
  });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  function set(field) {
    return (e) => setForm((f) => ({ ...f, [field]: e.target.value }));
  }

  function handleLogo(file) {
    if (!file) return;
    if (!file.type.startsWith("image/")) { setError("Please upload an image file."); return; }
    if (file.size > 2 * 1024 * 1024) { setError("Logo must be under 2 MB."); return; }
    const reader = new FileReader();
    reader.onload = () => setForm((f) => ({ ...f, companyLogo: reader.result }));
    reader.readAsDataURL(file);
  }

  function nextStep(e) {
    e.preventDefault();
    setError("");
    if (!form.name || form.name.trim().length < 2) return setError("Full name must contain at least 2 characters.");
    if (!passwordRegex.test(form.password)) return setError("Password must be at least 8 characters and include uppercase, lowercase, a number, and a special character.");
    setStep(1);
  }

  async function submit(e) {
    e.preventDefault();
    setError("");
    if (register && form.role === "recruiter" && !form.companyName.trim()) return setError("Company name is required.");
    setLoading(true);
    const payload = {
      name: form.name, email: form.email, password: form.password,
      role: form.role, remember: form.remember,
      ...(form.role === "recruiter" && {
        companyName: form.companyName,
        companyLogo: form.companyLogo || undefined,
        companyDescription: form.companyDescription || undefined,
        companyWebsite: form.companyWebsite || undefined,
        companyIndustry: form.companyIndustry || undefined,
        companySize: form.companySize || undefined,
        companyHeadquarters: form.companyHeadquarters || undefined,
      }),
    };
    let res;
    let data;
    try {
      res = await fetch(`/api/auth/${register ? "register" : "login"}`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      data = await res.json();
    } catch {
      setLoading(false);
      return setError("Unable to reach the authentication server.");
    }
    setLoading(false);
    if (!res.ok) return setError(data.error || "Authentication failed.");
    setAuthToken(data.token);
    router.push(data.user.role === "recruiter" ? "/dashboard/recruiter" : data.user.role === "admin" ? "/dashboard/admin" : register ? "/profile/setup" : "/dashboard/candidate");
    router.refresh();
  }

  // Login form — unchanged simple layout
  if (!register) {
    return (
      <main className="auth-page">
       
        <section className="auth-card">
          <p className="eyebrow">WELCOME BACK</p>
          <h1>Good to see you again.</h1>
          <p>Sign in to continue your job search or hiring work.</p>
          <form onSubmit={submit}>
            <label>Email address<input name="email" required type="email" value={form.email} onChange={set("email")} placeholder="you@example.com" /></label>
            <label>Password<input name="password" required minLength="8" type="password" value={form.password} onChange={set("password")} placeholder="At least 8 characters" /></label>
            <label className="check"><input name="remember" type="checkbox" checked={form.remember} onChange={(e) => setForm((f) => ({ ...f, remember: e.target.checked }))} /> Remember me</label>
            {error && <p className="form-error">{error}</p>}
            <button className="submit" disabled={loading}>{loading ? "Please wait…" : "Sign in →"}</button>
          </form>
          <a className="forgot" href="/forgot-password">Forgot password?</a>
          <p className="auth-switch">New to TalentLoop? <a href="/register">Create an account</a></p>
        </section>
      </main>
    );
  }

  // Register — step 0: account details
  const isRecruiter = form.role === "recruiter";

  return (
    <main className="auth-page">
     
      <section className="auth-card">
        <p className="eyebrow">JOIN TALENTLOOP</p>
        <h1>Your next chapter starts here.</h1>
        {isRecruiter && step === 0 && <p>Step 1 of 2 — Account details</p>}
        {isRecruiter && step === 1 && <p>Step 2 of 2 — Company profile</p>}
        {!isRecruiter && <p>Create a candidate profile or register your company.</p>}

        {/* Step 0 — account */}
        {step === 0 && (
          <form onSubmit={isRecruiter ? nextStep : submit}>
            <label>Full name<input name="name" required value={form.name} onChange={set("name")} placeholder="Your full name" /></label>
            <label>Email address<input name="email" required type="email" value={form.email} onChange={set("email")} placeholder="you@example.com" /></label>
            <label>Password<input name="password" required minLength="8" type="password" value={form.password} onChange={set("password")} placeholder="At least 8 characters" /></label>
            <label>I am a
              <select name="role" value={form.role} onChange={set("role")}>
                <option value="candidate">Candidate</option>
                <option value="recruiter">Recruiter / company</option>
              </select>
            </label>
            <label className="check"><input name="remember" type="checkbox" checked={form.remember} onChange={(e) => setForm((f) => ({ ...f, remember: e.target.checked }))} /> Remember me</label>
            {error && <p className="form-error">{error}</p>}
            <button className="submit" disabled={loading}>
              {isRecruiter ? "Continue →" : (loading ? "Please wait…" : "Create account →")}
            </button>
          </form>
        )}

        {/* Step 1 — company profile (recruiter only) */}
        {step === 1 && isRecruiter && (
          <form onSubmit={submit}>
            {/* Logo upload */}
            <div style={{ display: "grid", gap: 8 }}>
              <span style={{ fontSize: 12, fontWeight: 600, color: "#34423a" }}>Company logo</span>
              <div
                style={{ display: "flex", alignItems: "center", gap: 14, padding: "14px", border: "1px dashed #9daa9f", borderRadius: 8, cursor: "pointer", background: "#fbfcf6" }}
                onClick={() => logoRef.current?.click()}
              >
                {form.companyLogo
                  ? <img src={form.companyLogo} alt="Logo preview" style={{ width: 52, height: 52, objectFit: "contain", borderRadius: 8, border: "1px solid #e1e5dc" }} />
                  : <div style={{ width: 52, height: 52, borderRadius: 8, background: "#e8eddf", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22 }}>🏢</div>}
                <div>
                  <p style={{ margin: 0, fontSize: 13, fontWeight: 600, color: "#34423a" }}>{form.companyLogo ? "Change logo" : "Upload logo"}</p>
                  <p style={{ margin: "2px 0 0", fontSize: 11, color: "#6f7b74" }}>PNG, JPG · max 2 MB</p>
                </div>
              </div>
              <input ref={logoRef} type="file" accept="image/*" style={{ display: "none" }} onChange={(e) => handleLogo(e.target.files?.[0])} />
            </div>

            <label>Company name <span className="req">*</span>
              <input required value={form.companyName} onChange={set("companyName")} placeholder="Acme Inc." />
            </label>
            <label>Description
              <textarea rows={3} style={{ width: "100%", border: "1px solid #cbd1c9", borderRadius: 6, padding: 10, font: "14px 'DM Sans'", resize: "vertical" }}
                value={form.companyDescription} onChange={set("companyDescription")} placeholder="What does your company do?" />
            </label>
            <label>Website<input value={form.companyWebsite} onChange={set("companyWebsite")} placeholder="https://yourcompany.com" /></label>
            <label>Industry<input value={form.companyIndustry} onChange={set("companyIndustry")} placeholder="e.g. SaaS, Fintech, Healthcare" /></label>
            <label>Company size
              <select value={form.companySize} onChange={set("companySize")}>
                <option value="">Select size…</option>
                <option>1–10</option><option>11–50</option><option>51–200</option>
                <option>201–500</option><option>501–1000</option><option>1000+</option>
              </select>
            </label>
            <label>Headquarters<input value={form.companyHeadquarters} onChange={set("companyHeadquarters")} placeholder="e.g. Bengaluru, India" /></label>

            {error && <p className="form-error">{error}</p>}
            <div style={{ display: "flex", gap: 10 }}>
              <button type="button" className="apply-back" style={{ flex: 1 }} onClick={() => { setStep(0); setError(""); }}>← Back</button>
              <button className="submit" style={{ flex: 2 }} disabled={loading}>{loading ? "Creating account…" : "Create account →"}</button>
            </div>
          </form>
        )}

        <p className="auth-switch">Already have an account? <a href="/login">Sign in</a></p>
      </section>
    </main>
  );
}
