import { NextResponse } from "next/server";
import { z } from "zod";
import crypto from "crypto";
import { connectDB } from "../../../../lib/db";
import { User } from "../../../../models";

export async function POST(request) {
  try {
    const { email } = z.object({ email: z.string().email() }).parse(await request.json());
    await connectDB();
    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) return NextResponse.json({ success: true }); // prevent enumeration
    const token = crypto.randomBytes(32).toString("hex");
    user.resetToken = token;
    user.resetTokenExpiry = new Date(Date.now() + 60 * 60 * 1000);
    await user.save();
    const resetUrl = `${process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000"}/reset-password?token=${token}`;
    // Production: send resetUrl via email provider (Resend, SendGrid, etc.)
    return NextResponse.json({ success: true, resetUrl });
  } catch (error) {
    return NextResponse.json({ error: error.issues?.[0]?.message || "Unable to process request." }, { status: 400 });
  }
}
