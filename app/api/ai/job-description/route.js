import { NextResponse } from "next/server";
import { generateJobDescription } from "../../../../lib/ai";
import { requirePermission } from "../../../../lib/guard";
import { PERMISSIONS } from "../../../../lib/rbac";
export async function POST(request) { const guard = await requirePermission(PERMISSIONS.useRecruiterAi); if (guard.error) return guard.error; try { return NextResponse.json(await generateJobDescription(await request.json())); } catch { return NextResponse.json({ error: "Unable to generate description." }, { status: 500 }); } }
