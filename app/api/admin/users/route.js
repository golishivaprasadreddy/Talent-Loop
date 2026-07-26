import { NextResponse } from "next/server";
import { connectDB } from "../../../../lib/db";
import { User } from "../../../../models";
import { requireRole } from "../../../../lib/guard";

export async function GET() {
  const guard = await requireRole("admin");
  if (guard.error) return guard.error;
  await connectDB();
  const users = await User.find().select("-passwordHash -resetToken -resetTokenExpiry").sort({ createdAt: -1 }).limit(200).lean();
  return NextResponse.json({ users });
}
