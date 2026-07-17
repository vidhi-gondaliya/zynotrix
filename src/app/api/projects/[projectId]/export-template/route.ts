import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getBoardColumns } from "@/lib/board-templates";
import ExcelJS from "exceljs";

export async function GET(
  _req: NextRequest,
  { params }: { params: { projectId: string } }
) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const project = await prisma.project.findUnique({
    where: { id: params.projectId },
    include: {
      members: { include: { user: { select: { id: true, name: true, email: true } } } },
    },
  });
  if (!project) return NextResponse.json({ error: "Not found" }, { status: 404 });

  // ── Resolve board columns ──────────────────────────────────────────
  const columns = getBoardColumns(project.boardConfig ?? null);
  const statusLabels = columns.map((c) => c.label);  // human-readable e.g. "To Do", "Content Creation"
  const statusIds    = columns.map((c) => c.id);      // internal IDs e.g. "TODO", "CONTENT_CREATION"

  // ── Resolve assignable members ─────────────────────────────────────
  const members = project.members.map((m) => m.user);
  const memberNames = members.map((m) => m.name ?? m.email ?? "");

  // ── Build workbook ─────────────────────────────────────────────────
  const workbook = new ExcelJS.Workbook();
  workbook.creator  = "ZYNOTRIX";
  workbook.created  = new Date();

  // ── Reference sheet (hidden in Excel, used for dropdown lists) ─────
  const refSheet = workbook.addWorksheet("_ref", { state: "hidden" });
  // Column A: status labels, Column B: member names
  statusLabels.forEach((label, i) => { refSheet.getCell(i + 1, 1).value = label; });
  memberNames.forEach((name, i) => { refSheet.getCell(i + 1, 2).value = name; });

  // ── Main task sheet ────────────────────────────────────────────────
  const sheet = workbook.addWorksheet("Tasks", {
    pageSetup: { fitToPage: true, fitToWidth: 1 },
    views: [{ state: "frozen", ySplit: 2 }],  // freeze top 2 rows
  });

  // ── Column definitions ─────────────────────────────────────────────
  sheet.columns = [
    { header: "title",           key: "title",    width: 40 },
    { header: "description",     key: "desc",     width: 50 },
    { header: "status",          key: "status",   width: 22 },
    { header: "priority",        key: "priority", width: 14 },
    { header: "assignee",        key: "assignee", width: 26 },
    { header: "due_date",        key: "dueDate",  width: 14 },
    { header: "start_date",      key: "startDate",width: 14 },
    { header: "estimated_hours", key: "estHours", width: 18 },
    { header: "story_points",    key: "points",   width: 14 },
    { header: "tags",            key: "tags",     width: 30 },
  ];

  // ── Header row styling ─────────────────────────────────────────────
  const headerRow = sheet.getRow(1);
  headerRow.height = 28;
  headerRow.eachCell((cell, colNum) => {
    cell.font      = { bold: true, size: 11, color: { argb: "FFFFFFFF" } };
    cell.fill      = { type: "pattern", pattern: "solid", fgColor: { argb: "FF4F52D9" } };
    cell.alignment = { vertical: "middle", horizontal: "center" };
    cell.border    = { bottom: { style: "thin", color: { argb: "FF3A3DA0" } } };
    // Mark required columns
    if (colNum === 1) cell.font = { bold: true, size: 11, color: { argb: "FFFFFFFF" } };
  });

  // ── Hint row (row 2) — shows valid values, light grey background ───
  const hintRow = sheet.getRow(2);
  hintRow.height = 20;
  const hints: Record<number, string> = {
    1: "Required — task name",
    2: "Optional — task description",
    3: `Options: ${statusLabels.join(" | ")}`,
    4: "URGENT · HIGH · MEDIUM · LOW",
    5: memberNames.length ? `Options: ${memberNames.slice(0, 4).join(" | ")}${memberNames.length > 4 ? "…" : ""}` : "Team member name",
    6: "YYYY-MM-DD",
    7: "YYYY-MM-DD",
    8: "Number (e.g. 4)",
    9: "Number (e.g. 3)",
    10: "Comma-separated (e.g. frontend,bug)",
  };
  Object.entries(hints).forEach(([col, hint]) => {
    const cell       = hintRow.getCell(Number(col));
    cell.value       = hint;
    cell.font        = { italic: true, size: 9, color: { argb: "FF888888" } };
    cell.fill        = { type: "pattern", pattern: "solid", fgColor: { argb: "FFF7F8FF" } };
    cell.alignment   = { vertical: "middle" };
  });

  // ── 3 sample rows ──────────────────────────────────────────────────
  const samples = [
    {
      title: "Build landing page", desc: "Create hero section with CTA and pricing table",
      status: statusLabels[1] ?? statusLabels[0], priority: "HIGH",
      assignee: memberNames[0] ?? "", dueDate: "2025-08-15",
      startDate: "2025-08-01", estHours: "8", points: "5", tags: "frontend,design",
    },
    {
      title: "API integration", desc: "Connect payment gateway and test webhooks",
      status: statusLabels[0], priority: "MEDIUM",
      assignee: memberNames[1] ?? memberNames[0] ?? "", dueDate: "2025-08-20",
      startDate: "", estHours: "4", points: "3", tags: "backend",
    },
    {
      title: "Write unit tests", desc: "Add test coverage for auth and task modules",
      status: statusLabels[0], priority: "LOW",
      assignee: "", dueDate: "", startDate: "", estHours: "3", points: "2", tags: "testing",
    },
  ];

  samples.forEach((s, idx) => {
    const row = sheet.getRow(3 + idx);
    row.values = ["", s.title, s.desc, s.status, s.priority, s.assignee, s.dueDate, s.startDate, s.estHours, s.points, s.tags];
    // Skip col 1 (blank), start from col 1 properly
    row.getCell(1).value = s.title;
    row.getCell(2).value = s.desc;
    row.getCell(3).value = s.status;
    row.getCell(4).value = s.priority;
    row.getCell(5).value = s.assignee;
    row.getCell(6).value = s.dueDate;
    row.getCell(7).value = s.startDate;
    row.getCell(8).value = s.estHours ? Number(s.estHours) : null;
    row.getCell(9).value = s.points   ? Number(s.points)   : null;
    row.getCell(10).value = s.tags;
    row.height = 18;
  });

  // ── Data validation: Status dropdown ──────────────────────────────
  const maxRows  = 500;
  const statusFormula = statusLabels.length
    ? `"${statusLabels.join(",")}"`
    : `"${statusIds.join(",")}"`;

  for (let r = 3; r <= maxRows; r++) {
    sheet.getCell(r, 3).dataValidation = {
      type:       "list",
      allowBlank: true,
      formulae:   [statusFormula],
      showErrorMessage: true,
      errorTitle: "Invalid status",
      error: `Please choose from: ${statusLabels.join(", ")}`,
    };
  }

  // ── Data validation: Priority dropdown ────────────────────────────
  for (let r = 3; r <= maxRows; r++) {
    sheet.getCell(r, 4).dataValidation = {
      type:       "list",
      allowBlank: true,
      formulae:   [`"URGENT,HIGH,MEDIUM,LOW"`],
      showErrorMessage: true,
      errorTitle: "Invalid priority",
      error:      "Choose: URGENT, HIGH, MEDIUM, or LOW",
    };
  }

  // ── Data validation: Assignee dropdown ────────────────────────────
  if (memberNames.length) {
    const assigneeFormula = `"${memberNames.join(",")}"`;
    for (let r = 3; r <= maxRows; r++) {
      sheet.getCell(r, 5).dataValidation = {
        type:       "list",
        allowBlank: true,
        formulae:   [assigneeFormula],
        showErrorMessage: false,
      };
    }
  }

  // ── Alternating row colors for readability ─────────────────────────
  for (let r = 3; r <= 10; r++) {
    const row = sheet.getRow(r);
    if (r % 2 === 0) {
      row.eachCell({ includeEmpty: true }, (cell, col) => {
        if (col <= 10 && !cell.value) {
          cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFF2F3FD" } };
        }
      });
    }
  }

  // ── Column widths + number formats ────────────────────────────────
  sheet.getColumn(8).numFmt = "0.0";  // estimated hours
  sheet.getColumn(9).numFmt = "0";    // story points

  // ── Info sheet ─────────────────────────────────────────────────────
  const infoSheet = workbook.addWorksheet("Instructions");
  const infoRows = [
    ["ZYNOTRIX — Task Import Template"],
    [`Project: ${project.name}`],
    [""],
    ["HOW TO USE"],
    ["1. Fill in the 'Tasks' sheet. Row 1 = headers (do not change), Row 2 = hints (you can delete it)."],
    ["2. Required column: title"],
    ["3. Status and Assignee columns have dropdowns — click the cell and select from the list."],
    ["4. Date format: YYYY-MM-DD (e.g. 2025-08-15)"],
    ["5. Tags: comma-separated, no spaces around commas (e.g. frontend,bug,auth)"],
    ["6. Save the file, then upload it in ZYNOTRIX → Board → Import"],
    [""],
    ["VALID STATUS VALUES"],
    ...statusLabels.map((l, i) => [`  ${l} (id: ${statusIds[i]})`]),
    [""],
    ["VALID PRIORITY VALUES"],
    ["  URGENT, HIGH, MEDIUM, LOW"],
    [""],
    ["TEAM MEMBERS"],
    ...memberNames.map((n) => [`  ${n}`]),
  ];

  infoRows.forEach((row, i) => {
    const r = infoSheet.getRow(i + 1);
    r.getCell(1).value = row[0];
    if (i === 0) r.getCell(1).font = { bold: true, size: 14 };
    if (i === 3) r.getCell(1).font = { bold: true, size: 12 };
    if (i === 11 || i === 15 + statusLabels.length || i === 17 + statusLabels.length)
      r.getCell(1).font = { bold: true };
  });
  infoSheet.getColumn(1).width = 70;

  // ── Serialize ──────────────────────────────────────────────────────
  const buffer = await workbook.xlsx.writeBuffer();

  const safeName = project.name.replace(/[^a-z0-9]/gi, "_").toLowerCase();
  return new NextResponse(buffer, {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="${safeName}-task-template.xlsx"`,
    },
  });
}
