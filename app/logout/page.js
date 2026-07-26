"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function LogoutPage() {
  const router = useRouter();
  useEffect(() => {
    fetch("/api/auth/logout", { method: "POST" }).finally(() => router.push("/"));
  }, [router]);
  return (
    <main style={{ minHeight: "100vh", background: "var(--cream)", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <p style={{ font: "500 10px DM Mono", letterSpacing: "1.8px", color: "#77827c" }}>SIGNING OUT…</p>
    </main>
  );
}
