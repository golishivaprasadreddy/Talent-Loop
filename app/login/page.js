"use client";
import { useEffect } from "react";
import { getAuthToken } from "../../lib/client-auth";
import AuthForm from "../../components/AuthForm";

export default function LoginPage() {
  useEffect(() => {
    if (getAuthToken()) window.location.replace("/dashboard");
  }, []);

  if (typeof window !== "undefined" && getAuthToken()) return null;
  return <AuthForm mode="login" />;
}
