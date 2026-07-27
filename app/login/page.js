"use client";
import { useEffect } from "react";
import { clearAuthToken, getAuthToken } from "../../lib/client-auth";
import AuthForm from "../../components/AuthForm";

export default function LoginPage() {
  useEffect(() => {
    const token = getAuthToken();
    if (!token) return;

    fetch("/api/profile", { headers: { Authorization: `Bearer ${token}` } })
      .then((res) => res.ok ? res.json() : null)
      .then((data) => {
        if (!data?.user) {
          clearAuthToken();
          return;
        }
        const path = data.user.role === "recruiter"
          ? "/dashboard/recruiter"
          : data.user.role === "admin"
          ? "/dashboard/admin"
          : "/dashboard/candidate";
        window.location.replace(path);
      })
      .catch(() => clearAuthToken());
  }, []);

  return <AuthForm mode="login" />;
}
