import { NextResponse } from "next/server";
import { z } from "zod";
import { connectDB } from "../../../lib/db";
import { Review } from "../../../models";
import { requirePermission } from "../../../lib/guard";
import { PERMISSIONS } from "../../../lib/rbac";

export async function GET(request) {
  await connectDB();
  const { searchParams } = new URL(request.url);
  const companyId = searchParams.get("companyId");
  const filter = companyId ? { company: companyId } : {};
  const reviews = await Review.find(filter).populate("candidate", "name avatar").sort({ createdAt: -1 }).lean();
  return NextResponse.json({ reviews });
}

const schema = z.object({
  companyId: z.string(),
  rating: z.number().min(1).max(5),
  pros: z.string().max(500).optional(),
  cons: z.string().max(500).optional(),
  body: z.string().max(1000).optional(),
});

export async function POST(request) {
  const guard = await requirePermission(PERMISSIONS.reviewCompanies);
  if (guard.error) return guard.error;
  try {
    const { companyId, ...rest } = schema.parse(await request.json());
    await connectDB();
    const review = await Review.create({ company: companyId, candidate: guard.session.userId, ...rest });
    return NextResponse.json({ review }, { status: 201 });
  } catch (error) {
    if (error?.code === 11000) return NextResponse.json({ error: "You have already reviewed this company." }, { status: 409 });
    return NextResponse.json({ error: error.issues?.[0]?.message || "Unable to submit review." }, { status: 400 });
  }
}
