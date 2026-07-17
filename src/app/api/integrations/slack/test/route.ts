import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { sendSlackMessage, buildTaskNotification } from "@/lib/integrations/slack";

// POST — send a test Slack message to verify webhook URL
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { webhookUrl } = await req.json();
  if (!webhookUrl) return NextResponse.json({ error: "webhookUrl required" }, { status: 400 });

  const payload = buildTaskNotification({
    event: "done",
    taskTitle: "Test task — ZYNOTRIX integration working! 🎉",
    taskId: "test",
    projectName: "Test Project",
    assigneeName: session.user.name ?? "You",
  });

  const ok = await sendSlackMessage(webhookUrl, payload);
  if (!ok) return NextResponse.json({ error: "Failed to send — check your webhook URL" }, { status: 400 });
  return NextResponse.json({ ok: true });
}
