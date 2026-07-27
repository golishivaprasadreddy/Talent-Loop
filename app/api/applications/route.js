import { NextResponse } from "next/server";
import { z } from "zod";
import { connectDB } from "../../../lib/db";
import { Application, Job, Notification } from "../../../models";
import { getSession } from "../../../lib/auth";

const answerSchema = z.object({ questionId: z.string(), question: z.string(), answer: z.string() });

const schema = z.object({
  jobId: z.string(),
  name: z.string().optional(),
  email: z.string().email().optional(),
  phone: z.string().optional(),
  govtId: z.any().optional(),
  resumeUrl: z.string().optional(),
  resumeFileName: z.string().optional(),
  coverLetter: z.string().max(5000).optional(),
  portfolioLink: z.string().optional(),
  linkedinUrl: z.string().optional(),
  experience: z.any().optional(),
  education: z.any().optional(),
  certifications: z.array(z.string()).optional(),
  notes: z.string().max(2000).optional(),
  answers: z.array(answerSchema).optional(),
});

export async function GET(request) {
  const session = await getSession();
  if (session?.role !== "candidate") return NextResponse.json({ application: null });
  const jobId = new URL(request.url).searchParams.get("jobId");
  if (!jobId) return NextResponse.json({ application: null });
  await connectDB();
  const application = await Application.findOne({ job: jobId, candidate: session.userId }).select("_id").lean();
  return NextResponse.json({ application: application ? { _id: application._id } : null });
}

export async function POST(request) {
  const body = await request.json();
  const session = await getSession();

  if (session?.role === "candidate") {
    try {
      const payload = schema.parse(body);
      await connectDB();
      const job = await Job.findById(payload.jobId).populate("company");
      if (!job) return NextResponse.json({ error: "Job not found." }, { status: 404 });
      const application = await Application.create({ ...payload, job: job._id, candidate: session.userId });
      await Notification.create({
        user: job.company.owner,
        type: "new_applicant",
        title: "New applicant",
        body: `A candidate applied for ${job.title}.`,
      });
      return NextResponse.json({ success: true, applicationId: application._id, message: "Application received successfully." }, { status: 201 });
    } catch (error) {
      if (error?.code === 11000) return NextResponse.json({ error: "You have already applied for this job." }, { status: 409 });
      return NextResponse.json({ error: error.issues?.[0]?.message || "Unable to submit application." }, { status: 400 });
    }
  }

  // Public demo fallback
  if (!body.name || !body.email || !body.jobId) {
    return NextResponse.json({ error: "Name, email, and job are required." }, { status: 400 });
  }
  return NextResponse.json({ success: true, applicationId: `TL-${Date.now()}`, message: "Application received successfully." }, { status: 201 });
}
