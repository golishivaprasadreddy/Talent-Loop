import bcrypt from "bcryptjs";
import { NextResponse } from "next/server";
import { z } from "zod";
import { connectDB } from "../../../../lib/db";
import { User } from "../../../../models";
import { createSession, sessionCookie } from "../../../../lib/auth";
const schema = z.object({ email: z.string().email(), password: z.string().min(1), remember: z.boolean().optional() });
export async function POST(request) { try { const data = schema.parse(await request.json()); await connectDB(); const user = await User.findOne({ email: data.email.toLowerCase() }); if (!user || user.suspended || !(await bcrypt.compare(data.password, user.passwordHash))) return NextResponse.json({ error: "Invalid email or password." }, { status: 401 }); const response = NextResponse.json({ user: { id: user._id, name: user.name, email: user.email, role: user.role } }); response.cookies.set(sessionCookie(await createSession(user), data.remember)); return response; } catch (error) { return NextResponse.json({ error: error.issues?.[0]?.message || "Unable to sign in." }, { status: 400 }); } }
