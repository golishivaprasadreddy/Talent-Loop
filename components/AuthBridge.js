"use client";

import { useEffect } from "react";
import { authHeaders } from "../lib/client-auth";

export default function AuthBridge() {
  useEffect(() => {
    if (window.__talentLoopFetchPatched) return;
    window.__talentLoopFetchPatched = true;
    const originalFetch = window.fetch.bind(window);

    window.fetch = (input, init = {}) => {
      const url = typeof input === "string" ? input : input?.url;
      const isApiRequest = typeof url === "string" && (url.startsWith("/api/") || url.startsWith(`${window.location.origin}/api/`));
      const isAuthRequest = typeof url === "string" && (url.startsWith("/api/auth/") || url.startsWith(`${window.location.origin}/api/auth/`));
      if (!isApiRequest || isAuthRequest) return originalFetch(input, init);

      const headers = authHeaders(Object.fromEntries(new Headers(init.headers || {}).entries()));
      return originalFetch(input, { ...init, headers });
    };
  }, []);

  return null;
}
