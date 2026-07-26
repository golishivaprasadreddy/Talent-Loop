import { NextResponse } from "next/server";
import { z } from "zod";
import { connectDB } from "../../../../../lib/db";
import { User } from "../../../../../models";
import { requireRole } from "../../../../../lib/guard";

const schema = z.object({
  suspended: z.boolean().optional(),
  role: z.enum(["candidate", "recruiter", "admin"]).optional(),
});

export async function PATCH(request, { params }) {
  const guard = await requireRole("admin");
  if (guard.error) return guard.error;
  try {
    const data = schema.parse(await request.json());
    await connectDB();
    const { id } = await params;
    if (id === guard.session.userId) return NextResponse.json({ error: "Cannot modify your own account." }, { status: 400 });
    const user = await User.findByIdAndUpdate(id, { $set: data }, { new: true }).select("-passwordHash");
    if (!user) return NextResponse.json({ error: "User not found." }, { status: 404 });
    return NextResponse.json({ user });
  } catch (error) {
    return NextResponse.json({ error: error.issues?.[0]?.message || "Unable to update user." }, { status: 400 });
  }
}

export async function DELETE(_, { params }) {
  const guard = await requireRole("admin");
  if (guard.error) return guard.error;
  await connectDB();
  const { id } = await params;
  if (id === guard.session.userId) return NextResponse.json({ error: "Cannot delete your own account." }, { status: 400 });
  await User.findByIdAndDelete(id);
  return NextResponse.json({ success: true });
}
