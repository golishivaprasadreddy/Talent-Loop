import { NextResponse } from "next/server";
import { connectDB } from "../../../../lib/db";
import { Notification } from "../../../../models";
import { requirePermission } from "../../../../lib/guard";
import { PERMISSIONS } from "../../../../lib/rbac";

export async function PATCH(_, { params }) {
  const guard = await requirePermission(PERMISSIONS.readNotifications);
  if (guard.error) return guard.error;
  await connectDB();
  const { id } = await params;
  const notification = await Notification.findOneAndUpdate({ _id: id, user: guard.session.userId }, { $set: { read: true } }, { new: true });
  if (!notification) return NextResponse.json({ error: "Not found." }, { status: 404 });
  return NextResponse.json({ notification });
}
