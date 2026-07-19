import { prisma } from "@/lib/prisma";

export type RewardAction = "task_complete" | "task_early" | "attendance" | "streak";

const REWARDED_ROLES = ["MEMBER", "MANAGER", "ADMIN"];

const DEFAULT_CONFIG: Record<string, Record<RewardAction, number>> = {
  MEMBER:  { task_complete: 10, task_early: 5,  attendance: 15, streak: 25 },
  MANAGER: { task_complete: 8,  task_early: 4,  attendance: 10, streak: 20 },
  ADMIN:   { task_complete: 5,  task_early: 3,  attendance: 8,  streak: 15 },
};

const SYSTEM_BADGES = [
  { name: "first_task",      label: "First Blood",      description: "Complete your first task",              icon: "⚡", roleScope: null,      conditionType: "ACTION_COUNT", conditionValue: 1,    conditionAction: "task_complete" },
  { name: "task_warrior",    label: "Task Warrior",      description: "Complete 25 tasks",                     icon: "⚔️", roleScope: null,      conditionType: "ACTION_COUNT", conditionValue: 25,   conditionAction: "task_complete" },
  { name: "century_club",    label: "Century Club",      description: "Complete 100 tasks",                    icon: "💯", roleScope: null,      conditionType: "ACTION_COUNT", conditionValue: 100,  conditionAction: "task_complete" },
  { name: "early_bird",      label: "Early Bird",        description: "Complete 10 tasks before the deadline", icon: "🐦", roleScope: null,      conditionType: "ACTION_COUNT", conditionValue: 10,   conditionAction: "task_early" },
  { name: "attendance_star", label: "Attendance Star",   description: "Mark attendance 20 times",              icon: "⭐", roleScope: null,      conditionType: "ACTION_COUNT", conditionValue: 20,   conditionAction: "attendance" },
  { name: "on_fire",         label: "On Fire",           description: "Earn a 7-day activity streak",          icon: "🔥", roleScope: null,      conditionType: "ACTION_COUNT", conditionValue: 7,    conditionAction: "streak" },
  // Role-specific milestones by lifetime points
  { name: "member_rising",   label: "Rising Star",       description: "Reach 500 lifetime points as a Member", icon: "🌟", roleScope: "MEMBER",  conditionType: "LIFETIME_POINTS", conditionValue: 500,  conditionAction: null },
  { name: "member_top",      label: "Top Performer",     description: "Reach 2000 lifetime points as a Member",icon: "🏆", roleScope: "MEMBER",  conditionType: "LIFETIME_POINTS", conditionValue: 2000, conditionAction: null },
  { name: "mgr_champion",    label: "Team Champion",     description: "Reach 1000 lifetime points as Manager", icon: "🥇", roleScope: "MANAGER", conditionType: "LIFETIME_POINTS", conditionValue: 1000, conditionAction: null },
  { name: "mgr_excellence",  label: "Excellence Award",  description: "Reach 3000 lifetime points as Manager", icon: "🎖️", roleScope: "MANAGER", conditionType: "LIFETIME_POINTS", conditionValue: 3000, conditionAction: null },
  { name: "admin_guardian",  label: "System Guardian",   description: "Reach 750 lifetime points as Admin",    icon: "🛡️", roleScope: "ADMIN",   conditionType: "LIFETIME_POINTS", conditionValue: 750,  conditionAction: null },
  { name: "admin_master",    label: "Operations Master", description: "Reach 2000 lifetime points as Admin",   icon: "👑", roleScope: "ADMIN",   conditionType: "LIFETIME_POINTS", conditionValue: 2000, conditionAction: null },
];

export async function seedRewardDefaults(organizationId: string) {
  // Seed RewardConfig for all roles scoped to this org
  for (const role of REWARDED_ROLES) {
    for (const [action, points] of Object.entries(DEFAULT_CONFIG[role])) {
      await (prisma as any).rewardConfig.upsert({
        where: { organizationId_role_action: { organizationId, role, action } },
        update: {},
        create: { organizationId, role, action, points, isEnabled: true },
      });
    }
  }

  // Seed system badges scoped to this org
  for (const badge of SYSTEM_BADGES) {
    await (prisma as any).badge.upsert({
      where: { organizationId_name: { organizationId, name: badge.name } },
      update: {},
      create: { ...badge, organizationId, isSystem: true },
    });
  }
}

