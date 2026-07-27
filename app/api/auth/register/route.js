import bcrypt from "bcryptjs";
import { NextResponse } from "next/server";
import { z } from "zod";
import { connectDB } from "../../../../lib/db";
import { User, Company } from "../../../../models";
import { createSession, sessionCookie } from "../../../../lib/auth";
import { toAuthUser } from "../../../../lib/auth-user";

const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{8,}$/;
const schema = z.object({
  name: z.string().trim().min(2, "Full name must contain at least 2 characters.").max(80),
  email: z.string().trim().email(),
  password: z.string().min(8).refine((p) => passwordRegex.test(p), {
    message: "Password must be at least 8 characters and include uppercase, lowercase, a number, and a special character.",
  }),
  role: z.enum(["candidate", "recruiter"]).default("candidate"),
  companyName: z.string().trim().max(100).optional().or(z.literal("")),
  companyLogo: z.string().optional(),
  companyDescription: z.string().trim().max(1000).optional(),
  companyWebsite: z.string().trim().max(200).optional(),
  companyIndustry: z.string().trim().max(100).optional(),
  companySize: z.string().trim().max(20).optional(),
  companyHeadquarters: z.string().trim().max(100).optional(),
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
    if (data.role === "recruiter") await Company.create({
      owner: user._id,
      name: data.companyName,
      logo: data.companyLogo || undefined,
      description: data.companyDescription || undefined,
      website: data.companyWebsite || undefined,
      industry: data.companyIndustry || undefined,
      size: data.companySize || undefined,
      headquarters: data.companyHeadquarters || undefined,
    });
    const token = await createSession(user, data.remember);
    const response = NextResponse.json({ token, user: toAuthUser(user) }, { status: 201 });
    response.cookies.set(sessionCookie(token, data.remember));
    return response;
  } catch (error) {
    console.error("[register]", error);
    const msg = error.issues?.[0]?.message || error.message || "Unable to create account.";
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}
