import { NextResponse } from "next/server";
import { connectDB } from "../../../lib/db";
import { Notification } from "../../../models";
import { requirePermission } from "../../../lib/guard";
import { PERMISSIONS } from "../../../lib/rbac";

export async function GET() {
  const guard = await requirePermission(PERMISSIONS.readNotifications);
  if (guard.error) return guard.error;
  await connectDB();
  const notifications = await Notification.find({ user: guard.session.userId }).sort({ createdAt: -1 }).limit(30).lean();
  return NextResponse.json({ notifications });
}

// Mark all as read
export async function PATCH() {
  const guard = await requirePermission(PERMISSIONS.readNotifications);
  if (guard.error) return guard.error;
  await connectDB();
  await Notification.updateMany({ user: guard.session.userId, read: false }, { $set: { read: true } });
  return NextResponse.json({ success: true });
}
