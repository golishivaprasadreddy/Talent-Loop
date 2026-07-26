"use client";
export default function GlobalError({ reset }) {
  return (
    <html><body style={{ margin: 0, background: "#f6f4ed", fontFamily: "DM Sans, sans-serif" }}>
      <main style={{ minHeight: "100vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", textAlign: "center", padding: "0 24px" }}>
        <p style={{ font: "500 10px DM Mono", letterSpacing: "1.8px", color: "#77827c", margin: "0 0 16px" }}>500 — SOMETHING WENT WRONG</p>
        <h1 style={{ font: "600 clamp(48px,8vw,96px)/1 Fraunces", letterSpacing: "-4px", margin: "0 0 20px" }}>Unexpected error.</h1>
        <p style={{ color: "#67716c", fontSize: 16, maxWidth: 400, lineHeight: 1.6, marginBottom: 36 }}>An unexpected error occurred. Our team has been notified.</p>
        <button onClick={reset} style={{ background: "#18251f", color: "white", border: 0, padding: "12px 20px", borderRadius: 7, font: "600 14px DM Sans", cursor: "pointer" }}>Try again →</button>
      </main>
    </body></html>
  );
}
