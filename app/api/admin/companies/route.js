import { NextResponse } from "next/server";
import { connectDB } from "../../../../lib/db";
import { Company } from "../../../../models";
import { requireRole } from "../../../../lib/guard";

export async function GET() {
  const guard = await requireRole("admin");
  if (guard.error) return guard.error;
  await connectDB();
  const companies = await Company.find().populate("owner", "name email").sort({ createdAt: -1 }).lean();
  return NextResponse.json({ companies });
}
