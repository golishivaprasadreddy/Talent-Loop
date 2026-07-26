import { NextResponse } from "next/server";
import { connectDB } from "../../../../lib/db";
import { Application, SavedJob, Notification } from "../../../../models";
import { requirePermission } from "../../../../lib/guard";
import { PERMISSIONS } from "../../../../lib/rbac";

export async function GET() {
  const guard = await requirePermission(PERMISSIONS.viewCandidateDashboard);
  if (guard.error) return guard.error;
  await connectDB();
  const userId = guard.session.userId;

  const [applications, savedCount, unreadCount] = await Promise.all([
    Application.find({ candidate: userId })
      .populate({ path: "job", select: "title company location workMode employmentType", populate: { path: "company", select: "name" } })
      .sort({ createdAt: -1 })
      .limit(50)
      .lean(),
    SavedJob.countDocuments({ candidate: userId }),
    Notification.countDocuments({ user: userId, read: false }),
  ]);

  const total = applications.length;
  const interviews = applications.filter(a => a.status === "interview").length;
  const offered = applications.filter(a => a.status === "offered").length;
  const thisWeek = applications.filter(a => Date.now() - new Date(a.createdAt) < 7 * 86400000).length;

  // Monthly breakdown for last 6 months
  const monthly = {};
  const now = new Date();
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const key = d.toLocaleString("default", { month: "short" });
    monthly[key] = 0;
  }
  applications.forEach(app => {
    const d = new Date(app.createdAt);
    const key = d.toLocaleString("default", { month: "short" });
    if (key in monthly) monthly[key]++;
  });

  const successRate = total ? Math.round((offered / total) * 100) : 0;
  const interviewRate = total ? Math.round((interviews / total) * 100) : 0;

  return NextResponse.json({
    stats: { total, interviews, offered, savedCount, unreadCount, thisWeek, successRate, interviewRate },
    applications,
    monthly,
  });
}
