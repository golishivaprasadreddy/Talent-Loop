import { NextResponse } from "next/server";
import { connectDB } from "../../../../lib/db";
import { User, Company, Job, Application } from "../../../../models";
import { requireRole } from "../../../../lib/guard";

export async function GET() {
  const guard = await requireRole("admin");
  if (guard.error) return guard.error;
  await connectDB();
  const [totalUsers, totalRecruiters, pendingCompanies, activeJobs, totalApplications, suspendedUsers] = await Promise.all([
    User.countDocuments(),
    User.countDocuments({ role: "recruiter" }),
    Company.countDocuments({ approved: false }),
    Job.countDocuments({ status: "published" }),
    Application.countDocuments(),
    User.countDocuments({ suspended: true }),
  ]);
  return NextResponse.json({ stats: { totalUsers, totalRecruiters, pendingCompanies, activeJobs, totalApplications, suspendedUsers } });
}
