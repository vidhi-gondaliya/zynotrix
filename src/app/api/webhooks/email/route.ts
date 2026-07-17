import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

// Inbound email webhook — compatible with Mailgun, SendGrid, Postmark
// POST body (multipart or JSON) contains:
//   from, to, subject, body-plain (Mailgun) / text (SendGrid) / TextBody (Postmark)

export async function POST(req: NextRequest) {
  const contentType = req.headers.get("content-type") ?? "";
  let from = "", subject = "", bodyText = "", toEmail = "";

  if (contentType.includes("application/json")) {
    const json = await req.json();
    // Postmark format
    from = json.From ?? json.from ?? "";
    subject = json.Subject ?? json.subject ?? "";
    bodyText = json.TextBody ?? json.text ?? json["body-plain"] ?? "";
    toEmail = json.To ?? json.to ?? "";
  } else if (contentType.includes("multipart/form-data") || contentType.includes("application/x-www-form-urlencoded")) {
    const form = await req.formData().catch(async () => {
      const text = await req.text();
      return new URLSearchParams(text) as any;
    });
    const get = (k: string) => (form instanceof FormData ? form.get(k) : form.get(k))?.toString() ?? "";
    from = get("from") || get("sender");
    subject = get("subject");
    bodyText = get("body-plain") || get("text") || get("TextBody");
    toEmail = get("to") || get("recipient");
  } else {
    const text = await req.text();
    const params = new URLSearchParams(text);
    from = params.get("from") ?? "";
    subject = params.get("subject") ?? "";
    bodyText = params.get("body-plain") ?? params.get("text") ?? "";
    toEmail = params.get("to") ?? "";
  }

  await (prisma as any).webhookLog.create({
    data: {
      source: "email",
      event: "inbound",
      payload: JSON.stringify({ from, subject, toEmail, preview: bodyText.slice(0, 200) }),
      status: "received",
    },
  }).catch(() => {});

  if (!subject && !bodyText) return NextResponse.json({ ok: true });

  // Extract task-to email suffix: tasks+<userId>@yourdomain.com or just use first user
  let userId: string | null = null;
  const toMatch = toEmail.match(/tasks\+([^@]+)@/);
  if (toMatch) {
    const user = await prisma.user.findUnique({ where: { id: toMatch[1] } }).catch(() => null);
    if (user) userId = user.id;
  }
  if (!userId) {
    // Fall back: find user by sender email
    const sender = from.match(/<(.+?)>$/)?.[1] ?? from;
    const user = await prisma.user.findFirst({ where: { email: sender } }).catch(() => null);
    userId = user?.id ?? null;
  }
  if (!userId) return NextResponse.json({ ok: true }); // no matching user, silently drop

  // Find user's default project
  const project = await prisma.project.findFirst({
    where: { ownerId: userId },
    orderBy: { createdAt: "desc" },
    select: { id: true },
  }).catch(() => null);

  if (!project) return NextResponse.json({ ok: true });

  // Create task from email
  const title = subject || bodyText.slice(0, 100);
  const description = bodyText.length > 100 ? bodyText.slice(0, 2000) : "";

  await prisma.task.create({
    data: {
      title: title.trim(),
      description: description.trim(),
      status: "TODO",
      priority: "MEDIUM",
      tags: JSON.stringify(["email"]),
      projectId: project.id,
      creatorId: userId,
    },
  }).catch(() => {});

  await (prisma as any).webhookLog.updateMany({
    where: { source: "email", event: "inbound", status: "received" },
    data: { status: "processed" },
  }).catch(() => {});

  return NextResponse.json({ ok: true });
}
