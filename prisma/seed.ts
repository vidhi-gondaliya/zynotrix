import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

const now = new Date();
const daysAgo = (n: number) => new Date(now.getTime() - n * 86400000);
const daysFromNow = (n: number) => new Date(now.getTime() + n * 86400000);
const hoursAgo = (n: number) => new Date(now.getTime() - n * 3600000);

async function main() {
  console.log("🌱 Seeding ZYNOTRIX demo database...");

  const hash = await bcrypt.hash("password123", 12);

  // ── USERS ──────────────────────────────────────────────────────────────────
  const [sarah, marcus, priya, james, elena, noah, zara, dev] = await Promise.all([
    prisma.user.upsert({
      where: { email: "sarah@nexusdigital.io" }, update: {},
      create: { email: "sarah@nexusdigital.io", name: "Sarah Mitchell", passwordHash: hash, role: "OWNER",
        image: "https://api.dicebear.com/7.x/avataaars/svg?seed=sarah" },
    }),
    prisma.user.upsert({
      where: { email: "marcus@nexusdigital.io" }, update: {},
      create: { email: "marcus@nexusdigital.io", name: "Marcus Chen", passwordHash: hash, role: "MANAGER",
        image: "https://api.dicebear.com/7.x/avataaars/svg?seed=marcus" },
    }),
    prisma.user.upsert({
      where: { email: "priya@nexusdigital.io" }, update: {},
      create: { email: "priya@nexusdigital.io", name: "Priya Kapoor", passwordHash: hash, role: "MEMBER",
        image: "https://api.dicebear.com/7.x/avataaars/svg?seed=priya" },
    }),
    prisma.user.upsert({
      where: { email: "james@nexusdigital.io" }, update: {},
      create: { email: "james@nexusdigital.io", name: "James O'Brien", passwordHash: hash, role: "MEMBER",
        image: "https://api.dicebear.com/7.x/avataaars/svg?seed=james" },
    }),
    prisma.user.upsert({
      where: { email: "elena@nexusdigital.io" }, update: {},
      create: { email: "elena@nexusdigital.io", name: "Elena Vasquez", passwordHash: hash, role: "MEMBER",
        image: "https://api.dicebear.com/7.x/avataaars/svg?seed=elena" },
    }),
    prisma.user.upsert({
      where: { email: "noah@nexusdigital.io" }, update: {},
      create: { email: "noah@nexusdigital.io", name: "Noah Williams", passwordHash: hash, role: "MEMBER",
        image: "https://api.dicebear.com/7.x/avataaars/svg?seed=noah" },
    }),
    prisma.user.upsert({
      where: { email: "zara@nexusdigital.io" }, update: {},
      create: { email: "zara@nexusdigital.io", name: "Zara Ahmed", passwordHash: hash, role: "MEMBER",
        image: "https://api.dicebear.com/7.x/avataaars/svg?seed=zara" },
    }),
    prisma.user.upsert({
      where: { email: "demo@nexusdigital.io" }, update: {},
      create: { email: "demo@nexusdigital.io", name: "Demo User", passwordHash: hash, role: "ADMIN",
        image: "https://api.dicebear.com/7.x/avataaars/svg?seed=demo" },
    }),
  ]);
  console.log("✅ Users created");

  const users = [sarah, marcus, priya, james, elena, noah, zara, dev];

  // ── ORGANIZATION ──────────────────────────────────────────────────────────
  let org = await prisma.organization.findFirst({ where: { slug: "nexus-digital" } });
  if (!org) {
    org = await prisma.organization.create({
      data: {
        name: "Nexus Digital Agency",
        slug: "nexus-digital",
        plan: "PRO",
        members: {
          create: [
            { userId: sarah.id,  role: "ADMIN"   },
            { userId: marcus.id, role: "MANAGER"  },
            { userId: priya.id,  role: "MEMBER"   },
            { userId: james.id,  role: "MEMBER"   },
            { userId: elena.id,  role: "MEMBER"   },
            { userId: noah.id,   role: "MEMBER"   },
            { userId: zara.id,   role: "MEMBER"   },
            { userId: dev.id,    role: "ADMIN"    },
          ],
        },
      },
    });
  }
  const orgId = org.id;
  console.log("✅ Organization created");

  // ── ROLES ──────────────────────────────────────────────────────────────────
  await prisma.role.createMany({
    skipDuplicates: true,
    data: [
      { organizationId: orgId, name: "ADMIN",     label: "Admin",          color: "#F43F5E", permissions: JSON.stringify(["*"]),                                                         isSystem: true  },
      { organizationId: orgId, name: "MANAGER",   label: "Project Manager",color: "#F59E0B", permissions: JSON.stringify(["projects.create","tasks.create","tasks.assign","members.view","reports.view"]), isSystem: true },
      { organizationId: orgId, name: "MEMBER",    label: "Team Member",    color: "#6B7280", permissions: JSON.stringify(["tasks.create","tasks.view","members.view"]),                  isSystem: true  },
      { organizationId: orgId, name: "DESIGNER",  label: "Designer",       color: "#8B5CF6", permissions: JSON.stringify(["tasks.create","tasks.view","projects.view","documents.create"]), isSystem: false },
      { organizationId: orgId, name: "DEVELOPER", label: "Developer",      color: "#06B6D4", permissions: JSON.stringify(["tasks.create","tasks.view","projects.view","sprints.view"]),  isSystem: false },
      { organizationId: orgId, name: "LEAD",      label: "Team Lead",      color: "#10B981", permissions: JSON.stringify(["tasks.create","tasks.assign","projects.view","reports.view","members.view"]), isSystem: false },
    ],
  });
  console.log("✅ Roles created");

  // ── REWARD CONFIG ──────────────────────────────────────────────────────────
  await prisma.rewardConfig.createMany({
    skipDuplicates: true,
    data: [
      { organizationId: orgId, role: "MEMBER",  action: "task_complete", points: 10, isEnabled: true },
      { organizationId: orgId, role: "MEMBER",  action: "task_early",    points: 5,  isEnabled: true },
      { organizationId: orgId, role: "MEMBER",  action: "attendance",    points: 2,  isEnabled: true },
      { organizationId: orgId, role: "MANAGER", action: "task_complete", points: 15, isEnabled: true },
      { organizationId: orgId, role: "MANAGER", action: "task_early",    points: 8,  isEnabled: true },
      { organizationId: orgId, role: "MANAGER", action: "attendance",    points: 3,  isEnabled: true },
      { organizationId: orgId, role: "ADMIN",   action: "task_complete", points: 20, isEnabled: true },
      { organizationId: orgId, role: "ADMIN",   action: "attendance",    points: 5,  isEnabled: true },
    ],
  });
  console.log("✅ Reward configs created");

  // ── BADGES ──────────────────────────────────────────────────────────────────
  const badgesData = [
    { name: "FIRST_TASK",      label: "First Blood",        description: "Completed your first task",       icon: "⚡", conditionType: "task_count",    conditionValue: 1,   isSystem: true  },
    { name: "TASK_MACHINE",    label: "Task Machine",       description: "Completed 50 tasks",              icon: "🤖", conditionType: "task_count",    conditionValue: 50,  isSystem: true  },
    { name: "CENTURY",         label: "Century Club",       description: "Completed 100 tasks",             icon: "💯", conditionType: "task_count",    conditionValue: 100, isSystem: true  },
    { name: "EARLY_BIRD",      label: "Early Bird",         description: "Finished 10 tasks before due date",icon: "🌅",conditionType: "early_count",   conditionValue: 10,  isSystem: false },
    { name: "STREAK_WEEK",     label: "Weekly Warrior",     description: "Logged in 7 days in a row",       icon: "🔥", conditionType: "streak_days",   conditionValue: 7,   isSystem: false },
    { name: "STREAK_MONTH",    label: "Iron Attendance",    description: "30-day attendance streak",         icon: "🏅", conditionType: "streak_days",   conditionValue: 30,  isSystem: false },
    { name: "POINT_HUNTER",    label: "Point Hunter",       description: "Earned 500 lifetime points",       icon: "💰", conditionType: "points_lifetime",conditionValue: 500, isSystem: false },
    { name: "LEGEND",          label: "Legend",             description: "Earned 2000 lifetime points",      icon: "👑", conditionType: "points_lifetime",conditionValue: 2000,isSystem: false },
    { name: "COLLABORATOR",    label: "Collaborator",       description: "Left 25 task comments",            icon: "💬", conditionType: "comment_count", conditionValue: 25,  isSystem: false },
    { name: "SPEED_DEMON",     label: "Speed Demon",        description: "Completed 5 tasks in one day",     icon: "🚀", conditionType: "task_count",    conditionValue: 5,   isSystem: false },
  ];
  const createdBadges: Record<string, string> = {};
  for (const b of badgesData) {
    const badge = await prisma.badge.upsert({
      where: { organizationId_name: { organizationId: orgId, name: b.name } },
      update: {},
      create: { ...b, organizationId: orgId },
    });
    createdBadges[b.name] = badge.id;
  }
  console.log("✅ Badges created");

  // ── COUPONS ──────────────────────────────────────────────────────────────────
  await prisma.coupon.createMany({
    skipDuplicates: true,
    data: [
      { organizationId: orgId, code: "COFFEE50",  label: "Coffee Break",       description: "Free coffee from the office café",    pointCost: 50,  quantity: 100, isActive: true, createdById: sarah.id, expiresAt: daysFromNow(90) },
      { organizationId: orgId, code: "LUNCH200",  label: "Team Lunch",         description: "$20 lunch voucher",                   pointCost: 200, quantity: 20,  isActive: true, createdById: sarah.id, expiresAt: daysFromNow(60) },
      { organizationId: orgId, code: "DAY OFF",   label: "Extra Day Off",      description: "One extra paid day off",              pointCost: 500, quantity: 5,   isActive: true, createdById: sarah.id, expiresAt: daysFromNow(180) },
      { organizationId: orgId, code: "AMAZON100", label: "Amazon Gift Card",   description: "$100 Amazon gift card",               pointCost: 400, quantity: 10,  isActive: true, createdById: sarah.id, expiresAt: daysFromNow(90) },
      { organizationId: orgId, code: "EARLYOUT",  label: "Early Friday",       description: "Leave 2 hours early on any Friday",   pointCost: 80,  quantity: 50,  isActive: true, createdById: marcus.id, expiresAt: daysFromNow(30) },
      { organizationId: orgId, code: "COURSE",    label: "Udemy Course",       description: "Any Udemy course of your choice",     pointCost: 300, quantity: 15,  isActive: true, createdById: sarah.id },
    ],
  });
  console.log("✅ Coupons created");

  // ── USER POINTS & BADGES ──────────────────────────────────────────────────
  const pointsData = [
    { user: sarah,  balance: 420,  lifetime: 1840 },
    { user: marcus, balance: 880,  lifetime: 2250 },
    { user: priya,  balance: 310,  lifetime: 720  },
    { user: james,  balance: 560,  lifetime: 1100 },
    { user: elena,  balance: 150,  lifetime: 390  },
    { user: noah,   balance: 730,  lifetime: 1550 },
    { user: zara,   balance: 95,   lifetime: 210  },
    { user: dev,    balance: 200,  lifetime: 500  },
  ];
  const userPointsMap: Record<string, string> = {};
  for (const { user, balance, lifetime } of pointsData) {
    const up = await prisma.userPoints.upsert({
      where: { userId: user.id }, update: { balance, lifetime },
      create: { userId: user.id, balance, lifetime },
    });
    userPointsMap[user.id] = up.id;

    // Point transactions
    await prisma.pointTransaction.createMany({
      skipDuplicates: true,
      data: [
        { userId: user.id, userPointsId: up.id, action: "task_complete", points: 10, createdAt: daysAgo(14), metadata: '{"task":"Sprint planning task"}' },
        { userId: user.id, userPointsId: up.id, action: "attendance",    points: 2,  createdAt: daysAgo(13) },
        { userId: user.id, userPointsId: up.id, action: "task_complete", points: 10, createdAt: daysAgo(10) },
        { userId: user.id, userPointsId: up.id, action: "task_early",    points: 5,  createdAt: daysAgo(7)  },
        { userId: user.id, userPointsId: up.id, action: "attendance",    points: 2,  createdAt: daysAgo(6)  },
        { userId: user.id, userPointsId: up.id, action: "task_complete", points: 10, createdAt: daysAgo(3)  },
      ],
    });
  }

  // Assign badges to top performers
  const badgeAssignments = [
    { userId: marcus.id, badges: ["FIRST_TASK", "TASK_MACHINE", "POINT_HUNTER", "LEGEND", "EARLY_BIRD", "STREAK_MONTH"] },
    { userId: sarah.id,  badges: ["FIRST_TASK", "TASK_MACHINE", "POINT_HUNTER", "STREAK_WEEK"] },
    { userId: james.id,  badges: ["FIRST_TASK", "POINT_HUNTER", "SPEED_DEMON", "STREAK_WEEK", "COLLABORATOR"] },
    { userId: noah.id,   badges: ["FIRST_TASK", "POINT_HUNTER", "EARLY_BIRD", "STREAK_WEEK"] },
    { userId: priya.id,  badges: ["FIRST_TASK", "COLLABORATOR"] },
    { userId: elena.id,  badges: ["FIRST_TASK"] },
    { userId: zara.id,   badges: ["FIRST_TASK"] },
    { userId: dev.id,    badges: ["FIRST_TASK", "SPEED_DEMON"] },
  ];
  for (const { userId, badges } of badgeAssignments) {
    for (const badgeName of badges) {
      const badgeId = createdBadges[badgeName];
      if (!badgeId) continue;
      await prisma.userBadge.upsert({
        where: { userId_badgeId: { userId, badgeId } }, update: {},
        create: { userId, badgeId, earnedAt: daysAgo(Math.floor(Math.random() * 30)) },
      });
    }
  }
  console.log("✅ Points & badges assigned");

  // ── PROJECTS ──────────────────────────────────────────────────────────────
  const [appProj, brandProj, portalProj, mobileProj, internalProj] = await Promise.all([
    prisma.project.upsert({
      where: { id: "proj-saas-app" }, update: {},
      create: {
        id: "proj-saas-app", organizationId: orgId, ownerId: marcus.id,
        name: "SaaS Platform v2.0",
        description: "Complete rebuild of our flagship SaaS platform with real-time collaboration, AI assistance, and modern UI",
        status: "ACTIVE", color: "#7C3AED", clientName: "Internal Product",
        budget: 120000, budgetSpent: 67000, healthScore: 84,
        deadline: daysFromNow(45),
        healthData: JSON.stringify({ score: 84, grade: "B+", summary: "Strong velocity. Auth refactor blocking 2 tasks.", breakdown: { onTimeRate: 88, budgetStatus: "on_track", teamVelocity: 82, blockerCount: 2, completionRate: 58 }, risks: ["Auth service dependency"], recommendations: ["Unblock auth tasks first"] }),
      },
    }),
    prisma.project.upsert({
      where: { id: "proj-brand" }, update: {},
      create: {
        id: "proj-brand", organizationId: orgId, ownerId: sarah.id,
        name: "Brand Identity Refresh",
        description: "Full rebrand including logo, color system, typography, component library, and brand guidelines for 2024",
        status: "ACTIVE", color: "#F59E0B", clientName: "Apex Solutions Ltd",
        budget: 45000, budgetSpent: 28000, healthScore: 92,
        deadline: daysFromNow(20),
        healthData: JSON.stringify({ score: 92, grade: "A", summary: "Ahead of schedule. Client very happy.", breakdown: { onTimeRate: 95, budgetStatus: "on_track", teamVelocity: 90, blockerCount: 0, completionRate: 75 }, risks: [], recommendations: ["Keep current pace"] }),
      },
    }),
    prisma.project.upsert({
      where: { id: "proj-portal" }, update: {},
      create: {
        id: "proj-portal", organizationId: orgId, ownerId: marcus.id,
        name: "Client Dashboard Portal",
        description: "Self-service client portal with real-time project tracking, invoicing, and communication hub",
        status: "PLANNING", color: "#06B6D4", clientName: "Multiple Clients",
        budget: 60000, budgetSpent: 5000, healthScore: 71,
        deadline: daysFromNow(90),
        healthData: JSON.stringify({ score: 71, grade: "B-", summary: "Requirements still being finalized.", breakdown: { onTimeRate: 70, budgetStatus: "under_budget", teamVelocity: 65, blockerCount: 3, completionRate: 12 }, risks: ["Scope creep", "Design approval pending"], recommendations: ["Lock scope ASAP"] }),
      },
    }),
    prisma.project.upsert({
      where: { id: "proj-mobile" }, update: {},
      create: {
        id: "proj-mobile", organizationId: orgId, ownerId: priya.id,
        name: "Mobile App iOS/Android",
        description: "Cross-platform mobile app with offline support, push notifications, and deep integrations",
        status: "ACTIVE", color: "#EC4899", clientName: "RetailPro Inc",
        budget: 95000, budgetSpent: 52000, healthScore: 76,
        deadline: daysFromNow(60),
        healthData: JSON.stringify({ score: 76, grade: "B", summary: "Minor delays in iOS review. Android on track.", breakdown: { onTimeRate: 78, budgetStatus: "on_track", teamVelocity: 74, blockerCount: 1, completionRate: 48 }, risks: ["App Store review delays"], recommendations: ["Submit iOS early"] }),
      },
    }),
    prisma.project.upsert({
      where: { id: "proj-internal" }, update: {},
      create: {
        id: "proj-internal", organizationId: orgId, ownerId: dev.id,
        name: "Internal Tooling & DevOps",
        description: "CI/CD pipeline improvements, monitoring dashboards, and internal developer tooling",
        status: "ACTIVE", color: "#10B981", clientName: "Internal",
        budget: 30000, budgetSpent: 18000, healthScore: 88,
        deadline: daysFromNow(30),
        healthData: JSON.stringify({ score: 88, grade: "A-", summary: "Great progress. Monitoring stack almost done.", breakdown: { onTimeRate: 90, budgetStatus: "on_track", teamVelocity: 86, blockerCount: 0, completionRate: 65 }, risks: [], recommendations: ["Continue current velocity"] }),
      },
    }),
  ]);
  console.log("✅ Projects created");

  // ── PROJECT MEMBERS ────────────────────────────────────────────────────────
  const projectMemberData = [
    { projectId: appProj.id,      userId: marcus.id, role: "LEAD"    },
    { projectId: appProj.id,      userId: james.id,  role: "MEMBER"  },
    { projectId: appProj.id,      userId: noah.id,   role: "MEMBER"  },
    { projectId: appProj.id,      userId: elena.id,  role: "MEMBER"  },
    { projectId: brandProj.id,    userId: sarah.id,  role: "LEAD"    },
    { projectId: brandProj.id,    userId: priya.id,  role: "MEMBER"  },
    { projectId: brandProj.id,    userId: zara.id,   role: "MEMBER"  },
    { projectId: portalProj.id,   userId: marcus.id, role: "LEAD"    },
    { projectId: portalProj.id,   userId: james.id,  role: "MEMBER"  },
    { projectId: portalProj.id,   userId: zara.id,   role: "MEMBER"  },
    { projectId: mobileProj.id,   userId: priya.id,  role: "LEAD"    },
    { projectId: mobileProj.id,   userId: noah.id,   role: "MEMBER"  },
    { projectId: mobileProj.id,   userId: elena.id,  role: "MEMBER"  },
    { projectId: internalProj.id, userId: dev.id,    role: "LEAD"    },
    { projectId: internalProj.id, userId: james.id,  role: "MEMBER"  },
    { projectId: internalProj.id, userId: noah.id,   role: "MEMBER"  },
  ];
  await prisma.projectMember.createMany({ skipDuplicates: true, data: projectMemberData });

  // ── SPRINTS ────────────────────────────────────────────────────────────────
  const sprint1 = await prisma.sprint.upsert({
    where: { id: "sprint-saas-1" }, update: {},
    create: { id: "sprint-saas-1", projectId: appProj.id, name: "Sprint 7 — Auth & Billing", goal: "Complete auth refactor and integrate Stripe billing", startDate: daysAgo(14), endDate: daysAgo(1), status: "COMPLETED", velocity: 34 },
  });
  const sprint2 = await prisma.sprint.upsert({
    where: { id: "sprint-saas-2" }, update: {},
    create: { id: "sprint-saas-2", projectId: appProj.id, name: "Sprint 8 — Dashboard & AI", goal: "Ship new analytics dashboard and AI suggestions feature", startDate: now, endDate: daysFromNow(13), status: "ACTIVE", velocity: 28 },
  });
  const sprint3 = await prisma.sprint.upsert({
    where: { id: "sprint-mobile-1" }, update: {},
    create: { id: "sprint-mobile-1", projectId: mobileProj.id, name: "Sprint 4 — Offline Mode", goal: "Implement full offline sync and conflict resolution", startDate: daysAgo(7), endDate: daysFromNow(7), status: "ACTIVE", velocity: 22 },
  });
  console.log("✅ Sprints created");

  // ── TASKS ──────────────────────────────────────────────────────────────────
  const taskDefs = [
    // SaaS App — Sprint 8 current tasks
    { id: "t-auth-refactor",   proj: appProj.id,      creator: marcus.id, assignee: james.id,  title: "Refactor authentication service to use JWT RS256",       status: "IN_PROGRESS", priority: "URGENT", pos: 0,  est: 16, sp: 8,  tags: '["auth","security","backend"]',  due: daysFromNow(3),  start: daysAgo(2) },
    { id: "t-stripe-webhooks", proj: appProj.id,      creator: marcus.id, assignee: james.id,  title: "Implement Stripe webhook handler for subscription events", status: "REVIEW",      priority: "HIGH",   pos: 1,  est: 8,  sp: 5,  tags: '["payments","backend"]',         due: daysFromNow(2),  start: daysAgo(3) },
    { id: "t-dashboard-v2",    proj: appProj.id,      creator: marcus.id, assignee: noah.id,   title: "Redesign analytics dashboard with real-time charts",      status: "IN_PROGRESS", priority: "HIGH",   pos: 0,  est: 20, sp: 13, tags: '["frontend","analytics","ui"]',  due: daysFromNow(8),  start: daysAgo(1) },
    { id: "t-ai-suggestions",  proj: appProj.id,      creator: sarah.id,  assignee: noah.id,   title: "Build AI task suggestion engine using OpenAI embeddings",  status: "TODO",        priority: "HIGH",   pos: 1,  est: 24, sp: 13, tags: '["ai","backend"]',               due: daysFromNow(12) },
    { id: "t-onboard-flow",    proj: appProj.id,      creator: marcus.id, assignee: elena.id,  title: "Create multi-step user onboarding flow with progress bar", status: "IN_PROGRESS", priority: "MEDIUM", pos: 0,  est: 12, sp: 8,  tags: '["ux","frontend"]',              due: daysFromNow(5) },
    { id: "t-email-templates", proj: appProj.id,      creator: marcus.id, assignee: elena.id,  title: "Design transactional email templates (welcome, reset, invoice)", status: "DONE",   priority: "MEDIUM", pos: 0,  est: 6,  sp: 3,  tags: '["email","design"]',             due: daysAgo(2) },
    { id: "t-api-rate-limit",  proj: appProj.id,      creator: dev.id,    assignee: james.id,  title: "Add rate limiting middleware with Redis sliding window",   status: "DONE",        priority: "HIGH",   pos: 1,  est: 8,  sp: 5,  tags: '["backend","security","redis"]',  due: daysAgo(3) },
    { id: "t-search-global",   proj: appProj.id,      creator: marcus.id, assignee: null,      title: "Global search with fuzzy matching and keyboard shortcuts",  status: "BACKLOG",     priority: "MEDIUM", pos: 0,  est: 16, sp: 8,  tags: '["search","ux","frontend"]',     due: daysFromNow(20) },
    { id: "t-dark-mode",       proj: appProj.id,      creator: marcus.id, assignee: noah.id,   title: "Implement dark mode with system preference detection",      status: "TODO",        priority: "LOW",    pos: 2,  est: 8,  sp: 3,  tags: '["ui","theming"]',               due: daysFromNow(15) },
    { id: "t-perf-audit",      proj: appProj.id,      creator: dev.id,    assignee: dev.id,    title: "Performance audit — reduce bundle size and improve LCP",   status: "TODO",        priority: "MEDIUM", pos: 3,  est: 10, sp: 5,  tags: '["performance","frontend"]',     due: daysFromNow(10) },

    // Brand Project
    { id: "t-logo-v3",         proj: brandProj.id,    creator: sarah.id,  assignee: priya.id,  title: "Finalise logo redesign — present 3 concepts to client",   status: "REVIEW",      priority: "URGENT", pos: 0,  est: 20, sp: 8,  tags: '["design","brand","client"]',    due: daysFromNow(1) },
    { id: "t-color-system",    proj: brandProj.id,    creator: sarah.id,  assignee: priya.id,  title: "Build semantic color system (primary, accent, semantic)",  status: "DONE",        priority: "HIGH",   pos: 0,  est: 8,  sp: 5,  tags: '["design","tokens"]',            due: daysAgo(5) },
    { id: "t-type-scale",      proj: brandProj.id,    creator: sarah.id,  assignee: zara.id,   title: "Define typography scale and font pairing guide",           status: "DONE",        priority: "HIGH",   pos: 1,  est: 6,  sp: 3,  tags: '["design","typography"]',        due: daysAgo(3) },
    { id: "t-component-lib",   proj: brandProj.id,    creator: priya.id,  assignee: priya.id,  title: "Build Figma component library with all brand elements",    status: "IN_PROGRESS", priority: "HIGH",   pos: 0,  est: 30, sp: 13, tags: '["design","figma","system"]',    due: daysFromNow(7) },
    { id: "t-brand-guide",     proj: brandProj.id,    creator: sarah.id,  assignee: zara.id,   title: "Create comprehensive 50-page brand guidelines document",   status: "IN_PROGRESS", priority: "MEDIUM", pos: 0,  est: 16, sp: 8,  tags: '["design","docs"]',              due: daysFromNow(10) },
    { id: "t-social-kit",      proj: brandProj.id,    creator: priya.id,  assignee: zara.id,   title: "Design social media kit: banners, avatars, post templates", status: "TODO",       priority: "MEDIUM", pos: 1,  est: 12, sp: 5,  tags: '["design","social","marketing"]', due: daysFromNow(14) },

    // Client Portal
    { id: "t-portal-auth",     proj: portalProj.id,   creator: marcus.id, assignee: james.id,  title: "Client portal authentication with magic-link login",       status: "TODO",        priority: "HIGH",   pos: 0,  est: 10, sp: 5,  tags: '["auth","portal"]',              due: daysFromNow(30) },
    { id: "t-portal-dashboard",proj: portalProj.id,   creator: marcus.id, assignee: noah.id,   title: "Client-facing project progress dashboard",                status: "TODO",        priority: "HIGH",   pos: 1,  est: 20, sp: 13, tags: '["frontend","portal","charts"]', due: daysFromNow(40) },
    { id: "t-portal-invoices", proj: portalProj.id,   creator: marcus.id, assignee: null,      title: "Invoice history & payment status view",                    status: "BACKLOG",     priority: "MEDIUM", pos: 0,  est: 14, sp: 8,  tags: '["payments","portal"]',          due: daysFromNow(55) },
    { id: "t-portal-chat",     proj: portalProj.id,   creator: sarah.id,  assignee: null,      title: "Embedded real-time chat between client and team",          status: "BACKLOG",     priority: "LOW",    pos: 1,  est: 18, sp: 8,  tags: '["chat","realtime"]',            due: daysFromNow(70) },

    // Mobile App
    { id: "t-offline-sync",    proj: mobileProj.id,   creator: priya.id,  assignee: noah.id,   title: "Offline data sync with conflict resolution strategy",      status: "IN_PROGRESS", priority: "URGENT", pos: 0,  est: 32, sp: 21, tags: '["mobile","offline","sync"]',    due: daysFromNow(5), start: daysAgo(5) },
    { id: "t-push-notif",      proj: mobileProj.id,   creator: priya.id,  assignee: elena.id,  title: "Push notifications for task assignments and due dates",    status: "IN_PROGRESS", priority: "HIGH",   pos: 0,  est: 12, sp: 8,  tags: '["mobile","notifications"]',     due: daysFromNow(7) },
    { id: "t-ios-review",      proj: mobileProj.id,   creator: priya.id,  assignee: priya.id,  title: "Prepare iOS App Store submission and review checklist",    status: "TODO",        priority: "HIGH",   pos: 1,  est: 8,  sp: 5,  tags: '["ios","release"]',              due: daysFromNow(14) },
    { id: "t-biometric-auth",  proj: mobileProj.id,   creator: priya.id,  assignee: noah.id,   title: "Face ID / fingerprint biometric login",                   status: "DONE",        priority: "HIGH",   pos: 0,  est: 10, sp: 5,  tags: '["mobile","auth","security"]',   due: daysAgo(2) },
    { id: "t-deep-links",      proj: mobileProj.id,   creator: priya.id,  assignee: elena.id,  title: "Universal deep links for task and project navigation",     status: "REVIEW",      priority: "MEDIUM", pos: 0,  est: 8,  sp: 5,  tags: '["mobile","navigation"]',        due: daysFromNow(3) },
    { id: "t-crash-report",    proj: mobileProj.id,   creator: dev.id,    assignee: dev.id,    title: "Integrate Sentry for crash reporting and performance monitoring", status: "DONE", priority: "MEDIUM", pos: 1,  est: 4,  sp: 3,  tags: '["devops","monitoring"]',        due: daysAgo(4) },

    // Internal
    { id: "t-ci-pipeline",     proj: internalProj.id, creator: dev.id,    assignee: dev.id,    title: "Set up GitHub Actions CI/CD with parallel test runs",      status: "DONE",        priority: "HIGH",   pos: 0,  est: 10, sp: 5,  tags: '["devops","ci"]',                due: daysAgo(5) },
    { id: "t-monitoring",      proj: internalProj.id, creator: dev.id,    assignee: james.id,  title: "Deploy Grafana + Prometheus monitoring stack on k8s",       status: "IN_PROGRESS", priority: "HIGH",   pos: 0,  est: 14, sp: 8,  tags: '["devops","monitoring","k8s"]',  due: daysFromNow(4) },
    { id: "t-staging-env",     proj: internalProj.id, creator: dev.id,    assignee: james.id,  title: "Create parity staging environment with production data anonymisation", status: "DONE", priority: "HIGH", pos: 1, est: 8, sp: 5, tags: '["devops","env"]', due: daysAgo(2) },
    { id: "t-db-backup",       proj: internalProj.id, creator: dev.id,    assignee: dev.id,    title: "Automated daily DB backups with 30-day retention to S3",   status: "DONE",        priority: "URGENT", pos: 0,  est: 6,  sp: 3,  tags: '["devops","database","security"]', due: daysAgo(7) },
    { id: "t-docs-site",       proj: internalProj.id, creator: dev.id,    assignee: noah.id,   title: "Internal developer docs site with API reference and guides", status: "TODO",       priority: "MEDIUM", pos: 2,  est: 20, sp: 8,  tags: '["docs","dx"]',                  due: daysFromNow(25) },
  ];

  const createdTasks: Record<string, { id: string }> = {};
  for (const t of taskDefs) {
    const task = await prisma.task.upsert({
      where: { id: t.id }, update: {},
      create: {
        id: t.id, projectId: t.proj, creatorId: t.creator, assigneeId: t.assignee ?? null,
        title: t.title, status: t.status, priority: t.priority, position: t.pos,
        estimatedHours: t.est, storyPoints: t.sp, tags: t.tags,
        dueDate: t.due, startDate: t.start ?? null,
        timeSpentMin: t.status === "DONE" ? (t.est ?? 8) * 55 : t.status === "IN_PROGRESS" ? Math.floor((t.est ?? 8) * 25) : 0,
      },
    });
    createdTasks[t.id] = task;
  }
  console.log("✅ Tasks created");

  // Sprint task assignments
  const sprintTaskLinks = [
    { sprintId: sprint2.id, taskId: "t-auth-refactor" },
    { sprintId: sprint2.id, taskId: "t-stripe-webhooks" },
    { sprintId: sprint2.id, taskId: "t-dashboard-v2" },
    { sprintId: sprint2.id, taskId: "t-ai-suggestions" },
    { sprintId: sprint2.id, taskId: "t-onboard-flow" },
    { sprintId: sprint1.id, taskId: "t-email-templates" },
    { sprintId: sprint1.id, taskId: "t-api-rate-limit" },
    { sprintId: sprint3.id, taskId: "t-offline-sync" },
    { sprintId: sprint3.id, taskId: "t-push-notif" },
    { sprintId: sprint3.id, taskId: "t-deep-links" },
  ];
  await prisma.sprintTask.createMany({ skipDuplicates: true, data: sprintTaskLinks });

  // Task dependencies
  await prisma.taskDependency.createMany({
    skipDuplicates: true,
    data: [
      { taskId: "t-stripe-webhooks", dependsOnId: "t-auth-refactor", type: "BLOCKS" },
      { taskId: "t-dashboard-v2",    dependsOnId: "t-ai-suggestions", type: "BLOCKS" },
      { taskId: "t-portal-dashboard",dependsOnId: "t-portal-auth",    type: "BLOCKS" },
      { taskId: "t-ios-review",      dependsOnId: "t-offline-sync",   type: "BLOCKS" },
    ],
  });

  // Time logs
  await prisma.timeLog.createMany({
    skipDuplicates: true,
    data: [
      { taskId: "t-auth-refactor",   userId: james.id,  startedAt: daysAgo(2),        endedAt: hoursAgo(48-6),  duration: 360 },
      { taskId: "t-auth-refactor",   userId: james.id,  startedAt: daysAgo(1),        endedAt: hoursAgo(24-8),  duration: 480 },
      { taskId: "t-stripe-webhooks", userId: james.id,  startedAt: daysAgo(3),        endedAt: hoursAgo(72-5),  duration: 300 },
      { taskId: "t-dashboard-v2",    userId: noah.id,   startedAt: daysAgo(1),        endedAt: hoursAgo(24-6),  duration: 360 },
      { taskId: "t-offline-sync",    userId: noah.id,   startedAt: daysAgo(5),        endedAt: hoursAgo(120-8), duration: 480 },
      { taskId: "t-offline-sync",    userId: noah.id,   startedAt: daysAgo(4),        endedAt: hoursAgo(96-7),  duration: 420 },
      { taskId: "t-offline-sync",    userId: noah.id,   startedAt: daysAgo(3),        endedAt: hoursAgo(72-8),  duration: 480 },
      { taskId: "t-ci-pipeline",     userId: dev.id,    startedAt: daysAgo(6),        endedAt: hoursAgo(144-6), duration: 360 },
      { taskId: "t-db-backup",       userId: dev.id,    startedAt: daysAgo(8),        endedAt: hoursAgo(192-4), duration: 240 },
      { taskId: "t-monitoring",      userId: james.id,  startedAt: daysAgo(1),        endedAt: hoursAgo(24-5),  duration: 300 },
    ],
  });

  // Task activities
  const activitiesData = [
    { taskId: "t-auth-refactor",   userId: marcus.id, action: "created",        meta: '{}',                                        createdAt: daysAgo(5) },
    { taskId: "t-auth-refactor",   userId: james.id,  action: "status_changed", meta: '{"from":"TODO","to":"IN_PROGRESS"}',        createdAt: daysAgo(2) },
    { taskId: "t-auth-refactor",   userId: james.id,  action: "commented",      meta: '{"value":"Started on RS256 migration"}',    createdAt: daysAgo(1) },
    { taskId: "t-stripe-webhooks", userId: marcus.id, action: "created",        meta: '{}',                                        createdAt: daysAgo(4) },
    { taskId: "t-stripe-webhooks", userId: james.id,  action: "status_changed", meta: '{"from":"IN_PROGRESS","to":"REVIEW"}',      createdAt: daysAgo(1) },
    { taskId: "t-dashboard-v2",    userId: marcus.id, action: "created",        meta: '{}',                                        createdAt: daysAgo(3) },
    { taskId: "t-dashboard-v2",    userId: noah.id,   action: "status_changed", meta: '{"from":"TODO","to":"IN_PROGRESS"}',        createdAt: daysAgo(1) },
    { taskId: "t-email-templates", userId: marcus.id, action: "created",        meta: '{}',                                        createdAt: daysAgo(10) },
    { taskId: "t-email-templates", userId: elena.id,  action: "status_changed", meta: '{"from":"IN_PROGRESS","to":"DONE"}',        createdAt: daysAgo(2) },
    { taskId: "t-api-rate-limit",  userId: dev.id,    action: "created",        meta: '{}',                                        createdAt: daysAgo(8) },
    { taskId: "t-api-rate-limit",  userId: james.id,  action: "status_changed", meta: '{"from":"REVIEW","to":"DONE"}',             createdAt: daysAgo(3) },
    { taskId: "t-logo-v3",         userId: sarah.id,  action: "created",        meta: '{}',                                        createdAt: daysAgo(6) },
    { taskId: "t-logo-v3",         userId: priya.id,  action: "status_changed", meta: '{"from":"IN_PROGRESS","to":"REVIEW"}',      createdAt: daysAgo(1) },
    { taskId: "t-offline-sync",    userId: priya.id,  action: "created",        meta: '{}',                                        createdAt: daysAgo(7) },
    { taskId: "t-offline-sync",    userId: noah.id,   action: "priority_changed",meta: '{"from":"HIGH","to":"URGENT"}',            createdAt: daysAgo(3) },
    { taskId: "t-offline-sync",    userId: noah.id,   action: "commented",      meta: '{"value":"Conflict resolution is tricky"}', createdAt: daysAgo(1) },
  ];
  await prisma.taskActivity.createMany({ skipDuplicates: false, data: activitiesData });

  // ── COMMENTS ──────────────────────────────────────────────────────────────
  const commentsData = [
    { taskId: "t-auth-refactor",   authorId: james.id,  content: "Started the RS256 migration. The key rotation logic is more complex than expected — JWT validation library needs updating too.", createdAt: daysAgo(2) },
    { taskId: "t-auth-refactor",   authorId: marcus.id, content: "Thanks James. Keep me posted — this is blocking the Stripe webhooks task. Can we get a PR up by EOD tomorrow?", createdAt: daysAgo(2) },
    { taskId: "t-auth-refactor",   authorId: james.id,  content: "PR is up! #247. Passes all existing tests. Need a review before merge. @Noah could you look at the session management piece?", createdAt: daysAgo(1) },
    { taskId: "t-auth-refactor",   authorId: noah.id,   content: "Reviewed — LGTM except for one thing: we should also invalidate existing sessions on secret rotation. Left a comment on the PR.", createdAt: hoursAgo(8) },
    { taskId: "t-stripe-webhooks", authorId: james.id,  content: "Webhook handler is working for subscription.created and invoice.paid. Still need to handle payment_failed and subscription.deleted.", createdAt: daysAgo(1) },
    { taskId: "t-stripe-webhooks", authorId: sarah.id,  content: "Remember to store the webhook idempotency key to avoid duplicate processing on retries!", createdAt: hoursAgo(20) },
    { taskId: "t-dashboard-v2",    authorId: noah.id,   content: "Using Recharts for the main graphs. The real-time updates via SSE are working well in dev. Might need to debounce updates in production.", createdAt: daysAgo(1) },
    { taskId: "t-dashboard-v2",    authorId: marcus.id, content: "Looks great so far! Can we add a 30-day trend sparkline next to each metric card?", createdAt: hoursAgo(16) },
    { taskId: "t-logo-v3",         authorId: priya.id,  content: "All three concepts are ready in Figma. Concept B got the most positive internal reactions. Presenting to client tomorrow at 2pm.", createdAt: daysAgo(1) },
    { taskId: "t-logo-v3",         authorId: sarah.id,  content: "Excellent work Priya! I like Concept B too — the letterform is clean and versatile across different sizes. Good luck with the presentation!", createdAt: hoursAgo(18) },
    { taskId: "t-logo-v3",         authorId: zara.id,   content: "I've prepared the animated version of Concept B for the pitch deck as well.", createdAt: hoursAgo(10) },
    { taskId: "t-offline-sync",    authorId: noah.id,   content: "The conflict resolution is the hardest part here. Going with a last-write-wins strategy for now, with a conflict log users can review manually.", createdAt: daysAgo(3) },
    { taskId: "t-offline-sync",    authorId: priya.id,  content: "Last-write-wins should be fine for the MVP. We can add a proper merge UI in v2. How's the performance with 10k+ records?", createdAt: daysAgo(2) },
    { taskId: "t-offline-sync",    authorId: noah.id,   content: "Tested with 50k records — initial sync takes ~3 seconds on 4G. Subsequent diffs are fast (~200ms). I'll add a progress indicator.", createdAt: daysAgo(1) },
    { taskId: "t-color-system",    authorId: priya.id,  content: "Semantic color system is done! Published as CSS variables and Figma tokens. Check the brand Figma file — token library updated.", createdAt: daysAgo(5) },
    { taskId: "t-color-system",    authorId: sarah.id,  content: "This is exactly what we needed. The semantic naming (--color-surface-raised, --color-interactive, etc.) makes so much more sense than numeric scales.", createdAt: daysAgo(5) },
    { taskId: "t-ci-pipeline",     authorId: dev.id,    content: "CI pipeline is live! Build time went from 8 minutes to 2.5 minutes with parallel test sharding. Green on main.", createdAt: daysAgo(5) },
    { taskId: "t-ci-pipeline",     authorId: marcus.id, content: "Incredible improvement! That's going to save us so much time every day.", createdAt: daysAgo(5) },
  ];
  for (const c of commentsData) {
    await prisma.comment.create({ data: c });
  }
  console.log("✅ Comments created");

  // ── DOCUMENTS ──────────────────────────────────────────────────────────────
  const docsData = [
    {
      id: "doc-prd-saas", title: "Product Requirements Document — SaaS Platform v2.0",
      projectId: appProj.id, authorId: sarah.id, isPersonal: false,
      content: `# Product Requirements Document\n\n## Overview\nThe SaaS Platform v2.0 is a complete rebuild of our core product, focused on real-time collaboration, AI-assisted workflows, and enterprise-grade security.\n\n## Goals\n- 3x faster task management through AI suggestions\n- Real-time collaboration across all features\n- Enterprise SSO and audit logging\n- 99.9% uptime SLA\n\n## Key Features\n\n### Authentication & Security\n- RS256 JWT authentication\n- SSO via SAML 2.0 / OIDC\n- 2FA (TOTP + backup codes)\n- Session management with device tracking\n\n### AI Features\n- Task auto-prioritisation based on deadlines and dependencies\n- Smart standup generation from task activity\n- Deadline prediction using historical velocity\n- Natural language task creation\n\n### Collaboration\n- Real-time presence indicators\n- Inline task comments with @mentions\n- Live document co-editing\n- SSE-powered activity feeds\n\n## Success Metrics\n- DAU/MAU ratio > 60%\n- Task completion rate > 80%\n- NPS > 45\n- P95 API latency < 200ms\n\n## Timeline\n- Sprint 8: Dashboard & AI (current)\n- Sprint 9: Collaboration features\n- Sprint 10: Enterprise SSO\n- Launch: Q2 2024`,
      createdAt: daysAgo(30), updatedAt: daysAgo(2),
    },
    {
      id: "doc-tech-arch", title: "Technical Architecture — System Design",
      projectId: appProj.id, authorId: dev.id, isPersonal: false,
      content: `# Technical Architecture\n\n## Stack\n- **Frontend**: Next.js 14 App Router, TypeScript, Tailwind CSS\n- **Backend**: Next.js API Routes, Prisma ORM, PostgreSQL (Neon)\n- **Auth**: Auth.js v5 (JWT RS256)\n- **AI**: OpenAI GPT-4o, text-embedding-3-small\n- **Real-time**: Server-Sent Events (SSE)\n- **Infra**: Vercel, Neon (Postgres), Upstash (Redis)\n\n## Data Architecture\n\n### Multi-tenancy\nRow-level isolation via \`organizationId\` on all tenant-scoped models. The \`OrganizationMember\` join table controls access. All queries include an org scope guard via \`requireOrg()\` helper.\n\n### Key Models\n- Organization → Members → Users\n- Projects → Tasks → Comments/Activities/TimeLogs\n- Channels → Messages (real-time via SSE)\n- Rewards → Points → Badges → Coupons\n\n## Security\n- Rate limiting: 100 req/min per IP via Redis sliding window\n- Input validation: Zod schemas on all API endpoints\n- SQL injection: Prevented by Prisma parameterized queries\n- XSS: Next.js built-in sanitization + CSP headers\n- CORS: Strict origin allowlist\n\n## Performance\n- Edge-cached static assets (Vercel CDN)\n- Database connection pooling via Neon serverless driver\n- Optimistic UI updates on all mutation paths\n- Image optimization via next/image`,
      createdAt: daysAgo(25), updatedAt: daysAgo(5),
    },
    {
      id: "doc-brand-guide", title: "Nexus Digital — Brand Guidelines v3",
      projectId: brandProj.id, authorId: priya.id, isPersonal: false,
      content: `# Nexus Digital Brand Guidelines\n\n## Brand Identity\n\n### Mission\nWe create digital products that feel inevitable — obvious once seen, impossible to imagine without.\n\n### Voice & Tone\n- **Confident** but not arrogant\n- **Clear** but not simplistic\n- **Warm** but professional\n- **Bold** but considered\n\n## Visual Identity\n\n### Color System\n\n#### Primary\n- Brand Purple: \`#7C3AED\`\n- Brand Purple Dark: \`#5B21B6\`\n\n#### Semantic\n- Success: \`#10B981\`\n- Warning: \`#F59E0B\`\n- Error: \`#EF4444\`\n- Info: \`#3B82F6\`\n\n#### Neutral\n- Surface: \`#0F0F12\` (dark) / \`#FAFAFA\` (light)\n- Border: \`#27272A\` (dark) / \`#E4E4E7\` (light)\n\n### Typography\n\n#### Display: Sora\nUsed for all hero headlines and feature titles.\nWeights: 600, 700\n\n#### Body: Inter\nUsed for all UI text, descriptions, and content.\nWeights: 400, 500, 600\n\n#### Mono: JetBrains Mono\nUsed for code blocks and technical content.\n\n### Logo Usage\n- Minimum size: 24px height\n- Clear space: 1x logo height on all sides\n- Never rotate, stretch, or recolour\n- Preferred: Full wordmark on dark backgrounds\n\n### Spacing System\nBase unit: 4px\n- XS: 4px, SM: 8px, MD: 16px, LG: 24px, XL: 48px, 2XL: 96px`,
      createdAt: daysAgo(15), updatedAt: daysAgo(1),
    },
    {
      id: "doc-sprint-retro", title: "Sprint 7 Retrospective Notes",
      projectId: appProj.id, authorId: marcus.id, isPersonal: false,
      content: `# Sprint 7 Retrospective\n**Date**: ${daysAgo(2).toDateString()}\n**Attendees**: Sarah, Marcus, James, Noah, Elena\n**Velocity**: 34 points (target: 30)\n\n## What Went Well\n- Exceeded velocity target by 13%\n- Auth refactor PR was exceptionally well-reviewed\n- Daily standups were focused and under 15 minutes\n- No critical bugs shipped to production\n\n## What Could Be Better\n- Email template task was underestimated (6h → 11h actual)\n- Stripe integration docs were outdated, caused 2h of confusion\n- PR review turnaround averaged 26h — too slow\n\n## Action Items\n1. [James] Update Stripe integration to latest docs — by Sprint 8 day 3\n2. [Marcus] Implement 24h PR review SLA and rotate reviewer duty\n3. [Team] Better estimation: use historical data for similar tasks\n4. [Noah] Create task estimation guide with reference examples\n\n## Metrics\n| Metric | Sprint 6 | Sprint 7 |\n|--------|---------|----------|\n| Velocity | 28 | 34 |\n| Bugs shipped | 2 | 0 |\n| PR cycle time | 31h | 26h |\n| Test coverage | 64% | 71% |`,
      createdAt: daysAgo(2), updatedAt: daysAgo(2),
    },
    {
      id: "doc-mobile-arch", title: "Mobile App — Offline Architecture Decision",
      projectId: mobileProj.id, authorId: priya.id, isPersonal: false,
      content: `# Offline Architecture — ADR-012\n\n## Status: ACCEPTED\n**Date**: ${daysAgo(8).toDateString()}\n**Decision makers**: Priya, Noah, Dev\n\n## Context\nRetailPro operates in warehouses with unreliable connectivity. The mobile app must function fully offline and sync automatically when connectivity returns.\n\n## Decision\nImplement **SQLite local store** with **last-write-wins conflict resolution** and a **manual conflict review queue** for the MVP. Upgrade to operational transforms in v2 if user-reported conflicts exceed 5%.\n\n## Consequences\n\n### Positive\n- Simple to implement and reason about\n- No server-side conflict resolution logic\n- Fast: all reads are local\n- Works on airplane mode indefinitely\n\n### Negative\n- Users can lose concurrent edits (rare in practice)\n- Conflict review queue adds UX complexity\n- Cannot merge conflicting rich-text edits\n\n## Implementation Notes\n- Use \`expo-sqlite\` for the local store\n- Delta sync: send only changed fields + timestamp\n- Sync on: app foreground, network reconnect, manual pull\n- Retry queue: exponential backoff, max 5 retries\n- Conflict log retained for 7 days`,
      createdAt: daysAgo(8), updatedAt: daysAgo(6),
    },
    {
      id: "doc-api-guide", title: "Internal API Guidelines & Conventions",
      projectId: internalProj.id, authorId: dev.id, isPersonal: false,
      content: `# API Guidelines\n\n## Conventions\n\n### Naming\n- Use \`kebab-case\` for URL paths: \`/api/project-members\`\n- Use \`camelCase\` for JSON keys\n- Prefix internal endpoints with \`/api/internal/\`\n\n### Response Shape\n\`\`\`json\n// Success\n{ "data": {...}, "meta": { "total": 100, "page": 1 } }\n\n// Error\n{ "error": "Human-readable message", "code": "MACHINE_CODE" }\n\`\`\`\n\n### Status Codes\n- 200: Success (GET, PUT)\n- 201: Created (POST)\n- 204: No content (DELETE)\n- 400: Bad request / validation error\n- 401: Unauthenticated\n- 403: Authorized but forbidden\n- 404: Not found\n- 429: Rate limited\n- 500: Server error\n\n### Auth Guard Pattern\n\`\`\`typescript\nexport async function GET() {\n  const ctx = await requireOrg();\n  if (isOrgError(ctx)) return ctx;\n  const { orgId, userId } = ctx;\n  // ... all queries include { organizationId: orgId }\n}\n\`\`\`\n\n## Rate Limits\n- Default: 100 req/min per IP\n- Auth endpoints: 10 req/min per IP\n- AI endpoints: 20 req/min per user\n\n## Pagination\nAll list endpoints support: \`?page=1&limit=20&sortBy=createdAt&order=desc\``,
      createdAt: daysAgo(20), updatedAt: daysAgo(3),
    },
  ];

  for (const doc of docsData) {
    await prisma.document.upsert({
      where: { id: doc.id }, update: { content: doc.content, updatedAt: doc.updatedAt },
      create: doc,
    });
  }
  // Document shares
  await prisma.documentShare.createMany({
    skipDuplicates: true,
    data: [
      { documentId: "doc-prd-saas",    userId: marcus.id, role: "EDITOR" },
      { documentId: "doc-prd-saas",    userId: james.id,  role: "VIEWER" },
      { documentId: "doc-tech-arch",   userId: james.id,  role: "EDITOR" },
      { documentId: "doc-tech-arch",   userId: noah.id,   role: "EDITOR" },
      { documentId: "doc-brand-guide", userId: sarah.id,  role: "EDITOR" },
      { documentId: "doc-brand-guide", userId: zara.id,   role: "EDITOR" },
      { documentId: "doc-sprint-retro",userId: sarah.id,  role: "VIEWER" },
      { documentId: "doc-sprint-retro",userId: james.id,  role: "VIEWER" },
      { documentId: "doc-mobile-arch", userId: noah.id,   role: "EDITOR" },
      { documentId: "doc-api-guide",   userId: james.id,  role: "EDITOR" },
      { documentId: "doc-api-guide",   userId: noah.id,   role: "VIEWER" },
    ],
  });
  console.log("✅ Documents created");

  // ── CHANNELS & MESSAGES ────────────────────────────────────────────────────
  const allUserIds = users.map(u => u.id);

  const general = await prisma.channel.upsert({
    where: { id: "ch-general" }, update: {},
    create: { id: "ch-general", organizationId: orgId, name: "general", description: "Company-wide announcements and discussion", isGeneral: true,
      members: { create: allUserIds.map(userId => ({ userId })) } },
  });
  const engineering = await prisma.channel.upsert({
    where: { id: "ch-eng" }, update: {},
    create: { id: "ch-eng", organizationId: orgId, name: "engineering", description: "Backend, frontend, and DevOps discussion",
      members: { create: [james, noah, dev, marcus].map(u => ({ userId: u.id })) } },
  });
  const design = await prisma.channel.upsert({
    where: { id: "ch-design" }, update: {},
    create: { id: "ch-design", organizationId: orgId, name: "design", description: "UI/UX, brand, and creative work",
      members: { create: [priya, zara, sarah, marcus].map(u => ({ userId: u.id })) } },
  });
  const product = await prisma.channel.upsert({
    where: { id: "ch-product" }, update: {},
    create: { id: "ch-product", organizationId: orgId, name: "product", description: "Product strategy, roadmap, and feedback",
      members: { create: [sarah, marcus, priya, james].map(u => ({ userId: u.id })) } },
  });
  const deployments = await prisma.channel.upsert({
    where: { id: "ch-deploy" }, update: {},
    create: { id: "ch-deploy", organizationId: orgId, name: "deployments", description: "Release alerts and deployment notifications", isPrivate: true,
      members: { create: [dev, marcus, sarah, james, noah].map(u => ({ userId: u.id })) } },
  });

  const messagesData = [
    // General
    { channelId: general.id, authorId: sarah.id,  content: "Good morning team! Just a reminder we have the client presentation for Apex Solutions tomorrow at 2pm. Priya — the brand concepts look stunning!", createdAt: daysAgo(1) },
    { channelId: general.id, authorId: marcus.id, content: "Great news — Sprint 7 velocity was 34 points vs our 30 target. Team crushed it! 🎉 Sprint 8 planning starts at 10am today.", createdAt: daysAgo(1) },
    { channelId: general.id, authorId: priya.id,  content: "Thanks Sarah! Concept B has been the favourite internally. Fingers crossed for tomorrow!", createdAt: daysAgo(1) },
    { channelId: general.id, authorId: noah.id,   content: "Quick heads up — I'll be testing the offline sync today which might cause some lag on the dev database. Will restore everything after.", createdAt: hoursAgo(20) },
    { channelId: general.id, authorId: james.id,  content: "Auth PR is up! Would love a review from someone before end of day. Link in #engineering", createdAt: hoursAgo(16) },
    { channelId: general.id, authorId: elena.id,  content: "Email templates are shipped and live in prod! Can confirm the welcome email design looks great — just tested with a new account.", createdAt: hoursAgo(12) },
    { channelId: general.id, authorId: zara.id,   content: "Finished the animated Nexus Digital logo for the Apex pitch deck. Sharing the Lottie file in #design 🎨", createdAt: hoursAgo(8) },
    { channelId: general.id, authorId: dev.id,    content: "Monitoring dashboard is almost ready — we now have full observability on API latency, error rates, and DB query times. Will demo in the next all-hands.", createdAt: hoursAgo(4) },

    // Engineering
    { channelId: engineering.id, authorId: james.id, content: "PR #247 — Auth RS256 migration. Added key rotation support and session invalidation. Please review! https://github.com/nexus/platform/pull/247", createdAt: daysAgo(1) },
    { channelId: engineering.id, authorId: noah.id,  content: "Reviewed #247. Looks solid. One comment: we should blacklist old JWTs in Redis until they expire naturally. Otherwise rotation has a gap.", createdAt: hoursAgo(20) },
    { channelId: engineering.id, authorId: james.id, content: "Good catch @Noah. Adding a Redis blacklist set with TTL matching the old JWT expiry. Shouldn't take long.", createdAt: hoursAgo(18) },
    { channelId: engineering.id, authorId: dev.id,   content: "For the Grafana dashboard — I'm using the Neon serverless Postgres data source plugin. Getting p50/p95/p99 query latencies in real-time. Happy to share the JSON config.", createdAt: hoursAgo(14) },
    { channelId: engineering.id, authorId: noah.id,  content: "Offline sync test results: 50k records, initial sync 3.1s on 4G, delta sync ~200ms. Pretty happy with those numbers.", createdAt: hoursAgo(10) },
    { channelId: engineering.id, authorId: marcus.id,content: "Fantastic! That's well within the 5s target. Ship it 🚀", createdAt: hoursAgo(9) },

    // Design
    { channelId: design.id, authorId: priya.id, content: "Figma token library is updated with the full semantic color system. Please use tokens instead of hardcoded hex values from now on — they auto-switch for dark mode!", createdAt: daysAgo(5) },
    { channelId: design.id, authorId: sarah.id, content: "The component library is coming along beautifully Priya. The button variants especially — so polished.", createdAt: daysAgo(4) },
    { channelId: design.id, authorId: zara.id,  content: "All social kit templates are done — 9 banner sizes, 3 post templates, and the avatar/logo lockup for all platforms. Ready for brand guidelines doc.", createdAt: daysAgo(2) },
    { channelId: design.id, authorId: priya.id, content: "Three Apex logo concepts are in the shared Figma link. Concept A = geometric, B = wordmark-focused, C = abstract mark. My vote is B.", createdAt: daysAgo(1) },
    { channelId: design.id, authorId: sarah.id, content: "Concept B for sure. The custom letterform in the 'N' is inspired. Client is going to love it.", createdAt: hoursAgo(22) },

    // Product
    { channelId: product.id, authorId: sarah.id,  content: "User research interviews are done! 12 customers interviewed. Top pain points: (1) slow search, (2) no mobile app, (3) limited reporting. All three are on our roadmap!", createdAt: daysAgo(7) },
    { channelId: product.id, authorId: marcus.id, content: "The AI task suggestions feature is going to be a game-changer based on that feedback. Noah, can you add NLP task parsing to the Sprint 8 scope?", createdAt: daysAgo(6) },
    { channelId: product.id, authorId: priya.id,  content: "For the client portal — should we use magic link auth or let clients set passwords? Magic links are friendlier but require reliable email delivery.", createdAt: daysAgo(3) },
    { channelId: product.id, authorId: sarah.id,  content: "Magic links for sure. Our enterprise clients have IT policies that make password requirements painful. Let's go with magic links + optional SSO.", createdAt: daysAgo(3) },

    // Deployments
    { channelId: deployments.id, authorId: dev.id,    content: "✅ DEPLOY prod@v2.8.1 — Auth email templates + rate limiting. No migrations. Rollback: v2.8.0", createdAt: daysAgo(3) },
    { channelId: deployments.id, authorId: dev.id,    content: "✅ DEPLOY prod@v2.8.2 — Minor: Fix chart tooltip overflow on mobile. No DB changes.", createdAt: daysAgo(2) },
    { channelId: deployments.id, authorId: james.id,  content: "⚠️ DEPLOY staging@v2.9.0-rc1 — Auth RS256 migration. DB migration included. Requires NEXTAUTH_SECRET rotation after deploy.", createdAt: hoursAgo(6) },
    { channelId: deployments.id, authorId: dev.id,    content: "Monitoring: staging is healthy post-deploy. P95 API latency 180ms (was 210ms). New auth flow adds ~12ms overhead — acceptable.", createdAt: hoursAgo(5) },
  ];
  const existingMsgCount = await prisma.message.count({ where: { channelId: { in: [general.id, engineering.id, design.id, product.id, deployments.id] } } });
  if (existingMsgCount < 5) {
    await prisma.message.createMany({ data: messagesData });
  }
  console.log("✅ Channels & messages created");

  // ── MEETINGS ──────────────────────────────────────────────────────────────
  const meetingsData = [
    {
      id: "meet-standup-1", title: "Daily Standup — Engineering", organizationId: orgId, organizerId: marcus.id, projectId: appProj.id,
      description: "Daily 15-min sync for the engineering team", startTime: daysFromNow(1), endTime: new Date(daysFromNow(1).getTime() + 15 * 60000), status: "SCHEDULED",
      attendees: [{ userId: marcus.id, rsvp: "ACCEPTED" }, { userId: james.id, rsvp: "ACCEPTED" }, { userId: noah.id, rsvp: "ACCEPTED" }, { userId: dev.id, rsvp: "ACCEPTED" }],
    },
    {
      id: "meet-apex-present", title: "Apex Solutions — Brand Concept Presentation", organizationId: orgId, organizerId: sarah.id, projectId: brandProj.id,
      description: "Present all three logo concepts and brand direction to Apex stakeholders. Decision expected same day.", startTime: daysFromNow(1), endTime: new Date(daysFromNow(1).getTime() + 90 * 60000), status: "SCHEDULED",
      attendees: [{ userId: sarah.id, rsvp: "ACCEPTED" }, { userId: priya.id, rsvp: "ACCEPTED" }, { userId: zara.id, rsvp: "ACCEPTED" }, { userId: marcus.id, rsvp: "PENDING" }],
    },
    {
      id: "meet-sprint-8-review", title: "Sprint 8 Mid-Sprint Review", organizationId: orgId, organizerId: marcus.id, projectId: appProj.id,
      description: "Review Sprint 8 progress, re-prioritise backlog items, address blockers", startTime: daysFromNow(7), endTime: new Date(daysFromNow(7).getTime() + 60 * 60000), status: "SCHEDULED",
      attendees: [{ userId: marcus.id, rsvp: "ACCEPTED" }, { userId: sarah.id, rsvp: "ACCEPTED" }, { userId: james.id, rsvp: "ACCEPTED" }, { userId: noah.id, rsvp: "ACCEPTED" }, { userId: elena.id, rsvp: "PENDING" }],
    },
    {
      id: "meet-mobile-checkin", title: "Mobile App — iOS Release Planning", organizationId: orgId, organizerId: priya.id, projectId: mobileProj.id,
      description: "Plan the App Store submission timeline and pre-release checklist", startTime: daysFromNow(3), endTime: new Date(daysFromNow(3).getTime() + 45 * 60000), status: "SCHEDULED",
      attendees: [{ userId: priya.id, rsvp: "ACCEPTED" }, { userId: noah.id, rsvp: "ACCEPTED" }, { userId: elena.id, rsvp: "PENDING" }],
    },
    {
      id: "meet-portal-kickoff", title: "Client Portal — Project Kickoff", organizationId: orgId, organizerId: marcus.id, projectId: portalProj.id,
      description: "Kickoff meeting to finalise scope, design direction, and technical approach for the client portal", startTime: daysFromNow(5), endTime: new Date(daysFromNow(5).getTime() + 120 * 60000), status: "SCHEDULED",
      attendees: [{ userId: marcus.id, rsvp: "ACCEPTED" }, { userId: sarah.id, rsvp: "ACCEPTED" }, { userId: james.id, rsvp: "ACCEPTED" }, { userId: zara.id, rsvp: "PENDING" }],
    },
    {
      id: "meet-allhands", title: "All Hands — Q2 Review & Q3 Roadmap", organizationId: orgId, organizerId: sarah.id, projectId: null,
      description: "Company-wide all-hands: Q2 highlights, Q3 product roadmap reveal, team recognitions, and open Q&A", startTime: daysFromNow(14), endTime: new Date(daysFromNow(14).getTime() + 90 * 60000), status: "SCHEDULED",
      attendees: allUserIds.map(userId => ({ userId, rsvp: userId === sarah.id ? "ACCEPTED" : "PENDING" })),
    },
    {
      id: "meet-sprint-7-retro", title: "Sprint 7 Retrospective", organizationId: orgId, organizerId: marcus.id, projectId: appProj.id,
      description: "Sprint 7 retrospective — celebrating wins and identifying improvements",
      startTime: daysAgo(2), endTime: new Date(daysAgo(2).getTime() + 60 * 60000), status: "COMPLETED",
      notes: "Strong sprint — exceeded velocity. Main improvement area: PR review turnaround time. Action items assigned to Marcus and James.",
      actionItems: JSON.stringify(["Update Stripe docs (James, by Sprint 8 day 3)", "Implement 24h PR review SLA (Marcus)", "Create estimation guide (Noah)"]),
      attendees: [{ userId: marcus.id, rsvp: "ACCEPTED" }, { userId: sarah.id, rsvp: "ACCEPTED" }, { userId: james.id, rsvp: "ACCEPTED" }, { userId: noah.id, rsvp: "ACCEPTED" }, { userId: elena.id, rsvp: "ACCEPTED" }],
    },
    {
      id: "meet-design-review", title: "Design System — Weekly Review", organizationId: orgId, organizerId: priya.id, projectId: brandProj.id,
      description: "Weekly design system review: component updates, token changes, and open design questions",
      startTime: daysAgo(3), endTime: new Date(daysAgo(3).getTime() + 45 * 60000), status: "COMPLETED",
      notes: "Color tokens approved. Typography scale locked. Next week: icon library and motion guidelines.",
      attendees: [{ userId: priya.id, rsvp: "ACCEPTED" }, { userId: sarah.id, rsvp: "ACCEPTED" }, { userId: zara.id, rsvp: "ACCEPTED" }],
    },
  ];

  for (const m of meetingsData) {
    const { attendees, ...meetingData } = m;
    await prisma.meeting.upsert({
      where: { id: m.id }, update: {},
      create: { ...meetingData, attendees: { create: attendees } },
    });
  }
  console.log("✅ Meetings created");

  // ── AUTOMATIONS ────────────────────────────────────────────────────────────
  await prisma.automation.createMany({
    skipDuplicates: true,
    data: [
      { organizationId: orgId, createdById: marcus.id, name: "Auto-assign overdue tasks", description: "When a task passes its due date with status TODO or IN_PROGRESS, notify the assignee and manager", trigger: "task.overdue", action: "notify.assignee_and_manager", rule: JSON.stringify({ conditions: [{ field: "status", op: "in", value: ["TODO","IN_PROGRESS"] }, { field: "dueDate", op: "lt", value: "now" }], actions: ["notify_assignee", "notify_manager"] }), isActive: true, runCount: 47, lastRunAt: daysAgo(1) },
      { organizationId: orgId, createdById: dev.id,    name: "Slack alert on URGENT tasks", description: "Post to #deployments channel when a task is set to URGENT priority", trigger: "task.priority_changed", action: "slack.post_channel", rule: JSON.stringify({ conditions: [{ field: "priority", op: "eq", value: "URGENT" }], actions: ["slack_post_deployments"] }), isActive: true, runCount: 12, lastRunAt: daysAgo(2) },
      { organizationId: orgId, createdById: sarah.id,  name: "Award points on task completion", description: "Automatically award points to the task assignee when status changes to DONE", trigger: "task.status_changed", action: "rewards.award_points", rule: JSON.stringify({ conditions: [{ field: "status", op: "eq", value: "DONE" }], actions: ["award_points_assignee"] }), isActive: true, runCount: 156, lastRunAt: hoursAgo(3) },
      { organizationId: orgId, createdById: marcus.id, name: "Sprint reminder — 2 days before end", description: "Notify team 2 days before sprint ends if velocity is below target", trigger: "sprint.days_remaining", action: "notify.team", rule: JSON.stringify({ conditions: [{ field: "daysRemaining", op: "eq", value: 2 }, { field: "completionRate", op: "lt", value: 0.7 }], actions: ["notify_team"] }), isActive: true, runCount: 8, lastRunAt: daysAgo(14) },
      { organizationId: orgId, createdById: dev.id,    name: "Auto-close stale tasks", description: "Move tasks with no activity for 30 days to ARCHIVED status", trigger: "task.stale", action: "task.archive", rule: JSON.stringify({ conditions: [{ field: "lastActivity", op: "gt", value: 30, unit: "days" }, { field: "status", op: "in", value: ["BACKLOG"] }], actions: ["set_status_archived"] }), isActive: false, runCount: 3, lastRunAt: daysAgo(30) },
      { organizationId: orgId, createdById: marcus.id, name: "Welcome new team members", description: "When a new user joins the org, create welcome tasks and add them to #general", trigger: "member.joined", action: "onboard.new_member", rule: JSON.stringify({ conditions: [], actions: ["create_welcome_tasks", "add_to_general", "send_welcome_email"] }), isActive: true, runCount: 7, lastRunAt: daysAgo(4) },
    ],
  });
  console.log("✅ Automations created");

  // ── ATTENDANCE ────────────────────────────────────────────────────────────
  const attendanceRecords = [];
  for (let day = 14; day >= 1; day--) {
    const date = daysAgo(day);
    const dayOfWeek = date.getDay();
    if (dayOfWeek === 0 || dayOfWeek === 6) continue; // skip weekends

    for (const user of users) {
      const absent = Math.random() < 0.08; // 8% absence rate
      const lateStart = Math.random() < 0.12; // 12% late
      const clockInHour = lateStart ? 9 + Math.random() * 2 : 8.5 + Math.random() * 0.5;
      const clockIn = new Date(date.getFullYear(), date.getMonth(), date.getDate(), Math.floor(clockInHour), Math.floor((clockInHour % 1) * 60));
      const clockOut = new Date(clockIn.getTime() + (6.5 + Math.random() * 2.5) * 3600000);

      attendanceRecords.push({
        userId: user.id, organizationId: orgId, date,
        clockIn: absent ? null : clockIn, clockOut: absent ? null : clockOut,
        status: absent ? "ABSENT" : lateStart ? "LATE" : "PRESENT",
      });
    }
  }
  await prisma.attendanceRecord.createMany({ skipDuplicates: true, data: attendanceRecords });
  console.log("✅ Attendance records created");

  // ── PROJECT TEMPLATES ────────────────────────────────────────────────────
  await prisma.projectTemplate.createMany({
    skipDuplicates: true,
    data: [
      { organizationId: orgId, createdById: marcus.id, name: "Software Sprint", description: "2-week agile sprint template with backlog, in-progress, review and done columns", category: "engineering", color: "#7C3AED", emoji: "🚀", isPublic: true, usageCount: 23, config: JSON.stringify({ tasks: [{ title: "Sprint planning", priority: "HIGH", storyPoints: 2 }, { title: "Daily standups", priority: "MEDIUM" }, { title: "Code review setup", priority: "MEDIUM" }, { title: "Sprint demo prep", priority: "LOW" }, { title: "Retrospective", priority: "LOW" }] }) },
      { organizationId: orgId, createdById: priya.id,  name: "Brand Design Project", description: "Full brand identity project from discovery to delivery", category: "design", color: "#F59E0B", emoji: "🎨", isPublic: true, usageCount: 8, config: JSON.stringify({ tasks: [{ title: "Brand discovery workshop", priority: "HIGH" }, { title: "Competitor analysis", priority: "HIGH" }, { title: "Mood board creation", priority: "MEDIUM" }, { title: "Logo concepts (3 directions)", priority: "HIGH" }, { title: "Color system", priority: "HIGH" }, { title: "Typography selection", priority: "MEDIUM" }, { title: "Component library", priority: "HIGH" }, { title: "Brand guidelines document", priority: "MEDIUM" }, { title: "Client presentation", priority: "HIGH" }] }) },
      { organizationId: orgId, createdById: sarah.id,  name: "Client Onboarding", description: "Checklist for onboarding a new client from contract to kickoff", category: "general", color: "#10B981", emoji: "🤝", isPublic: true, usageCount: 15, config: JSON.stringify({ tasks: [{ title: "Sign NDA and contract", priority: "URGENT" }, { title: "Client intake questionnaire", priority: "HIGH" }, { title: "Set up Slack channel", priority: "HIGH" }, { title: "Kickoff meeting scheduled", priority: "HIGH" }, { title: "Access credentials shared", priority: "HIGH" }, { title: "Project brief confirmed", priority: "MEDIUM" }, { title: "Timeline agreed", priority: "HIGH" }] }) },
      { organizationId: orgId, createdById: dev.id,    name: "Production Deployment", description: "Pre and post-deployment checklist for production releases", category: "devops", color: "#06B6D4", emoji: "📦", isPublic: false, usageCount: 31, config: JSON.stringify({ tasks: [{ title: "Code freeze", priority: "HIGH" }, { title: "All tests passing", priority: "URGENT" }, { title: "Staging smoke test", priority: "HIGH" }, { title: "Backup production DB", priority: "URGENT" }, { title: "Deploy to production", priority: "URGENT" }, { title: "Post-deploy smoke test", priority: "HIGH" }, { title: "Monitor error rates for 1h", priority: "HIGH" }, { title: "Update changelog", priority: "LOW" }] }) },
    ],
  });
  console.log("✅ Project templates created");

  // ── CLIENT PORTAL ─────────────────────────────────────────────────────────
  await prisma.clientPortal.upsert({
    where: { projectId: brandProj.id }, update: {},
    create: { projectId: brandProj.id, isActive: true, showTasks: true, showHealth: true, showTimeline: true },
  });
  await prisma.clientPortal.upsert({
    where: { projectId: mobileProj.id }, update: {},
    create: { projectId: mobileProj.id, isActive: true, showTasks: true, showHealth: true, showTimeline: false },
  });
  console.log("✅ Client portals created");

  // ── NOTIFICATIONS ─────────────────────────────────────────────────────────
  const existingNotifCount = await prisma.notification.count();
  if (existingNotifCount < 5) {
    await prisma.notification.createMany({
      data: [
        { userId: marcus.id, type: "TASK_ASSIGNED",  title: "Task assigned: Auth RS256 migration",      body: "James O'Brien is awaiting your review on PR #247",    isRead: false, createdAt: hoursAgo(8) },
        { userId: marcus.id, type: "SYSTEM",          title: "Sprint 8 is now active",                   body: "Sprint 8 — Dashboard & AI started today. 5 tasks in scope.", isRead: true, createdAt: daysAgo(1) },
        { userId: sarah.id,  type: "HEALTH_ALERT",    title: "Project health updated: Client Portal",     body: "Client Dashboard Portal health score dropped to 71/100. Scope lock needed.", isRead: false, createdAt: daysAgo(1) },
        { userId: sarah.id,  type: "MEETING_INVITE",  title: "Meeting: Apex Brand Presentation",         body: "Tomorrow at 2:00 PM — 90 mins. 3 attendees confirmed.", isRead: true, createdAt: daysAgo(2) },
        { userId: james.id,  type: "TASK_ASSIGNED",   title: "New task: Stripe webhook handler",         body: "Assigned by Marcus Chen in SaaS Platform v2.0",       isRead: false, createdAt: daysAgo(4) },
        { userId: james.id,  type: "SYSTEM",          title: "You earned a badge: Speed Demon 🚀",       body: "You completed 5 tasks in a single day. Keep it up!",   isRead: false, createdAt: daysAgo(3) },
        { userId: noah.id,   type: "TASK_ASSIGNED",   title: "New task: Real-time analytics dashboard",  body: "Assigned by Marcus Chen in SaaS Platform v2.0",       isRead: true,  createdAt: daysAgo(1) },
        { userId: noah.id,   type: "SYSTEM",          title: "You earned the Point Hunter badge 💰",     body: "Lifetime points balance crossed 500. Reward unlocked!", isRead: false, createdAt: daysAgo(2) },
        { userId: priya.id,  type: "MEETING_INVITE",  title: "Meeting: Apex Concept Presentation",       body: "Tomorrow at 2:00 PM — presenting your logo concepts!", isRead: false, createdAt: daysAgo(1) },
        { userId: elena.id,  type: "SYSTEM",          title: "Welcome to Nexus Digital! 🎉",             body: "Your workspace is set up and ready. Start with your assigned tasks.", isRead: true, createdAt: daysAgo(30) },
        { userId: dev.id,    type: "HEALTH_ALERT",    title: "Monitoring alert: High API latency",       body: "P95 API latency exceeded 500ms threshold at 3:42 AM. Resolved.", isRead: true, createdAt: daysAgo(1) },
        { userId: zara.id,   type: "TASK_ASSIGNED",   title: "New task: Social media kit",               body: "Assigned by Priya Kapoor in Brand Identity Refresh",  isRead: false, createdAt: daysAgo(2) },
      ],
    });
  }

  // ── SEARCH INDEX ─────────────────────────────────────────────────────────
  const existingSearchCount = await prisma.searchIndex.count();
  if (existingSearchCount < 5) {
    await prisma.searchIndex.createMany({
      data: [
        { sourceType: "PROJECT", sourceId: appProj.id,      content: "SaaS Platform v2.0 rebuild authentication AI dashboard sprint", organizationId: orgId, authorId: marcus.id },
        { sourceType: "PROJECT", sourceId: brandProj.id,    content: "Brand Identity Refresh Apex logo color system typography", organizationId: orgId, authorId: sarah.id },
        { sourceType: "PROJECT", sourceId: mobileProj.id,   content: "Mobile App iOS Android offline sync push notifications", organizationId: orgId, authorId: priya.id },
        { sourceType: "TASK",    sourceId: "t-auth-refactor",content: "auth authentication JWT RS256 security refactor backend", projectId: appProj.id, organizationId: orgId, authorId: james.id },
        { sourceType: "TASK",    sourceId: "t-dashboard-v2", content: "dashboard analytics charts real-time recharts frontend", projectId: appProj.id, organizationId: orgId, authorId: noah.id },
        { sourceType: "TASK",    sourceId: "t-offline-sync", content: "offline sync conflict resolution SQLite mobile", projectId: mobileProj.id, organizationId: orgId, authorId: noah.id },
        { sourceType: "TASK",    sourceId: "t-logo-v3",      content: "logo brand identity design concepts presentation client", projectId: brandProj.id, organizationId: orgId, authorId: priya.id },
        { sourceType: "DOCUMENT",sourceId: "doc-prd-saas",   content: "product requirements SaaS platform features AI collaboration", projectId: appProj.id, organizationId: orgId, authorId: sarah.id },
        { sourceType: "DOCUMENT",sourceId: "doc-brand-guide",content: "brand guidelines color typography logo usage voice tone", projectId: brandProj.id, organizationId: orgId, authorId: priya.id },
        { sourceType: "MEETING", sourceId: "meet-allhands",  content: "all hands Q2 review Q3 roadmap company team", organizationId: orgId, authorId: sarah.id },
        { sourceType: "MEETING", sourceId: "meet-apex-present",content: "Apex brand presentation logo concepts client", organizationId: orgId, authorId: sarah.id },
      ],
    });
  }

  // ── AUDIT LOGS ───────────────────────────────────────────────────────────
  await prisma.auditLog.createMany({
    skipDuplicates: false,
    data: [
      { userId: sarah.id,  organizationId: orgId, action: "project.created",       entityType: "Project", entityId: brandProj.id,    changes: JSON.stringify({ name: "Brand Identity Refresh" }), createdAt: daysAgo(30) },
      { userId: marcus.id, organizationId: orgId, action: "project.created",       entityType: "Project", entityId: appProj.id,       changes: JSON.stringify({ name: "SaaS Platform v2.0" }),      createdAt: daysAgo(28) },
      { userId: priya.id,  organizationId: orgId, action: "project.created",       entityType: "Project", entityId: mobileProj.id,    changes: JSON.stringify({ name: "Mobile App iOS/Android" }),    createdAt: daysAgo(20) },
      { userId: marcus.id, organizationId: orgId, action: "task.status_changed",   entityType: "Task",    entityId: "t-email-templates",changes: JSON.stringify({ from: "IN_PROGRESS", to: "DONE" }), createdAt: daysAgo(2) },
      { userId: james.id,  organizationId: orgId, action: "task.status_changed",   entityType: "Task",    entityId: "t-api-rate-limit", changes: JSON.stringify({ from: "REVIEW", to: "DONE" }),      createdAt: daysAgo(3) },
      { userId: dev.id,    organizationId: orgId, action: "automation.triggered",  entityType: "Automation",entityId: "auto-points",  changes: JSON.stringify({ trigger: "task.status_changed" }),   createdAt: daysAgo(2) },
      { userId: sarah.id,  organizationId: orgId, action: "member.role_changed",   entityType: "Member",  entityId: marcus.id,        changes: JSON.stringify({ from: "MEMBER", to: "MANAGER" }),    createdAt: daysAgo(15) },
      { userId: marcus.id, organizationId: orgId, action: "sprint.completed",      entityType: "Sprint",  entityId: sprint1.id,       changes: JSON.stringify({ velocity: 34, completionRate: 0.89 }), createdAt: daysAgo(1) },
      { userId: marcus.id, organizationId: orgId, action: "sprint.started",        entityType: "Sprint",  entityId: sprint2.id,       changes: JSON.stringify({ name: "Sprint 8" }),                  createdAt: now },
      { userId: sarah.id,  organizationId: orgId, action: "coupon.created",        entityType: "Coupon",  entityId: "coffee",         changes: JSON.stringify({ code: "COFFEE50", pointCost: 50 }),   createdAt: daysAgo(10) },
    ],
  });
  console.log("✅ Audit logs created");

  // ── DIRECT MESSAGES ───────────────────────────────────────────────────────
  const conv1 = await prisma.conversation.upsert({
    where: { user1Id_user2Id: { user1Id: marcus.id, user2Id: james.id } }, update: { lastMessage: "Let me know when PR is ready for re-review!", lastMessageAt: hoursAgo(5) },
    create: { user1Id: marcus.id, user2Id: james.id, lastMessage: "Let me know when PR is ready for re-review!", lastMessageAt: hoursAgo(5) },
  });
  const conv2 = await prisma.conversation.upsert({
    where: { user1Id_user2Id: { user1Id: sarah.id, user2Id: priya.id } }, update: { lastMessage: "Concept B is definitely the winner 🏆", lastMessageAt: hoursAgo(12) },
    create: { user1Id: sarah.id, user2Id: priya.id, lastMessage: "Concept B is definitely the winner 🏆", lastMessageAt: hoursAgo(12) },
  });
  const conv3 = await prisma.conversation.upsert({
    where: { user1Id_user2Id: { user1Id: noah.id, user2Id: dev.id } }, update: { lastMessage: "Monitoring stack will be ready by Thursday", lastMessageAt: hoursAgo(8) },
    create: { user1Id: noah.id, user2Id: dev.id, lastMessage: "Monitoring stack will be ready by Thursday", lastMessageAt: hoursAgo(8) },
  });

  const dmCount = await prisma.directMessage.count();
  if (dmCount < 5) {
    await prisma.directMessage.createMany({
      data: [
        { conversationId: conv1.id, senderId: marcus.id, content: "Hey James, how's the RS256 migration going? We're blocking on this for the Stripe webhooks.", isRead: true,  createdAt: daysAgo(2) },
        { conversationId: conv1.id, senderId: james.id,  content: "Good progress! Key rotation is done, just working on the session invalidation piece Noah flagged.", isRead: true,  createdAt: daysAgo(2) },
        { conversationId: conv1.id, senderId: marcus.id, content: "Great, let me know when PR is ready for re-review!", isRead: true, createdAt: hoursAgo(5) },
        { conversationId: conv2.id, senderId: sarah.id,  content: "Priya, just looked at all three concepts in Figma. Concept B is stunning — that custom 'N' letterform is genius.", isRead: true,  createdAt: hoursAgo(20) },
        { conversationId: conv2.id, senderId: priya.id,  content: "Thank you so much! Zara added the motion piece for the pitch and it looks incredible in action.", isRead: true,  createdAt: hoursAgo(18) },
        { conversationId: conv2.id, senderId: sarah.id,  content: "Concept B is definitely the winner 🏆", isRead: false, createdAt: hoursAgo(12) },
        { conversationId: conv3.id, senderId: dev.id,    content: "Noah, the Grafana + Prometheus stack is deployed to staging. Can you test the API latency panels?", isRead: true,  createdAt: daysAgo(1) },
        { conversationId: conv3.id, senderId: noah.id,   content: "Just tested — looking great! P95 is 180ms which is amazing. The DB query panel is super useful.", isRead: true,  createdAt: hoursAgo(16) },
        { conversationId: conv3.id, senderId: dev.id,    content: "Monitoring stack will be ready by Thursday", isRead: false, createdAt: hoursAgo(8) },
      ],
    });
  }
  console.log("✅ Direct messages created");

  // ── AI INSIGHTS ───────────────────────────────────────────────────────────
  await prisma.aIInsight.createMany({
    skipDuplicates: false,
    data: [
      { userId: marcus.id, prompt: "What are the biggest risks to SaaS Platform v2.0 this sprint?", content: "Based on current task status: (1) The auth RS256 migration is blocking Stripe webhooks — 3 days of float remaining before it cascades into the dashboard tasks. (2) Noah's dashboard has an undisclosed dependency on the AI suggestions model which isn't scoped until later. Recommend: unblock auth today, and pre-scope the AI embedding service for Sprint 9.", createdAt: daysAgo(1) },
      { userId: sarah.id,  prompt: "Generate a standup report for the design team", content: "**Design Team Standup — ${now.toDateString()}**\n\n**Priya:** Completed semantic color system and published Figma tokens. Currently finalising 3 logo concepts for Apex presentation tomorrow. Blocker: none.\n\n**Zara:** Typography scale doc done. Animated Concept B for pitch deck — ready. Currently working on social kit templates. Blocker: none.\n\n**Team highlight:** Brand guidelines doc is 60% complete. On track to deliver to Apex by end of week.", createdAt: hoursAgo(6) },
      { userId: dev.id,    prompt: "Analyse team velocity and predict sprint completion", content: "Sprint 8 is currently 40% complete with 9 days remaining. Velocity is tracking at 22 points/week vs Sprint 7's 34. The auth blocker is the main constraint — once #247 merges, 2 high-point tasks unblock simultaneously. **Prediction:** If auth merges by tomorrow, 85% probability of hitting sprint target. If it slips to day 5, probability drops to 62%.", createdAt: hoursAgo(4) },
    ],
  });
  console.log("✅ AI insights created");

  // ── NOTIFICATION PREFERENCES ──────────────────────────────────────────────
  for (const user of users) {
    await prisma.notificationPreference.upsert({
      where: { userId: user.id }, update: {},
      create: { userId: user.id, browser: true, email: true, taskAssigned: true, taskDue: true, taskOverdue: true, meetingInvite: true, projectUpdate: user.id === sarah.id || user.id === marcus.id, smartFilter: true, minPriority: "LOW", dndEnabled: true, dndStart: "22:00", dndEnd: "08:00" },
    });
  }
  console.log("✅ Notification preferences set");

  console.log("\n🎉 ZYNOTRIX demo seeded successfully!");
  console.log("\n📧 Demo accounts (password: password123):");
  console.log("   demo@nexusdigital.io  (Admin — full access)");
  console.log("   sarah@nexusdigital.io  (Owner / CEO)");
  console.log("   marcus@nexusdigital.io (Engineering Manager)");
  console.log("   priya@nexusdigital.io  (Lead Designer)");
  console.log("   james@nexusdigital.io  (Senior Developer)");
  console.log("   noah@nexusdigital.io   (Full-stack Developer)");
  console.log("   elena@nexusdigital.io  (Frontend Developer)");
  console.log("   zara@nexusdigital.io   (UI Designer)");
  console.log("   dev@nexusdigital.io    (DevOps / Admin)");
}

main().catch((e) => { console.error(e); process.exit(1); }).finally(() => prisma.$disconnect());
