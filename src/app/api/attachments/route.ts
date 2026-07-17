import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { writeFile, mkdir } from "fs/promises";
import path from "path";

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const formData = await req.formData();
  const file     = formData.get("file") as File | null;
  const taskId   = formData.get("taskId") as string | null;

  if (!file) return NextResponse.json({ error: "No file" }, { status: 400 });

  const bytes  = await file.arrayBuffer();
  const buffer = Buffer.from(bytes);

  // Store in public/uploads/<taskId>/
  const uploadDir = path.join(process.cwd(), "public", "uploads", taskId ?? "general");
  await mkdir(uploadDir, { recursive: true });

  const safeName = `${Date.now()}-${file.name.replace(/[^a-zA-Z0-9._-]/g, "_")}`;
  const filePath = path.join(uploadDir, safeName);
  await writeFile(filePath, buffer);

  const url = `/uploads/${taskId ?? "general"}/${safeName}`;

  // Store in DB using raw insert (no Attachment model in schema yet, so use local storage only)
  // Return a virtual attachment record
  const att = {
    id:        `att_${Date.now()}`,
    name:      file.name,
    url,
    size:      file.size,
    type:      file.type,
    taskId:    taskId ?? null,
    uploaderId: session.user.id,
    createdAt: new Date().toISOString(),
  };

  return NextResponse.json(att, { status: 201 });
}
