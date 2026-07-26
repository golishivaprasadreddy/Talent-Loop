import { NextResponse } from "next/server";
import { connectDB } from "../../../../lib/db";
import { Job, Application, Company } from "../../../../models";
import { requirePermission } from "../../../../lib/guard";
import { PERMISSIONS } from "../../../../lib/rbac";

export async function GET() {
  const guard = await requirePermission(PERMISSIONS.viewRecruiterDashboard);
  if (guard.error) return guard.error;
  await connectDB();

  const company = await Company.findOne({ owner: guard.session.userId }).lean();
  if (!company) return NextResponse.json({ stats: {}, jobs: [], applicants: [], company: null, monthly: {} });

  const jobs = await Job.find({ company: company._id }).sort({ createdAt: -1 }).lean();
  const jobIds = jobs.map(j => j._id);

  const [applicants, thisWeekApps] = await Promise.all([
    Application.find({ job: { $in: jobIds } })
      .populate("candidate", "name email avatar skills resumeUrl portfolio")
      .populate("job", "title")
      .sort({ createdAt: -1 })
      .limit(50)
      .lean(),
    Application.countDocuments({ job: { $in: jobIds }, createdAt: { $gte: new Date(Date.now() - 7 * 86400000) } }),
  ]);

  const activeJobs = jobs.filter(j => j.status === "published").length;
  const closedJobs = jobs.filter(j => j.status === "closed").length;
  const shortlisted = applicants.filter(a => ["shortlisted", "interview", "offered"].includes(a.status)).length;
  const totalViews = jobs.reduce((sum, j) => sum + (j.views || 0), 0);

  // Monthly applications for last 6 months
  const monthly = {};
  const now = new Date();
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    monthly[d.toLocaleString("default", { month: "short" })] = 0;
  }
  applicants.forEach(app => {
    const key = new Date(app.createdAt).toLocaleString("default", { month: "short" });
    if (key in monthly) monthly[key]++;
  });

  return NextResponse.json({
    stats: { activeJobs, closedJobs, totalApplicants: applicants.length, shortlisted, totalViews, thisWeekApps },
    jobs,
    applicants,
    company,
    monthly,
  });
}
