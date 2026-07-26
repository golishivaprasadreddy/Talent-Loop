import { NextResponse } from "next/server";
import { z } from "zod";
import bcrypt from "bcryptjs";
import { connectDB } from "../../../../lib/db";
import { User } from "../../../../models";

export async function POST(request) {
  try {
    const { token, password } = z.object({ token: z.string().min(1), password: z.string().min(8, "Password must be at least 8 characters.") }).parse(await request.json());
    await connectDB();
    const user = await User.findOne({ resetToken: token, resetTokenExpiry: { $gt: new Date() } });
    if (!user) return NextResponse.json({ error: "Reset link is invalid or has expired." }, { status: 400 });
    user.passwordHash = await bcrypt.hash(password, 12);
    user.resetToken = undefined;
    user.resetTokenExpiry = undefined;
    await user.save();
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: error.issues?.[0]?.message || "Unable to reset password." }, { status: 400 });
  }
}
