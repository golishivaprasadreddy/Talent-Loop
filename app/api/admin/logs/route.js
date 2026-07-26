import { NextResponse } from "next/server";
import { connectDB } from "../../../../lib/db";
import { AdminLog } from "../../../../models";
import { requireRole } from "../../../../lib/guard";

export async function GET() {
  const guard = await requireRole("admin");
  if (guard.error) return guard.error;
  await connectDB();
  const logs = await AdminLog.find()
    .populate("admin", "name email")
    .sort({ createdAt: -1 })
    .limit(200)
    .lean();
  return NextResponse.json({ logs });
}

export async function POST(request) {
  const guard = await requireRole("admin");
  if (guard.error) return guard.error;
  const { action, target, targetId, details } = await request.json();
  if (!action) return NextResponse.json({ error: "action is required." }, { status: 400 });
  await connectDB();
  const log = await AdminLog.create({ admin: guard.session.userId, action, target, targetId, details });
  return NextResponse.json({ log }, { status: 201 });
}
