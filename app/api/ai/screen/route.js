import { NextResponse } from "next/server";
import { connectDB } from "../../../../lib/db";
import { Application, Job } from "../../../../models";
import { requirePermission } from "../../../../lib/guard";
import { PERMISSIONS } from "../../../../lib/rbac";
import { screenApplicant } from "../../../../lib/ai";

// POST { applicationIds: [...], threshold: 70 }
// Returns { results: [{ applicationId, score, verdict, reason }] }
// Optionally auto-moves applicants above threshold to "shortlisted"
export async function POST(request) {
  const guard = await requirePermission(PERMISSIONS.manageApplicants);
  if (guard.error) return guard.error;

  const { applicationIds = [], threshold = null, autoMove = false } = await request.json();
  if (!applicationIds.length) return NextResponse.json({ error: "No application IDs provided." }, { status: 400 });

  await connectDB();

  const applications = await Application.find({ _id: { $in: applicationIds } })
    .populate("candidate", "skills experience")
    .populate("job", "title skills requirements")
    .lean();

  const results = await Promise.all(
    applications.map(async (app) => {
      const result = await screenApplicant({
        jobTitle: app.job?.title || "",
        jobSkills: app.job?.skills || [],
        jobRequirements: app.job?.requirements || [],
        candidateSkills: app.candidate?.skills || [],
        experience: app.experience || app.candidate?.experience || [],
        answers: app.answers || [],
        coverLetter: app.coverLetter || "",
        resumeBase64: app.resumeUrl || "",
      });
      return { applicationId: String(app._id), ...result };
    })
  );

  // Auto-move if threshold set
  if (autoMove && threshold !== null) {
    await Promise.all(
      results.map(async (r) => {
        const app = applications.find(a => String(a._id) === r.applicationId);
        if (!app || app.status === "offered" || app.status === "rejected") return;
        const newStatus = r.score >= threshold ? "shortlisted" : r.score >= threshold * 0.6 ? "under_review" : "applied";
        if (newStatus !== app.status) {
          await Application.findByIdAndUpdate(r.applicationId, { $set: { status: newStatus } });
        }
      })
    );
  }

  return NextResponse.json({ results });
}
