import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// One-time endpoint: promotes the currently logged-in user to OWNER
// Only works if there are no OWNER users yet (safe bootstrap)
export async function POST() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const ownerCount = await prisma.user.count({ where: { role: "OWNER" } });
  if (ownerCount > 0) {
    return NextResponse.json({ error: "An OWNER already exists. Use Admin Panel to manage roles." }, { status: 403 });
  }

  const user = await prisma.user.update({
    where: { id: session.user.id },
    data: { role: "OWNER" },
    select: { id: true, name: true, email: true, role: true },
  });

  return NextResponse.json({ ok: true, user, message: "You are now OWNER. Please sign out and sign back in." });
}
