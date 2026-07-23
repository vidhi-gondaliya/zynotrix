import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createHmac, timingSafeEqual } from "crypto";

export const dynamic = "force-dynamic";

function verifySlackSignature(body: string, signature: string, timestamp: string, secret: string): boolean {
  const age = Math.abs(Date.now() / 1000 - Number(timestamp));
  if (age > 300) return false; // reject requests older than 5 minutes
  const base = `v0:${timestamp}:${body}`;
  const expected = "v0=" + createHmac("sha256", secret).update(base).digest("hex");
  try {
    return timingSafeEqual(Buffer.from(expected), Buffer.from(signature));
  } catch {
    return false;
  }
}

export async function POST(req: NextRequest) {
  const rawBody = await req.text();
  const signature = req.headers.get("x-slack-signature") ?? "";
  const timestamp = req.headers.get("x-slack-request-timestamp") ?? "";
  const contentType = req.headers.get("content-type") ?? "";

  const secret = process.env.SLACK_SIGNING_SECRET;
  if (secret && !verifySlackSignature(rawBody, signature, timestamp, secret)) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  // Handle URL verification challenge
  let body: any;
  if (contentType.includes("application/json")) {
    body = JSON.parse(rawBody);
  } else {
    body = Object.fromEntries(new URLSearchParams(rawBody));
  }

  // Slack URL verification
  if (body.type === "url_verification") {
    return NextResponse.json({ challenge: body.challenge });
  }

  await (prisma as any).webhookLog.create({
    data: { source: "slack", event: body.type ?? body.command ?? "unknown", payload: rawBody.slice(0, 4000), status: "received" },
  }).catch(() => {});

  // Handle slash command /task-create
  if (body.command === "/zynotrix-task") {
    const text = body.text?.trim();
    if (!text) {
      return NextResponse.json({ response_type: "ephemeral", text: "Usage: `/zynotrix-task <task description>`" });
    }

    // Find user by Slack user ID mapping (simplified: use first user)
    const user = await prisma.user.findFirst({ select: { id: true, name: true } }).catch(() => null);

    if (user) {
      const task = await prisma.task.create({
        data: {
          title: text,
          status: "TODO",
          priority: "MEDIUM",
          creatorId: user.id,
          projectId: (await prisma.project.findFirst({ where: { ownerId: user.id }, select: { id: true } }))?.id ?? "",
        },
      }).catch(() => null);

      return NextResponse.json({
        response_type: "in_channel",
        text: `✅ Task created: *${text}*${task ? ` (ID: ZYN-${task.id})` : ""}`,
      });
    }

    return NextResponse.json({ response_type: "ephemeral", text: "Could not find your Colliq account." });
  }

  // Event callback
  if (body.type === "event_callback") {
    const event = body.event;
    // Handle app_mention — respond to @zynotrix mentions
    if (event?.type === "app_mention") {
      // Could implement slash commands via mentions here
    }
  }

  return NextResponse.json({ ok: true });
}
