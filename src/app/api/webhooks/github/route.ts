import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyGitHubSignature, extractTaskRefs, prToTaskStatus, type GitHubPREvent } from "@/lib/integrations/github";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const rawBody = await req.text();
  const signature = req.headers.get("x-hub-signature-256") ?? "";
  const event     = req.headers.get("x-github-event") ?? "";
  const delivery  = req.headers.get("x-github-delivery") ?? "";

  // Log incoming webhook
  await (prisma as any).webhookLog.create({
    data: { source: "github", event, payload: rawBody.slice(0, 4000), status: "received" },
  }).catch(() => {});

  // Verify signature if secret is set
  const secret = process.env.GITHUB_WEBHOOK_SECRET;
  if (secret && !verifyGitHubSignature(rawBody, signature, secret)) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  const body = JSON.parse(rawBody);

  // Handle ping
  if (event === "ping") {
    return NextResponse.json({ ok: true, zen: body.zen });
  }

  // Handle pull_request events
  if (event === "pull_request") {
    const pr = body as GitHubPREvent;
    const action = pr.action;
    const pullRequest = pr.pull_request;
    const repo = pr.repository;

    const taskRefs = extractTaskRefs(pullRequest);
    const prStatus = prToTaskStatus(pullRequest);

    for (const taskId of taskRefs) {
      // Upsert task link
      await (prisma as any).taskLink.upsert({
        where: { taskId_type_externalId: { taskId, type: "GITHUB_PR", externalId: String(pullRequest.number) } },
        update: {
          status: prStatus,
          title: `${repo.full_name}#${pullRequest.number}: ${pullRequest.title}`,
          url: pullRequest.html_url,
          meta: JSON.stringify({ repo: repo.full_name, branch: pullRequest.head.ref, author: pullRequest.user.login }),
          updatedAt: new Date(),
        },
        create: {
          taskId,
          type: "GITHUB_PR",
          externalId: String(pullRequest.number),
          url: pullRequest.html_url,
          title: `${repo.full_name}#${pullRequest.number}: ${pullRequest.title}`,
          status: prStatus,
          meta: JSON.stringify({ repo: repo.full_name, branch: pullRequest.head.ref, author: pullRequest.user.login }),
        },
      }).catch(() => {});

      // Auto-close task when PR is merged
      if (pullRequest.merged && action === "closed") {
        await prisma.task.update({
          where: { id: taskId },
          data: { status: "DONE" },
        }).catch(() => {});

        // Log activity
        const task = await prisma.task.findUnique({ where: { id: taskId }, select: { creatorId: true } }).catch(() => null);
        if (task) {
          await prisma.taskActivity.create({
            data: {
              taskId,
              userId: task.creatorId,
              action: "status_changed",
              meta: JSON.stringify({ from: "IN_PROGRESS", to: "DONE", via: "github_pr_merge", pr: pullRequest.html_url }),
            },
          }).catch(() => {});
        }
      }
    }

    await (prisma as any).webhookLog.updateMany({
      where: { source: "github", event, payload: { contains: delivery } },
      data: { status: "processed" },
    }).catch(() => {});

    return NextResponse.json({ ok: true, tasksUpdated: taskRefs.length });
  }

  // Handle push events — extract task refs from commit messages
  if (event === "push") {
    const commits: any[] = body.commits ?? [];
    const seen = new Set<string>();
    const taskRefs: string[] = [];

    for (const commit of commits) {
      const msg = `${commit.message ?? ""} ${(commit.modified ?? []).join(" ")}`;
      const refs = extractTaskRefs({ title: msg, body: msg } as any);
      refs.forEach((r) => { if (!seen.has(r)) { seen.add(r); taskRefs.push(r); } });
    }

    for (const taskId of taskRefs) {
      const commit = commits[0];
      if (!commit) continue;
      await (prisma as any).taskLink.upsert({
        where: { taskId_type_externalId: { taskId, type: "GITHUB_PR", externalId: commit.id } },
        update: { status: "open", updatedAt: new Date() },
        create: {
          taskId,
          type: "GITHUB_PR",
          externalId: commit.id,
          url: commit.url,
          title: `Commit: ${commit.message?.slice(0, 80)}`,
          status: "open",
          meta: JSON.stringify({ author: commit.author?.name, branch: body.ref }),
        },
      }).catch(() => {});
    }

    return NextResponse.json({ ok: true, tasksFound: taskRefs.length });
  }

  return NextResponse.json({ ok: true, event });
}