async function getPointsForAction(role: string, action: RewardAction, organizationId?: string): Promise<number> {
  const config = await (prisma as any).rewardConfig.findFirst({
    where: organizationId
      ? { organizationId, role, action }
      : { role, action },
  });
  if (!config || !config.isEnabled) return 0;
  return config.points;
}

async function getOrCreateUserPoints(userId: string) {
  return prisma.userPoints.upsert({
    where: { userId },
    update: {},
    create: { userId, balance: 0, lifetime: 0 },
  });
}

async function checkAndAwardBadges(userId: string, role: string) {
  const [allBadges, earned, userPoints, actionCounts] = await Promise.all([
    prisma.badge.findMany(),
    prisma.userBadge.findMany({ where: { userId }, select: { badgeId: true } }),
    prisma.userPoints.findUnique({ where: { userId } }),
    prisma.pointTransaction.groupBy({
      by: ["action"],
      where: { userId },
      _count: { action: true },
    }),
  ]);

  const earnedIds = new Set(earned.map((e) => e.badgeId));
  const actionCountMap: Record<string, number> = {};
  for (const row of actionCounts) actionCountMap[row.action] = row._count.action;

  const newBadges: string[] = [];

  for (const badge of allBadges) {
    if (earnedIds.has(badge.id)) continue;
    if (badge.roleScope && badge.roleScope !== role) continue;

    let unlocked = false;
    if (badge.conditionType === "LIFETIME_POINTS") {
      unlocked = (userPoints?.lifetime ?? 0) >= badge.conditionValue;
    } else if (badge.conditionType === "ACTION_COUNT" && badge.conditionAction) {
      unlocked = (actionCountMap[badge.conditionAction] ?? 0) >= badge.conditionValue;
    }

    if (unlocked) {
      await prisma.userBadge.create({ data: { userId, badgeId: badge.id } });
      newBadges.push(badge.label);
    }
  }

  return newBadges;
}

async function calculateStreak(userId: string): Promise<number> {
  // Get distinct calendar days with activity (task_complete or attendance)
  const rows = await prisma.pointTransaction.findMany({
    where: { userId, action: { in: ["task_complete", "attendance"] } },
    select: { createdAt: true },
    orderBy: { createdAt: "desc" },
  });

  const seen = new Set<string>();
  const days: string[] = [];
  for (const r of rows) {
    const d = r.createdAt.toISOString().split("T")[0];
    if (!seen.has(d)) { seen.add(d); days.push(d); }
  }
  if (days.length === 0) return 0;

  const today = new Date().toISOString().split("T")[0];
  let streak = 0;
  let current = today;

  for (const day of days) {
    if (day === current) {
      streak++;
      const d = new Date(current);
      d.setDate(d.getDate() - 1);
      current = d.toISOString().split("T")[0];
    } else if (day < current) {
      break;
    }
  }

  return streak;
}

export async function awardPoints(
  userId: string,
  role: string,
  action: RewardAction,
  metadata: Record<string, unknown> = {}
): Promise<{ points: number; newBadges: string[]; streak?: number }> {
  if (!REWARDED_ROLES.includes(role)) return { points: 0, newBadges: [] };

  const pts = await getPointsForAction(role, action);
  if (pts === 0) return { points: 0, newBadges: [] };

  const up = await getOrCreateUserPoints(userId);

  await prisma.$transaction([
    prisma.userPoints.update({
      where: { userId },
      data: { balance: { increment: pts }, lifetime: { increment: pts } },
    }),
    prisma.pointTransaction.create({
      data: { userId, userPointsId: up.id, action, points: pts, metadata: JSON.stringify(metadata) },
    }),
  ]);

  // Check streak after task_complete or attendance
  let streak: number | undefined;
  if (action === "task_complete" || action === "attendance") {
    streak = await calculateStreak(userId);
    if (streak > 0 && streak % 7 === 0) {
      // Award streak bonus every 7-day multiple
      const streakPts = await getPointsForAction(role, "streak");
      if (streakPts > 0) {
        await prisma.$transaction([
          prisma.userPoints.update({
            where: { userId },
            data: { balance: { increment: streakPts }, lifetime: { increment: streakPts } },
          }),
          prisma.pointTransaction.create({
            data: { userId, userPointsId: up.id, action: "streak", points: streakPts, metadata: JSON.stringify({ streak }) },
          }),
        ]);
      }
    }
  }

  // Refresh userPoints then check badges
  await prisma.userPoints.findUnique({ where: { userId } });
  const newBadges = await checkAndAwardBadges(userId, role);

  return { points: pts, newBadges, streak };
}
