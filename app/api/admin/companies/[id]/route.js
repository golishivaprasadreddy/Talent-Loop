import { NextResponse } from "next/server";
import { z } from "zod";
import { connectDB } from "../../../../../lib/db";
import { Company } from "../../../../../models";
import { requireRole } from "../../../../../lib/guard";

const schema = z.object({
  approved: z.boolean().optional(),
  featured: z.boolean().optional(),
});

export async function PATCH(request, { params }) {
  const guard = await requireRole("admin");
  if (guard.error) return guard.error;
  try {
    const data = schema.parse(await request.json());
    await connectDB();
    const { id } = await params;
    const company = await Company.findByIdAndUpdate(id, { $set: data }, { new: true });
    if (!company) return NextResponse.json({ error: "Company not found." }, { status: 404 });
    return NextResponse.json({ company });
  } catch (error) {
    return NextResponse.json({ error: error.issues?.[0]?.message || "Unable to update company." }, { status: 400 });
  }
}

export async function DELETE(_, { params }) {
  const guard = await requireRole("admin");
  if (guard.error) return guard.error;
  await connectDB();
  const { id } = await params;
  await Company.findByIdAndDelete(id);
  return NextResponse.json({ success: true });
}
