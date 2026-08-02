import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { readFile } from "fs/promises";
import path from "path";
import { lookup } from "mime-types";

async function getLocalUploadDir(orgId: string): Promise<string | null> {
  try {
    const integration = await (prisma as any).integration.findUnique({
      where: { organizationId_type: { organizationId: orgId, type: "STORAGE_LOCAL" } },
    });
    if (!integration || !integration.isActive) return null;
    const cfg = JSON.parse(integration.config ?? "{}");
    return cfg.uploadDir ?? null;
  } catch {
    return null;
  }
}

export async function GET(
  _req: NextRequest,
  { params }: { params: { filePath: string[] } }
) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const orgId = session.user.organizationId as string | null;
  if (!orgId) return NextResponse.json({ error: "No organization" }, { status: 403 });

  const uploadDir = await getLocalUploadDir(orgId);
  if (!uploadDir) return NextResponse.json({ error: "Local storage not configured" }, { status: 404 });

  // Sanitize path — prevent directory traversal
  const relativePath = params.filePath.join("/").replace(/\.\./g, "");
  const filePath = path.join(uploadDir, relativePath);

  // Ensure resolved path stays inside uploadDir
  if (!filePath.startsWith(path.resolve(uploadDir))) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const data     = await readFile(filePath);
    const mimeType = (lookup(filePath) as string | false) || "application/octet-stream";
    return new NextResponse(data, {
      headers: {
        "Content-Type":        mimeType,
        "Content-Disposition": `inline; filename="${path.basename(filePath)}"`,
        "Cache-Control":       "private, max-age=3600",
      },
    });
  } catch {
    return NextResponse.json({ error: "File not found" }, { status: 404 });
  }
}
