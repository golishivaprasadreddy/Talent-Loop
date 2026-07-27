import { headers, cookies } from "next/headers";
import { createSessionToken, verifySessionToken } from "./session-token";

export async function createSession(user, remember = false) {
  return createSessionToken(user, remember);
}

export async function getSession() {
  const hdrs = await headers();
  const authHeader = hdrs.get("authorization");
  const bearerToken = authHeader?.match(/^Bearer\s+(.+)$/i)?.[1];
  if (bearerToken) return verifySessionToken(bearerToken);
  const cookieToken = (await cookies()).get("token")?.value;
  return verifySessionToken(cookieToken);
}

export async function getSessionFromRequest(request) {
  const authHeader = request.headers.get("authorization");
  const bearerToken = authHeader?.match(/^Bearer\s+(.+)$/i)?.[1];
  if (bearerToken) return verifySessionToken(bearerToken);
  const cookieToken = request.cookies.get("token")?.value;
  return verifySessionToken(cookieToken);
}
