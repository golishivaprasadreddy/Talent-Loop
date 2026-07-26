import { NextResponse } from "next/server";
import { connectDB } from "../../../../lib/db";
import { Job } from "../../../../models";
import { requireRole } from "../../../../lib/guard";

export async function GET() {
  const guard = await requireRole("admin");
  if (guard.error) return guard.error;
  await connectDB();
  const jobs = await Job.find().populate("company", "name").sort({ createdAt: -1 }).limit(200).lean();
  return NextResponse.json({ jobs });
}
