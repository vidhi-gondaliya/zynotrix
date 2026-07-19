import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireOrg, isOrgError } from "@/lib/org";

// GET /api/import-export?type=tasks|projects&format=csv|json&projectId=...
export async function GET(req: NextRequest) {
  const ctx = await requireOrg();
  if (isOrgError(ctx)) return ctx;
  const { orgId } = ctx;

  const { searchParams } = new URL(req.url);
  const type      = searchParams.get("type") ?? "tasks";
  const format    = searchParams.get("format") ?? "json";
  const projectId = searchParams.get("projectId") ?? undefined;

  if (type === "tasks") {
    const tasks = await prisma.task.findMany({
      where: { ...(projectId ? { projectId } : {}) },
      include: {
        project:  { select: { name: true } },
        assignee: { select: { name: true, email: true } },
        creator:  { select: { name: true, email: true } },
      },
      orderBy: { createdAt: "asc" },
    });

    if (format === "csv") {
      const header = "id,title,status,priority,description,dueDate,assignee,project,tags,createdAt";
      const rows = tasks.map((t) => [
        t.id,
        `"${(t.title ?? "").replace(/"/g, '""')}"`,
        t.status,
        t.priority,
        `"${(t.description ?? "").replace(/"/g, '""')}"`,
        t.dueDate ? new Date(t.dueDate).toISOString().substring(0, 10) : "",
        t.assignee?.email ?? "",
        t.project?.name ?? "",
        `"${(Array.isArray(t.tags) ? t.tags : []).join(",")}"`,
        new Date(t.createdAt).toISOString(),
      ].join(",")).join("\n");
      return new NextResponse(`${header}\n${rows}`, {
        headers: { "Content-Type": "text/csv", "Content-Disposition": `attachment; filename="tasks-export.csv"` },
      });
    }

    return NextResponse.json(tasks, {
      headers: { "Content-Disposition": `attachment; filename="tasks-export.json"` },
    });
  }

  if (type === "projects") {
    const projects = await prisma.project.findMany({
      where: { organizationId: orgId },
      include: {
        tasks: { include: { assignee: { select: { name: true, email: true } } } },
      },
    });

    if (format === "csv") {
      const header = "id,name,status,description,clientName,deadline,color,taskCount";
      const rows = projects.map((p) => [
        p.id,
        `"${p.name.replace(/"/g, '""')}"`,
        p.status,
        `"${(p.description ?? "").replace(/"/g, '""')}"`,
        p.clientName ?? "",
        p.deadline ? new Date(p.deadline).toISOString().substring(0, 10) : "",
        p.color,
        p.tasks.length,
      ].join(",")).join("\n");
      return new NextResponse(`${header}\n${rows}`, {
        headers: { "Content-Type": "text/csv", "Content-Disposition": `attachment; filename="projects-export.csv"` },
      });
    }

    return NextResponse.json(projects, {
      headers: { "Content-Disposition": `attachment; filename="projects-export.json"` },
    });
  }

  return NextResponse.json({ error: "Invalid type" }, { status: 400 });
}

