import { NextResponse } from "next/server";
import { z } from "zod";
import { connectDB } from "../../../lib/db";
import { Message } from "../../../models";
import { requirePermission } from "../../../lib/guard";
import { PERMISSIONS } from "../../../lib/rbac";

export async function GET(request) {
  const guard = await requirePermission(PERMISSIONS.useMessaging);
  if (guard.error) return guard.error;
  const { searchParams } = new URL(request.url);
  const conversation = searchParams.get("conversation");
  if (!conversation) return NextResponse.json({ error: "conversation param required." }, { status: 400 });
  if (!conversation.split("_").includes(guard.session.userId)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  await connectDB();
  // Mark messages sent to current user as read
  await Message.updateMany({ conversation, recipient: guard.session.userId, readAt: null }, { $set: { readAt: new Date() } });
  const messages = await Message.find({ conversation }).populate("sender", "name avatar role").sort({ createdAt: 1 }).lean();
  return NextResponse.json({ messages });
}

const schema = z.object({
  recipientId: z.string(),
  body: z.string().min(1).max(2000),
});

export async function POST(request) {
  const guard = await requirePermission(PERMISSIONS.useMessaging);
  if (guard.error) return guard.error;
  try {
    const { recipientId, body } = schema.parse(await request.json());
    await connectDB();
    // Conversation ID is deterministic: sorted pair of user IDs
    const ids = [guard.session.userId, recipientId].sort();
    const conversation = ids.join("_");
    const message = await Message.create({ conversation, sender: guard.session.userId, recipient: recipientId, body });
    return NextResponse.json({ message }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: error.issues?.[0]?.message || "Unable to send message." }, { status: 400 });
  }
}
