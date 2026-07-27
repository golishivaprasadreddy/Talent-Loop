import { NextResponse } from "next/server";
import { z } from "zod";
import { connectDB } from "../../../lib/db";
import { User } from "../../../models";
import { requirePermission } from "../../../lib/guard";
import { PERMISSIONS } from "../../../lib/rbac";

const profileSchema = z.object({
  name: z.string().trim().min(2).max(80).optional(),
  phone: z.string().max(30).optional(),
  about: z.string().max(1000).optional(),
  skills: z.array(z.string()).optional(),
  experience: z.array(z.any()).optional(),
  education: z.array(z.any()).optional(),
  certifications: z.array(z.string()).optional(),
  languages: z.array(z.string()).optional(),
  portfolio: z.object({ github: z.string().optional(), linkedin: z.string().optional(), website: z.string().optional() }).optional(),
  resumeUrl: z.string().optional(),
  avatar: z.string().optional(),
});

export async function GET() {
  const guard = await requirePermission(PERMISSIONS.manageOwnProfile);
  if (guard.error) return guard.error;
  await connectDB();
  const user = await User.findById(guard.session.userId).select("-passwordHash -avatar").lean();
  if (!user) return NextResponse.json({ error: "User not found." }, { status: 404 });
  return NextResponse.json({ user });
}

export async function PATCH(request) {
  const guard = await requirePermission(PERMISSIONS.manageOwnProfile);
  if (guard.error) return guard.error;
  try {
    const data = profileSchema.parse(await request.json());
    await connectDB();
    const user = await User.findByIdAndUpdate(guard.session.userId, { $set: data }, { new: true }).select("-passwordHash");
    return NextResponse.json({ user });
  } catch (error) {
    return NextResponse.json({ error: error.issues?.[0]?.message || "Unable to update profile." }, { status: 400 });
  }
}