// POST /api/import-export — import tasks/projects from CSV or JSON
export async function POST(req: NextRequest) {
  const ctx = await requireOrg();
  if (isOrgError(ctx)) return ctx;
  const { orgId, userId } = ctx;

  const body = await req.json();
  const { type, format, data, projectId } = body;

  if (!data) return NextResponse.json({ error: "No data" }, { status: 400 });

  const results: { created: number; skipped: number; errors: string[]; statusWarnings: string[] } = {
    created: 0, skipped: 0, errors: [], statusWarnings: [],
  };

  if (type === "tasks") {
    if (!projectId) return NextResponse.json({ error: "projectId is required to import tasks" }, { status: 400 });

    // ── Load project's custom column IDs ────────────────────────────
    let validStatusIds: string[] = ["BACKLOG", "TODO", "IN_PROGRESS", "REVIEW", "DONE", "ARCHIVED"];
    let labelToId: Record<string, string> = {};

    try {
      const project = await prisma.project.findUnique({ where: { id: projectId }, select: { boardConfig: true } });
      if (project?.boardConfig) {
        const cfg = JSON.parse(project.boardConfig) as { columns?: { id: string; label: string }[] };
        if (cfg.columns?.length) {
          validStatusIds = cfg.columns.map((c) => c.id);
          // Build label → id map (case-insensitive) for matching custom status names
          cfg.columns.forEach((c) => {
            labelToId[c.label.toLowerCase()] = c.id;
            labelToId[c.id.toLowerCase()]    = c.id;  // also allow ID directly
          });
        }
      }
    } catch { /* use defaults */ }

    const defaultStatus = validStatusIds[0] ?? "TODO";

    // ── Resolve status from row value to a valid column ID ──────────
    function resolveStatus(raw: string | undefined): { id: string; warned: boolean; warning: string } {
      if (!raw) return { id: defaultStatus, warned: false, warning: "" };
      const normalized = raw.trim().toUpperCase().replace(/\s+/g, "_");
      const lower = raw.trim().toLowerCase();

      // Exact ID match
      if (validStatusIds.includes(normalized)) return { id: normalized, warned: false, warning: "" };

      // Label match (e.g. "Content Creation" → its id)
      if (labelToId[lower]) {
        const mapped = labelToId[lower];
        if (mapped !== raw.trim()) {
          return { id: mapped, warned: true, warning: `"${raw}" → "${mapped}"` };
        }
        return { id: mapped, warned: false, warning: "" };
      }

      // Fuzzy: find closest column by partial match
      const partialKey = Object.keys(labelToId).find((k) => k.includes(lower) || lower.includes(k));
      if (partialKey) {
        const mapped = labelToId[partialKey];
        return { id: mapped, warned: true, warning: `"${raw}" mapped to "${mapped}" (partial match)` };
      }

      // Fallback to default
      return { id: defaultStatus, warned: true, warning: `"${raw}" not found — defaulted to "${defaultStatus}"` };
    }

    // ── Parse rows ──────────────────────────────────────────────────
    let rows: Record<string, string>[] = [];
    if (format === "csv") {
      const lines = (data as string).split("\n").filter(Boolean);
      const headers = lines[0].split(",").map((h) => h.trim());
      rows = lines.slice(1).map((line) => {
        const vals = line.match(/(".*?"|[^,]+)(?=,|$)/g) ?? line.split(",");
        return Object.fromEntries(headers.map((h, i) => [h, (vals[i] ?? "").replace(/^"|"$/g, "").trim()]));
      });
    } else {
      rows = Array.isArray(data) ? data : [];
    }

    for (const row of rows) {
      try {
        const title = (row.title ?? row.Title ?? "").trim();
        if (!title) { results.skipped++; continue; }

        const { id: status, warned, warning } = resolveStatus(row.status ?? row.Status);
        if (warned && warning) results.statusWarnings.push(warning);

        const rawPriority = (row.priority ?? row.Priority ?? "MEDIUM").trim().toUpperCase();
        const priority    = ["URGENT", "HIGH", "MEDIUM", "LOW"].includes(rawPriority) ? rawPriority : "MEDIUM";

        const tagsRaw   = row.tags ?? row.Tags ?? "";
        const tagsArray = tagsRaw ? tagsRaw.split(",").map((t: string) => t.trim()).filter(Boolean) : [];

        await prisma.task.create({
          data: {
            title,
            description: row.description ?? row.Description ?? null,
            status:      status as any,
            priority:    priority as any,
            dueDate:     row.dueDate ? new Date(row.dueDate) : null,
            projectId,
            creatorId:   userId,
            tags:        JSON.stringify(tagsArray),
          },
        });
        results.created++;
      } catch (e) {
        results.errors.push(String(e));
        results.skipped++;
      }
    }
  }

  // Projects import (status already well-defined)
  if (type === "projects") {
    const validProjectStatuses = ["PLANNING", "ACTIVE", "ON_HOLD", "COMPLETED", "ARCHIVED"];

    let rows: Record<string, string>[] = [];
    if (format === "csv") {
      const lines   = (data as string).split("\n").filter(Boolean);
      const headers = lines[0].split(",").map((h) => h.trim());
      rows = lines.slice(1).map((line) => {
        const vals = line.match(/(".*?"|[^,]+)(?=,|$)/g) ?? line.split(",");
        return Object.fromEntries(headers.map((h, i) => [h, (vals[i] ?? "").replace(/^"|"$/g, "").trim()]));
      });
    } else {
      rows = Array.isArray(data) ? data : [];
    }

    for (const row of rows) {
      try {
        const name = (row.name ?? row.Name ?? "").trim();
        if (!name) { results.skipped++; continue; }

        const rawStatus = (row.status ?? "PLANNING").trim().toUpperCase();
        const status    = validProjectStatuses.includes(rawStatus) ? rawStatus : "PLANNING";

        await prisma.project.create({
          data: {
            name,
            description: row.description ?? null,
            status:      status as any,
            clientName:  row.clientName ?? null,
            deadline:    row.deadline   ? new Date(row.deadline) : null,
            color:       row.color?.match(/^#[0-9a-fA-F]{6}$/) ? row.color : "#4F52D9",
            ownerId:     userId,
            organizationId: orgId,
          },
        });
        results.created++;
      } catch (e) {
        results.errors.push(String(e));
        results.skipped++;
      }
    }
  }

  return NextResponse.json(results);
}
