import { NextRequest, NextResponse } from "next/server";
import { requireOrg, isOrgError } from "@/lib/org";
import { prisma } from "@/lib/prisma";
import { getBoardColumns } from "@/lib/board-templates";
import ExcelJS from "exceljs";

export async function POST(
  req: NextRequest,
  { params }: { params: { projectId: string } }
) {
  const ctx = await requireOrg();
  if (isOrgError(ctx)) return ctx;

  const project = await prisma.project.findFirst({
    where: { id: params.projectId, organizationId: ctx.orgId },
    include: {
      members: { include: { user: { select: { id: true, name: true, email: true } } } },
    },
  });
  if (!project) return NextResponse.json({ error: "Project not found" }, { status: 404 });

  // ── Resolve valid statuses ─────────────────────────────────────────
  const columns    = getBoardColumns(project.boardConfig ?? null);
  const labelToId: Record<string, string> = {};
  columns.forEach((c) => {
    labelToId[c.label.toLowerCase().trim()] = c.id;
    labelToId[c.id.toLowerCase().trim()]    = c.id;
  });
  const defaultStatus = columns[0]?.id ?? "TODO";
  const validIds      = new Set(columns.map((c) => c.id));

  // ── Resolve valid members ──────────────────────────────────────────
  const members       = project.members.map((m) => m.user);
  const nameToId: Record<string, string> = {};
  members.forEach((m) => {
    if (m.name)  nameToId[m.name.toLowerCase().trim()]  = m.id;
    if (m.email) nameToId[m.email.toLowerCase().trim()] = m.id;
  });

  function resolveStatus(raw: string | undefined | null): string {
    if (!raw) return defaultStatus;
    const key = raw.trim().toLowerCase();
    return labelToId[key] ?? (validIds.has(raw.trim().toUpperCase()) ? raw.trim().toUpperCase() : defaultStatus);
  }

  function resolveMember(raw: string | undefined | null): string | null {
    if (!raw?.trim()) return null;
    return nameToId[raw.trim().toLowerCase()] ?? null;
  }

  function resolvePriority(raw: string | undefined | null): string {
    const v = (raw ?? "MEDIUM").trim().toUpperCase();
    return ["URGENT", "HIGH", "MEDIUM", "LOW"].includes(v) ? v : "MEDIUM";
  }

  const results = { created: 0, skipped: 0, errors: [] as string[], warnings: [] as string[] };

  const contentType = req.headers.get("content-type") ?? "";

  // ── Handle Excel (.xlsx) upload ────────────────────────────────────
  if (contentType.includes("multipart/form-data")) {
    const form = await req.formData();
    const file = form.get("file") as File | null;
    if (!file) return NextResponse.json({ error: "No file" }, { status: 400 });
    if (file.size > 5 * 1024 * 1024) return NextResponse.json({ error: "File exceeds 5 MB limit" }, { status: 413 });

    const ext = file.name.split(".").pop()?.toLowerCase();

    if (ext === "xlsx" || ext === "xls") {
      if (ext === "xls") return NextResponse.json({ error: "Legacy .xls files are not supported; upload .xlsx or .csv" }, { status: 400 });
      const buf      = Buffer.from(await file.arrayBuffer());
      const workbook = new ExcelJS.Workbook();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await workbook.xlsx.load(buf as any);

      const sheet = workbook.getWorksheet("Tasks") ?? workbook.worksheets[0];
      if (!sheet) return NextResponse.json({ error: "No Tasks sheet found" }, { status: 400 });

      // Find header row (row 1)
      const headerRow = sheet.getRow(1);
      const headers: Record<string, number> = {};
      headerRow.eachCell((cell, col) => {
        const val = String(cell.value ?? "").trim().toLowerCase().replace(/[\s-]/g, "_");
        headers[val] = col;
      });

      const getCell = (row: ExcelJS.Row, key: string): string => {
        const col = headers[key];
        if (!col) return "";
        const v = row.getCell(col).value;
        if (v === null || v === undefined) return "";
        if (typeof v === "object" && "text" in (v as { text?: string })) return String((v as { text: string }).text);
        return String(v).trim();
      };

      if (sheet.rowCount > 1001) return NextResponse.json({ error: "Import is limited to 1,000 data rows" }, { status: 413 });
      for (let rowNum = 2; rowNum <= sheet.rowCount; rowNum++) {
        const row = sheet.getRow(rowNum);
        const title = getCell(row, "title");
        if (!title || title.toLowerCase().includes("required") || title.toLowerCase().includes("optional")) { results.skipped++; continue; } // skip hint row

        try {
          const rawStatus   = getCell(row, "status");
          const rawAssignee = getCell(row, "assignee");
          const status      = resolveStatus(rawStatus);
          const assigneeId  = resolveMember(rawAssignee);
          const priority    = resolvePriority(getCell(row, "priority"));

          const dueDateRaw   = getCell(row, "due_date") || getCell(row, "duedate") || getCell(row, "due date");
          const startDateRaw = getCell(row, "start_date") || getCell(row, "startdate") || getCell(row, "start date");
          const tagsRaw      = getCell(row, "tags");
          const estHours     = parseFloat(getCell(row, "estimated_hours") || getCell(row, "estimatedhours") || "0") || null;
          const storyPoints  = parseInt(getCell(row, "story_points") || getCell(row, "storypoints") || "0", 10) || null;

          if (rawStatus && status === defaultStatus && rawStatus.toLowerCase() !== columns[0]?.label.toLowerCase()) {
            results.warnings.push(`Row ${rowNum}: status "${rawStatus}" not found, defaulted to "${columns[0]?.label ?? defaultStatus}"`);
          }
          if (rawAssignee && !assigneeId) {
            results.warnings.push(`Row ${rowNum}: assignee "${rawAssignee}" not found in project members`);
          }

          const tags = tagsRaw ? tagsRaw.split(",").map((t) => t.trim()).filter(Boolean) : [];

          await prisma.task.create({
            data: {
              title:          title.trim(),
              description:    getCell(row, "description") || null,
              status:         status as any,
              priority:       priority as any,
              assigneeId:     assigneeId ?? null,
              creatorId:      ctx.userId,
              projectId:      params.projectId,
              dueDate:        dueDateRaw   ? new Date(dueDateRaw)   : null,
              startDate:      startDateRaw ? new Date(startDateRaw) : null,
              estimatedHours: estHours,
              storyPoints:    storyPoints,
              tags:           JSON.stringify(tags),
            },
          });
          results.created++;
        } catch (e) {
          results.errors.push(`Row ${rowNum}: ${String(e)}`);
          results.skipped++;
        }
      }
      return NextResponse.json(results);
    }

    // ── Handle CSV file upload ─────────────────────────────────────
    if (ext === "csv") {
      const text  = await file.text();
      const lines = text.split("\n").filter((l) => l.trim());
      if (lines.length > 1001) return NextResponse.json({ error: "Import is limited to 1,000 data rows" }, { status: 413 });
      const headers = lines[0].split(",").map((h) => h.replace(/^"|"$/g, "").trim().toLowerCase().replace(/\s+/g, "_"));

      const parseRow = (line: string): Record<string, string> => {
        const vals = line.match(/("(?:[^"]|"")*"|[^,]*)/g) ?? [];
        return Object.fromEntries(headers.map((h, i) => [h, (vals[i] ?? "").replace(/^"|"$/g, "").replace(/""/g, '"').trim()]));
      };

      for (let i = 1; i < lines.length; i++) {
        const row = parseRow(lines[i]);
        const title = row.title ?? "";
        if (!title || title.toLowerCase().includes("required")) { results.skipped++; continue; }

        try {
          const status     = resolveStatus(row.status);
          const assigneeId = resolveMember(row.assignee);
          const priority   = resolvePriority(row.priority);
          const tags       = (row.tags ?? "").split(",").map((t) => t.trim()).filter(Boolean);

          await prisma.task.create({
            data: {
              title:     title.trim(),
              description: row.description || null,
              status:    status as any,
              priority:  priority as any,
              assigneeId: assigneeId ?? null,
              creatorId: ctx.userId,
              projectId: params.projectId,
              dueDate:   row.due_date   ? new Date(row.due_date)   : null,
              startDate: row.start_date ? new Date(row.start_date) : null,
              estimatedHours: row.estimated_hours ? parseFloat(row.estimated_hours) : null,
              storyPoints:    row.story_points    ? parseInt(row.story_points)       : null,
              tags:      JSON.stringify(tags),
            },
          });
          results.created++;
        } catch (e) {
          results.errors.push(`Row ${i + 1}: ${String(e)}`);
          results.skipped++;
        }
      }

      return NextResponse.json(results);
    }

    return NextResponse.json({ error: "Unsupported file type. Use .xlsx or .csv" }, { status: 400 });
  }

  return NextResponse.json({ error: "Expected multipart/form-data" }, { status: 400 });
}
