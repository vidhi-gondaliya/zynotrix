import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Seeding ZYNOTRIX database...");

  // Users
  const hash = await bcrypt.hash("password123", 12);
  const [admin, alice, bob, charlie] = await Promise.all([
    prisma.user.upsert({ where: { email: "admin@zynotrix.com" }, update: {}, create: { email: "admin@zynotrix.com", name: "Alex Founder", passwordHash: hash, role: "OWNER" } }),
    prisma.user.upsert({ where: { email: "alice@zynotrix.com" }, update: {}, create: { email: "alice@zynotrix.com", name: "Alice Chen", passwordHash: hash, role: "MANAGER" } }),
    prisma.user.upsert({ where: { email: "bob@zynotrix.com" }, update: {}, create: { email: "bob@zynotrix.com", name: "Bob Smith", passwordHash: hash, role: "MEMBER" } }),
    prisma.user.upsert({ where: { email: "charlie@zynotrix.com" }, update: {}, create: { email: "charlie@zynotrix.com", name: "Charlie Davis", passwordHash: hash, role: "MEMBER" } }),
  ]);
  console.log("✅ Users created");

  // Channels
  const general = await prisma.channel.upsert({
    where: { id: "ch-general" },
    update: {},
    create: {
      id: "ch-general", name: "general", description: "Company-wide chat", isGeneral: true,
      members: { create: [{ userId: admin.id }, { userId: alice.id }, { userId: bob.id }, { userId: charlie.id }] },
    },
  });

  const design = await prisma.channel.upsert({
    where: { id: "ch-design" },
    update: {},
    create: {
      id: "ch-design", name: "design", description: "Design team",
      members: { create: [{ userId: admin.id }, { userId: alice.id }] },
    },
  });

  const dev = await prisma.channel.upsert({
    where: { id: "ch-dev" },
    update: {},
    create: {
      id: "ch-dev", name: "dev", description: "Engineering",
      members: { create: [{ userId: admin.id }, { userId: bob.id }, { userId: charlie.id }] },
    },
  });

  // Messages (createMany without skipDuplicates for SQLite)
  const msgData = [
    { channelId: general.id, authorId: admin.id, content: "Hey team! Welcome to ZYNOTRIX 🚀 Let's ship some great products this quarter!" },
    { channelId: general.id, authorId: alice.id, content: "Excited to be here! The new dashboard looks amazing 🎨" },
    { channelId: general.id, authorId: bob.id, content: "Just finished the API integration. Ready for review!" },
    { channelId: design.id, authorId: alice.id, content: "Working on the new landing page designs. Will share a Figma link soon." },
    { channelId: dev.id, authorId: bob.id, content: "PR #42 is ready for review. Includes the authentication refactor." },
    { channelId: dev.id, authorId: charlie.id, content: "On it! Will review this afternoon 👍" },
  ];
  // Use upsert-style logic: only create if channel has no messages
  const existingMsgs = await prisma.message.count();
  if (existingMsgs === 0) {
    await prisma.message.createMany({ data: msgData });
  }
  console.log("✅ Channels & messages created");

  // Projects
  const website = await prisma.project.upsert({
    where: { id: "proj-website" },
    update: {},
    create: {
      id: "proj-website", name: "Website Redesign",
      description: "Complete overhaul of the company website with new brand identity",
      status: "ACTIVE", color: "#7C3AED",
      deadline: new Date(Date.now() + 45 * 86400000), budget: 25000, clientName: "Internal",
      ownerId: admin.id, healthScore: 72,
      healthData: JSON.stringify({ score: 72, grade: "B", summary: "Project is on track with minor delays in design phase.", breakdown: { onTimeRate: 75, budgetStatus: "on_track", teamVelocity: 68, blockerCount: 1, completionRate: 40 }, risks: ["Design phase slightly behind schedule"], recommendations: ["Schedule design review ASAP"] }),
    },
  });

  const app = await prisma.project.upsert({
    where: { id: "proj-app" },
    update: {},
    create: {
      id: "proj-app", name: "Mobile App v2.0",
      description: "Major feature update with AI-powered recommendations",
      status: "ACTIVE", color: "#06B6D4",
      deadline: new Date(Date.now() + 60 * 86400000), budget: 80000, clientName: "Product Team",
      ownerId: alice.id, healthScore: 88,
      healthData: JSON.stringify({ score: 88, grade: "A", summary: "Excellent progress! Team is ahead of schedule.", breakdown: { onTimeRate: 90, budgetStatus: "on_track", teamVelocity: 85, blockerCount: 0, completionRate: 60 }, risks: ["Feature creep risk"], recommendations: ["Maintain current velocity"] }),
    },
  });

  await prisma.project.upsert({
    where: { id: "proj-marketing" },
    update: {},
    create: {
      id: "proj-marketing", name: "Q4 Marketing Campaign",
      description: "End-of-year marketing push across all channels",
      status: "PLANNING", color: "#10B981",
      deadline: new Date(Date.now() + 30 * 86400000), budget: 15000, clientName: "Marketing Dept",
      ownerId: admin.id,
    },
  });
  console.log("✅ Projects created");

  // Tasks
  const makeTaskId = (prefix: string, title: string) =>
    `${prefix}-${title.replace(/\s+/g, "-").toLowerCase().slice(0, 25)}`;

  const websiteTasks = [
    { title: "Design new homepage wireframes", status: "DONE", priority: "HIGH", assigneeId: alice.id, position: 0, tags: '["design"]' },
    { title: "Create brand style guide", status: "DONE", priority: "HIGH", assigneeId: alice.id, position: 1, tags: '["design"]' },
    { title: "Implement responsive header", status: "IN_PROGRESS", priority: "HIGH", assigneeId: bob.id, position: 0, dueDate: new Date(Date.now() + 3 * 86400000), tags: '["frontend"]' },
    { title: "Build contact form backend", status: "TODO", priority: "MEDIUM", assigneeId: charlie.id, position: 0, tags: '["backend"]' },
    { title: "SEO optimization", status: "BACKLOG", priority: "LOW", position: 0, tags: '["seo"]' },
    { title: "Cross-browser testing", status: "REVIEW", priority: "HIGH", assigneeId: alice.id, position: 0, tags: '["testing"]' },
    { title: "Accessibility improvements", status: "TODO", priority: "MEDIUM", position: 1, dueDate: new Date(Date.now() - 2 * 86400000), tags: '["a11y"]' },
  ];

  for (const t of websiteTasks) {
    const id = makeTaskId("web", t.title);
    await prisma.task.upsert({
      where: { id },
      update: {},
      create: { id, projectId: website.id, creatorId: admin.id, assigneeId: t.assigneeId || null, ...t },
    });
  }

  const appTasks = [
    { title: "AI recommendation engine", status: "IN_PROGRESS", priority: "URGENT", assigneeId: bob.id, position: 0, tags: '["ai"]' },
    { title: "User onboarding flow", status: "DONE", priority: "HIGH", assigneeId: alice.id, position: 0, tags: '["ux"]' },
    { title: "Push notifications", status: "TODO", priority: "MEDIUM", assigneeId: charlie.id, position: 0, tags: '["mobile"]' },
    { title: "App store screenshots", status: "BACKLOG", priority: "LOW", position: 0, tags: '["marketing"]' },
    { title: "Beta testing program", status: "IN_PROGRESS", priority: "HIGH", assigneeId: admin.id, position: 1, tags: '["testing"]' },
  ];

  for (const t of appTasks) {
    const id = makeTaskId("app", t.title);
    await prisma.task.upsert({
      where: { id },
      update: {},
      create: { id, projectId: app.id, creatorId: alice.id, assigneeId: t.assigneeId || null, ...t },
    });
  }
  console.log("✅ Tasks created");

  // Meetings
  const existingMeetings = await prisma.meeting.count();
  if (existingMeetings === 0) {
    const m1 = await prisma.meeting.create({
      data: {
        title: "Weekly Team Standup",
        description: "30-min team sync to discuss progress and blockers",
        startTime: new Date(Date.now() + 24 * 3600000),
        endTime: new Date(Date.now() + 24 * 3600000 + 30 * 60000),
        status: "SCHEDULED", organizerId: admin.id, projectId: website.id,
        attendees: { create: [{ userId: admin.id, rsvp: "ACCEPTED" }, { userId: alice.id, rsvp: "ACCEPTED" }, { userId: bob.id, rsvp: "PENDING" }] },
      },
    });
    await prisma.meeting.create({
      data: {
        title: "Website Design Review",
        description: "Review homepage designs with stakeholders",
        startTime: new Date(Date.now() + 48 * 3600000),
        endTime: new Date(Date.now() + 48 * 3600000 + 60 * 60000),
        status: "SCHEDULED", organizerId: alice.id, projectId: website.id,
        attendees: { create: [{ userId: alice.id, rsvp: "ACCEPTED" }, { userId: admin.id, rsvp: "PENDING" }] },
      },
    });
    await prisma.meeting.create({
      data: {
        title: "Mobile App Sprint Planning",
        description: "Plan sprint 8 tasks and story points",
        startTime: new Date(Date.now() + 72 * 3600000),
        endTime: new Date(Date.now() + 72 * 3600000 + 90 * 60000),
        status: "SCHEDULED", organizerId: alice.id, projectId: app.id,
        attendees: { create: [{ userId: alice.id, rsvp: "ACCEPTED" }, { userId: bob.id, rsvp: "ACCEPTED" }, { userId: charlie.id, rsvp: "PENDING" }] },
      },
    });
  }
  console.log("✅ Meetings created");

  // Notifications
  const existingNotifs = await prisma.notification.count();
  if (existingNotifs === 0) {
    await prisma.notification.createMany({
      data: [
        { userId: admin.id, type: "SYSTEM", title: "Welcome to ZYNOTRIX! 🎉", body: "Your AI-powered workspace is ready.", isRead: false },
        { userId: admin.id, type: "TASK_ASSIGNED", title: "New task: Beta testing program", body: "You've been assigned in Mobile App v2.0", isRead: false },
        { userId: admin.id, type: "MEETING_INVITE", title: "Meeting: Website Design Review", body: "Tomorrow at 2:00 PM", isRead: true },
        { userId: admin.id, type: "HEALTH_ALERT", title: "Project health updated", body: "Website Redesign scored 72/100", isRead: true },
      ],
    });
  }

  // Search index
  const existingSearch = await prisma.searchIndex.count();
  if (existingSearch === 0) {
    await prisma.searchIndex.createMany({
      data: [
        { sourceType: "TASK", sourceId: "web-design-new-homepage-wire", content: "Design new homepage wireframes design", projectId: website.id, authorId: admin.id },
        { sourceType: "TASK", sourceId: "app-ai-recommendation-engine", content: "AI recommendation engine mobile app", projectId: app.id, authorId: alice.id },
        { sourceType: "MEETING", sourceId: "meet-standup", content: "Weekly Team Standup sync progress blockers", projectId: website.id, authorId: admin.id },
      ],
    });
  }
  console.log("✅ Notifications & search index seeded");

  console.log("\n🎉 ZYNOTRIX seeded successfully!");
  console.log("\n📧 Demo accounts (password: password123):");
  console.log("   admin@zynotrix.com  (Owner/Founder)");
  console.log("   alice@zynotrix.com  (Manager)");
  console.log("   bob@zynotrix.com    (Developer)");
  console.log("   charlie@zynotrix.com (Developer)");
}

main().catch((e) => { console.error(e); process.exit(1); }).finally(() => prisma.$disconnect());
