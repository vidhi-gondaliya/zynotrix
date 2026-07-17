import { prisma } from "@/lib/prisma";

export async function logAudit(
  userId: string, action: string, entityType: string, entityId: string, changes?: object
) {
  try {
    await (prisma as any).auditLog.create({
      data: {
        userId, action, entityType, entityId,
        changes: changes ? JSON.stringify(changes) : null,
      },
    });
  } catch {}
}
