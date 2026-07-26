export default function NotFound() {
  return (
    <main style={{ minHeight: "100vh", background: "var(--cream)", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", textAlign: "center", padding: "0 24px" }}>
      <a className="brand" href="/" style={{ marginBottom: 48 }}><span>✦</span> TalentLoop</a>
      <p className="eyebrow">404 — PAGE NOT FOUND</p>
      <h1 style={{ font: "600 clamp(48px,8vw,96px)/1 Fraunces", letterSpacing: "-4px", margin: "16px 0 20px" }}>Lost in the loop.</h1>
      <p style={{ color: "var(--muted)", fontSize: 16, maxWidth: 400, lineHeight: 1.6, marginBottom: 36 }}>The page you're looking for doesn't exist or has been moved.</p>
      <a href="/" className="nav-button" style={{ textDecoration: "none" }}>Back to home →</a>
    </main>
  );
}
