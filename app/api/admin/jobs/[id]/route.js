import { NextResponse } from "next/server";
import { z } from "zod";
import { connectDB } from "../../../../../lib/db";
import { Job } from "../../../../../models";
import { requireRole } from "../../../../../lib/guard";

const schema = z.object({
  featured: z.boolean().optional(),
  status: z.enum(["draft", "published", "closed"]).optional(),
});

export async function PATCH(request, { params }) {
  const guard = await requireRole("admin");
  if (guard.error) return guard.error;
  try {
    const data = schema.parse(await request.json());
    await connectDB();
    const { id } = await params;
    const job = await Job.findByIdAndUpdate(id, { $set: data }, { new: true });
    if (!job) return NextResponse.json({ error: "Job not found." }, { status: 404 });
    return NextResponse.json({ job });
  } catch (error) {
    return NextResponse.json({ error: error.issues?.[0]?.message || "Unable to update job." }, { status: 400 });
  }
}

export async function DELETE(_, { params }) {
  const guard = await requireRole("admin");
  if (guard.error) return guard.error;
  await connectDB();
  const { id } = await params;
  await Job.findByIdAndDelete(id);
  return NextResponse.json({ success: true });
}
