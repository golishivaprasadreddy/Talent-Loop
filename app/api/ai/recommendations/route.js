import { NextResponse } from "next/server";
import { connectDB } from "../../../../lib/db";
import { Job, Application, SavedJob, User } from "../../../../models";
import { requirePermission } from "../../../../lib/guard";
import { PERMISSIONS } from "../../../../lib/rbac";

export async function GET() {
  const guard = await requirePermission(PERMISSIONS.useCandidateAi);
  if (guard.error) return guard.error;
  await connectDB();

  const userId = guard.session.userId;
  const [user, applied, saved] = await Promise.all([
    User.findById(userId).lean(),
    Application.find({ candidate: userId }).distinct("job"),
    SavedJob.find({ candidate: userId }).distinct("job"),
  ]);

  const skills = (user?.skills || []).map((s) => s.toLowerCase());
  const experience = user?.experience || "";

  // Build a set of "interest signals" from saved job skills
  const savedJobs = await Job.find({ _id: { $in: saved } }).lean();
  const interestSkills = [...new Set(savedJobs.flatMap((j) => (j.skills || []).map((s) => s.toLowerCase())))];
  const allSignalSkills = [...new Set([...skills, ...interestSkills])];

  const jobs = await Job.find({ status: "published", _id: { $nin: applied } })
    .populate("company", "name logo")
    .limit(100)
    .lean();

  const scored = jobs
    .map((job) => {
      const jobSkills = (job.skills || []).map((s) => s.toLowerCase());
      const skillMatches = allSignalSkills.filter((s) => jobSkills.includes(s)).length;
      const skillScore = jobSkills.length ? Math.round((skillMatches / jobSkills.length) * 100) : 0;

      // Boost if candidate saved a similar job (same company or overlapping skills)
      const savedBoost = saved.some((id) => id.toString() === job._id.toString()) ? 0 :
        savedJobs.some((sj) => (sj.skills || []).some((s) => jobSkills.includes(s.toLowerCase()))) ? 10 : 0;

      // Experience level match boost
      const expBoost = experience && job.experience && job.experience.toLowerCase().includes(experience.toLowerCase().split(" ")[0]) ? 8 : 0;

      return { ...job, matchScore: Math.min(100, skillScore + savedBoost + expBoost) };
    })
    .sort((a, b) => b.matchScore - a.matchScore)
    .slice(0, 12);

  return NextResponse.json({ jobs: scored });
}
