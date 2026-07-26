import { NextResponse } from "next/server";
import { connectDB } from "../../../lib/db";
import { SavedJob } from "../../../models";
import { requirePermission } from "../../../lib/guard";
import { PERMISSIONS } from "../../../lib/rbac";

export async function GET() {
  const guard = await requirePermission(PERMISSIONS.saveJobs);
  if (guard.error) return guard.error;
  await connectDB();
  const saved = await SavedJob.find({ candidate: guard.session.userId }).populate("job", "title company location workMode employmentType salaryMin salaryMax category").sort({ createdAt: -1 }).lean();
  return NextResponse.json({ saved });
}

export async function POST(request) {
  const guard = await requirePermission(PERMISSIONS.saveJobs);
  if (guard.error) return guard.error;
  const { jobId } = await request.json();
  if (!jobId) return NextResponse.json({ error: "jobId is required." }, { status: 400 });
  await connectDB();
  try {
    const saved = await SavedJob.create({ candidate: guard.session.userId, job: jobId });
    return NextResponse.json({ saved }, { status: 201 });
  } catch (error) {
    if (error?.code === 11000) return NextResponse.json({ error: "Already saved." }, { status: 409 });
    return NextResponse.json({ error: "Unable to save job." }, { status: 400 });
  }
}
