import { NextResponse } from "next/server";
import { generateCoverLetter } from "../../../../lib/ai";
import { requirePermission } from "../../../../lib/guard";
import { PERMISSIONS } from "../../../../lib/rbac";
export async function POST(request) { const guard = await requirePermission(PERMISSIONS.useCandidateAi); if (guard.error) return guard.error; try { return NextResponse.json(await generateCoverLetter(await request.json())); } catch { return NextResponse.json({ error: "Unable to generate cover letter." }, { status: 500 }); } }
