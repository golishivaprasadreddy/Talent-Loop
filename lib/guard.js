import { NextResponse } from "next/server";
import { getSession } from "./auth";
import { can, canAny, hasRole } from "./rbac";

export async function requireRole(...roles) {
  const session = await getSession();
  if (!session || (roles.length && !hasRole(session.role, roles))) {
    return { error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
  }
  return { session };
}

export async function requirePermission(...permissions) {
  const session = await getSession();
  if (!session || (permissions.length && !canAny(session.role, permissions))) {
    return { error: NextResponse.json({ error: "Forbidden" }, { status: session ? 403 : 401 }) };
  }
  return { session };
}

export function assertPermission(session, permission) {
  return can(session?.role, permission);
}
