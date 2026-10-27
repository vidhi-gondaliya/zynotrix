import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const user = await prisma.$transaction(async (tx) => {
      const ownerCount = await tx.user.count({ where: { role: "OWNER" } });
      if (ownerCount > 0) throw new Error("OWNER_EXISTS");
      return tx.user.update({
        where: { id: session.user.id },
        data: { role: "OWNER" },
        select: { id: true, name: true, email: true, role: true },
      });
    }, { isolationLevel: "Serializable" });

    return NextResponse.json({ ok: true, user, message: "You are now OWNER. Please sign out and sign back in." });
  } catch (error) {
    if (error instanceof Error && error.message === "OWNER_EXISTS") {
      return NextResponse.json({ error: "An OWNER already exists. Use Admin Panel to manage roles." }, { status: 403 });
    }
    // A serialization conflict is expected if two bootstrap attempts race.
    console.error("[admin/bootstrap] bootstrap failed", error);
    return NextResponse.json({ error: "Bootstrap could not be completed. Please retry." }, { status: 409 });
  }
}
