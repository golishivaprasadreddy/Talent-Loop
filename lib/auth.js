import { headers, cookies } from "next/headers";
import { createSessionToken, SESSION_COOKIE, verifySessionToken } from "./session-token";

export { SESSION_COOKIE };

export async function createSession(user, remember = false) {
  return createSessionToken(user, remember);
}

export async function getSession() {
  const hdrs = await headers();
  const authHeader = hdrs.get("authorization");
  const bearerToken = authHeader?.match(/^Bearer\s+(.+)$/i)?.[1];
  if (bearerToken) return verifySessionToken(bearerToken);
  const cookieToken = (await cookies()).get(SESSION_COOKIE)?.value;
  return verifySessionToken(cookieToken);
}

export async function getSessionFromRequest(request) {
  const authHeader = request.headers.get("authorization");
  const bearerToken = authHeader?.match(/^Bearer\s+(.+)$/i)?.[1];
  if (bearerToken) return verifySessionToken(bearerToken);
  const cookieToken = request.cookies.get(SESSION_COOKIE)?.value;
  return verifySessionToken(cookieToken);
}

export function sessionCookie(token, remember = false) {
  return {
    name: SESSION_COOKIE,
    value: token,
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: remember ? 60 * 60 * 24 * 30 : 60 * 60 * 24 * 7,
  };
}

export const clearSessionCookie = {
  name: SESSION_COOKIE,
  value: "",
  httpOnly: true,
  sameSite: "lax",
  secure: process.env.NODE_ENV === "production",
  path: "/",
  maxAge: 0,
};
