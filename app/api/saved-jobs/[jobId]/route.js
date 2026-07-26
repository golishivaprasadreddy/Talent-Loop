import { NextResponse } from "next/server";
import { connectDB } from "../../../../lib/db";
import { SavedJob } from "../../../../models";
import { requirePermission } from "../../../../lib/guard";
import { PERMISSIONS } from "../../../../lib/rbac";

export async function DELETE(_, { params }) {
  const guard = await requirePermission(PERMISSIONS.saveJobs);
  if (guard.error) return guard.error;
  await connectDB();
  const { jobId } = await params;
  await SavedJob.findOneAndDelete({ candidate: guard.session.userId, job: jobId });
  return NextResponse.json({ success: true });
}
