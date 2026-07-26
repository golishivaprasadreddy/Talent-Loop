import bcrypt from "bcryptjs";
import { NextResponse } from "next/server";
import { z } from "zod";
import { connectDB } from "../../../../lib/db";
import { User, Company } from "../../../../models";
import { createSession, sessionCookie } from "../../../../lib/auth";

const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{8,}$/;
const schema = z.object({
  name: z.string().trim().min(2, "Full name must contain at least 2 characters.").max(80),
  email: z.string().trim().email(),
  password: z.string().min(8).refine((p) => passwordRegex.test(p), {
    message: "Password must be at least 8 characters and include uppercase, lowercase, a number, and a special character.",
  }),
  role: z.enum(["candidate", "recruiter"]).default("candidate"),
  companyName: z.string().trim().max(100).optional().or(z.literal("")),
  remember: z.boolean().optional(),
});
export async function POST(request) {
  try {
    const data = schema.parse(await request.json());
    try {
      await connectDB();
    } catch (dbErr) {
      console.error("[register] DB connection failed:", dbErr.message);
      return NextResponse.json({ error: "Database connection failed. Check MONGODB_URI and Atlas IP whitelist." }, { status: 503 });
    }
    if (await User.exists({ email: data.email.toLowerCase() })) return NextResponse.json({ error: "An account with that email already exists." }, { status: 409 });
    if (data.role === "recruiter" && !data.companyName) return NextResponse.json({ error: "Company name is required for recruiters." }, { status: 400 });
    const user = await User.create({ name: data.name, email: data.email, passwordHash: await bcrypt.hash(data.password, 12), role: data.role });
    if (data.role === "recruiter") await Company.create({ owner: user._id, name: data.companyName });
    const response = NextResponse.json({ user: { id: user._id, name: user.name, email: user.email, role: user.role } }, { status: 201 });
    response.cookies.set(sessionCookie(await createSession(user), data.remember));
    return response;
  } catch (error) {
    console.error("[register]", error);
    const msg = error.issues?.[0]?.message || error.message || "Unable to create account.";
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}
