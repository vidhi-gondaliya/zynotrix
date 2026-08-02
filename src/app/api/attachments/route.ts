import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { writeFile, mkdir } from "fs/promises";
import path from "path";

async function getLocalStorageConfig(orgId: string): Promise<{ uploadDir: string; maxFileMb: number } | null> {
  try {
    const integration = await (prisma as any).integration.findUnique({
      where: { organizationId_type: { organizationId: orgId, type: "STORAGE_LOCAL" } },
    });
    if (!integration || !integration.isActive) return null;
    const cfg = JSON.parse(integration.config ?? "{}");
    if (!cfg.uploadDir) return null;
    return cfg;
  } catch {
    return null;
  }
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const formData = await req.formData();
  const file     = formData.get("file") as File | null;
  const taskId   = formData.get("taskId") as string | null;

  if (!file) return NextResponse.json({ error: "No file" }, { status: 400 });

  const bytes  = await file.arrayBuffer();
  const buffer = Buffer.from(bytes);
  const safeName = `${Date.now()}-${file.name.replace(/[^a-zA-Z0-9._-]/g, "_")}`;

  // Check for STORAGE_LOCAL integration config
  const orgId = session.user.organizationId as string | null;
  const localCfg = orgId ? await getLocalStorageConfig(orgId) : null;

  let url: string;

  if (localCfg) {
    // Use the configured upload directory
    if (localCfg.maxFileMb && file.size > localCfg.maxFileMb * 1024 * 1024) {
      return NextResponse.json({ error: `File too large. Max ${localCfg.maxFileMb} MB.` }, { status: 413 });
    }

    const subDir = taskId ?? "general";
    const uploadDir = path.join(localCfg.uploadDir, subDir);
    await mkdir(uploadDir, { recursive: true });
    await writeFile(path.join(uploadDir, safeName), buffer);

    // Served via /api/files/[...path] route
    url = `/api/files/${subDir}/${safeName}`;
  } else {
    // Fallback: store in public/uploads (served statically)
    const uploadDir = path.join(process.cwd(), "public", "uploads", taskId ?? "general");
    await mkdir(uploadDir, { recursive: true });
    await writeFile(path.join(uploadDir, safeName), buffer);
    url = `/uploads/${taskId ?? "general"}/${safeName}`;
  }

  const att = {
    id:         `att_${Date.now()}`,
    name:       file.name,
    url,
    size:       file.size,
    type:       file.type,
    taskId:     taskId ?? null,
    uploaderId: session.user.id,
    createdAt:  new Date().toISOString(),
  };

  return NextResponse.json(att, { status: 201 });
}
