import { NextResponse } from "next/server";
import { z } from "zod";
import { connectDB } from "../../../lib/db";
import { Company } from "../../../models";
import { requirePermission } from "../../../lib/guard";
import { PERMISSIONS } from "../../../lib/rbac";

const schema = z.object({
  name: z.string().trim().min(2).max(100).optional(),
  description: z.string().max(2000).optional(),
  website: z.string().optional(),
  industry: z.string().optional(),
  size: z.string().optional(),
  headquarters: z.string().optional(),
  logo: z.string().optional(),
  banner: z.string().optional(),
});

export async function GET() {
  const guard = await requirePermission(PERMISSIONS.manageOwnJobs);
  if (guard.error) return guard.error;
  await connectDB();
  const company = await Company.findOne({ owner: guard.session.userId }).lean();
  return NextResponse.json({ company });
}

export async function PATCH(request) {
  const guard = await requirePermission(PERMISSIONS.manageOwnJobs);
  if (guard.error) return guard.error;
  try {
    const data = schema.parse(await request.json());
    await connectDB();
    const company = await Company.findOneAndUpdate(
      { owner: guard.session.userId },
      { $set: data },
      { new: true, upsert: false }
    );
    if (!company) return NextResponse.json({ error: "Company not found." }, { status: 404 });
    return NextResponse.json({ company });
  } catch (error) {
    return NextResponse.json({ error: error.issues?.[0]?.message || "Unable to update company." }, { status: 400 });
  }
}
