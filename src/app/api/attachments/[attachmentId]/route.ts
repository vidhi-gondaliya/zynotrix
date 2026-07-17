import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { unlink } from "fs/promises";
import path from "path";

export async function DELETE(req: NextRequest, { params }: { params: { attachmentId: string } }) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // Try to delete the file if URL is passed in body
  try {
    const body = await req.json().catch(() => ({}));
    if (body.url) {
      const filePath = path.join(process.cwd(), "public", body.url);
      await unlink(filePath).catch(() => {});
    }
  } catch {}

  return NextResponse.json({ ok: true });
}
