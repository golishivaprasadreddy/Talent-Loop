import { NextResponse } from "next/server";
import { analyzeResume } from "../../../../lib/ai";
import { requirePermission } from "../../../../lib/guard";
import { PERMISSIONS } from "../../../../lib/rbac";
export async function POST(request) { const guard = await requirePermission(PERMISSIONS.useCandidateAi); if (guard.error) return guard.error; try { return NextResponse.json(await analyzeResume(await request.json())); } catch { return NextResponse.json({ error: "Unable to analyze resume." }, { status: 500 }); } }
