import bcrypt from "bcryptjs";
import { NextResponse } from "next/server";
import { z } from "zod";
import { connectDB } from "../../../../lib/db";
import { User } from "../../../../models";
import { createSession } from "../../../../lib/auth";
import { toAuthUser } from "../../../../lib/auth-user";

const schema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
  remember: z.boolean().optional(),
});

export async function POST(request) {
  let data;
  try {
    data = schema.parse(await request.json());
  } catch (error) {
    return NextResponse.json({ error: error.issues?.[0]?.message || "Invalid login payload." }, { status: 400 });
  }

  try {
    await connectDB();
  } catch (error) {
    console.error("[login] DB connection failed:", error.message);
    return NextResponse.json({ error: "Database connection failed. Check MONGODB_URI and Atlas IP whitelist." }, { status: 503 });
  }

  const user = await User.findOne({ email: data.email.toLowerCase() });
  if (!user || user.suspended || !(await bcrypt.compare(data.password, user.passwordHash))) {
    return NextResponse.json({ error: "Invalid email or password." }, { status: 401 });
  }

  try {
    const token = await createSession(user, data.remember);
    const response = NextResponse.json({
      token,
      user: toAuthUser(user),
    });
    response.cookies.set("token", token, {
      httpOnly: true,
      sameSite: "lax",
      path: "/",
      maxAge: data.remember ? 60 * 60 * 24 * 30 : 60 * 60 * 24 * 7,
    });
    return response;
  } catch (error) {
    console.error("[login] JWT creation failed:", error.message);
    return NextResponse.json({ error: "JWT configuration failed. Check JWT_SECRET." }, { status: 500 });
  }
}
