import { NextResponse } from "next/server";
import { resumeFeedback } from "../../../../lib/ai";
import { requirePermission } from "../../../../lib/guard";
import { PERMISSIONS } from "../../../../lib/rbac";

export async function POST(request) {
  const guard = await requirePermission(PERMISSIONS.useCandidateAi);
  if (guard.error) return guard.error;
  try {
    return NextResponse.json(await resumeFeedback(await request.json()));
  } catch {
    return NextResponse.json({ error: "Unable to generate feedback." }, { status: 500 });
  }
}
