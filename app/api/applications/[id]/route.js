import { NextResponse } from "next/server";
import { z } from "zod";
import { connectDB } from "../../../../lib/db";
import { Application, Notification } from "../../../../models";
import { requirePermission } from "../../../../lib/guard";
import { PERMISSIONS } from "../../../../lib/rbac";

export async function GET(_, { params }) {
  const guard = await requirePermission(PERMISSIONS.manageOwnApplications, PERMISSIONS.manageApplicants);
  if (guard.error) return guard.error;
  await connectDB();
  const { id } = await params;
  const application = await Application.findById(id)
    .populate({ path: "job", select: "title location company customQuestions", populate: { path: "company", select: "name logo" } })
    .populate("candidate", "name email avatar skills resumeUrl portfolio experience education certifications languages about")
    .lean();
  if (!application) return NextResponse.json({ error: "Not found." }, { status: 404 });
  return NextResponse.json({ application });
}

const statusSchema = z.object({
  status: z.enum(["applied", "under_review", "shortlisted", "interview", "offered", "rejected"]),
});

export async function PATCH(request, { params }) {
  const guard = await requirePermission(PERMISSIONS.manageApplicants);
  if (guard.error) return guard.error;
  try {
    const { status } = statusSchema.parse(await request.json());
    await connectDB();
    const { id } = await params;
    const application = await Application.findByIdAndUpdate(id, { $set: { status } }, { new: true }).populate("job", "title");
    if (!application) return NextResponse.json({ error: "Not found." }, { status: 404 });
    await Notification.create({
      user: application.candidate,
      type: "application_update",
      title: "Application update",
      body: `Your application for ${application.job.title} is now: ${status.replace("_", " ")}.`,
    });
    return NextResponse.json({ application });
  } catch (error) {
    return NextResponse.json({ error: error.issues?.[0]?.message || "Unable to update." }, { status: 400 });
  }
}
