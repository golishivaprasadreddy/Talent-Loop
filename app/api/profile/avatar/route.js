import { NextResponse } from "next/server";
import { connectDB } from "../../../../lib/db";
import { User } from "../../../../models";
import { requirePermission } from "../../../../lib/guard";
import { PERMISSIONS } from "../../../../lib/rbac";

export async function GET() {
  const guard = await requirePermission(PERMISSIONS.manageOwnProfile);
  if (guard.error) return guard.error;
  await connectDB();
  const user = await User.findById(guard.session.userId).select("avatar").lean();
  return NextResponse.json({ avatar: user?.avatar || null });
}
