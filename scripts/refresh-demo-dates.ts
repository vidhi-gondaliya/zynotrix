// One-off maintenance script: re-anchors the demo dataset's relative dates
// (project deadlines, sprint windows, task due/start dates) to "now", so the
// seeded demo data doesn't look permanently overdue as real time passes.
//
// Run with: npm run db:refresh-dates
import fs from "fs";
import path from "path";
import { PrismaClient } from "@prisma/client";

// Minimal .env loader (no `dotenv` package installed in this project)
function loadEnv(file: string) {
  const full = path.resolve(process.cwd(), file);
  if (!fs.existsSync(full)) return;
  for (const line of fs.readFileSync(full, "utf8").split("\n")) {
    const m = line.match(/^\s*([\w.-]+)\s*=\s*(.*)\s*$/);
    if (!m) continue;
    let val = m[2];
    if (val.startsWith('"') && val.endsWith('"')) val = val.slice(1, -1);
    if (!(m[1] in process.env)) process.env[m[1]] = val;
  }
}
loadEnv(".env");

const prisma = new PrismaClient();

const now = new Date();
const daysAgo = (n: number) => new Date(now.getTime() - n * 86400000);
const daysFromNow = (n: number) => new Date(now.getTime() + n * 86400000);

async function main() {
  console.log(`Re-anchoring demo dates to ${now.toISOString()}`);

  // ── PROJECTS ───────────────────────────────────────────────────────────
  const projectDeadlines: Record<string, Date> = {
    "proj-saas-app": daysFromNow(45),
    "proj-brand":    daysFromNow(20),
    "proj-portal":   daysFromNow(90),
    "proj-mobile":   daysFromNow(60),
    "proj-internal": daysFromNow(30),
  };
  for (const [id, deadline] of Object.entries(projectDeadlines)) {
    await prisma.project.update({ where: { id }, data: { deadline } }).catch((e) => console.warn(`  skip project ${id}: ${e.message}`));
  }
  console.log(`✅ ${Object.keys(projectDeadlines).length} project deadlines refreshed`);

  // ── SPRINTS ────────────────────────────────────────────────────────────
  const sprints: Record<string, { startDate: Date; endDate: Date }> = {
    "sprint-saas-1":   { startDate: daysAgo(14), endDate: daysAgo(1) },
    "sprint-saas-2":   { startDate: now,          endDate: daysFromNow(13) },
    "sprint-mobile-1": { startDate: daysAgo(7),   endDate: daysFromNow(7) },
  };
  for (const [id, dates] of Object.entries(sprints)) {
    await prisma.sprint.update({ where: { id }, data: dates }).catch((e) => console.warn(`  skip sprint ${id}: ${e.message}`));
  }
  console.log(`✅ ${Object.keys(sprints).length} sprint windows refreshed`);

  // ── TASKS ──────────────────────────────────────────────────────────────
  const taskDates: Record<string, { due?: Date; start?: Date }> = {
    "t-auth-refactor":    { due: daysFromNow(3),  start: daysAgo(2) },
    "t-stripe-webhooks":  { due: daysFromNow(2),  start: daysAgo(3) },
    "t-dashboard-v2":     { due: daysFromNow(8),  start: daysAgo(1) },
    "t-ai-suggestions":   { due: daysFromNow(12) },
    "t-onboard-flow":     { due: daysFromNow(5) },
    "t-email-templates":  { due: daysAgo(2) },
    "t-api-rate-limit":   { due: daysAgo(3) },
    "t-search-global":    { due: daysFromNow(20) },
    "t-dark-mode":        { due: daysFromNow(15) },
    "t-perf-audit":       { due: daysFromNow(10) },

    "t-logo-v3":          { due: daysFromNow(1) },
    "t-color-system":     { due: daysAgo(5) },
    "t-type-scale":       { due: daysAgo(3) },
    "t-component-lib":    { due: daysFromNow(7) },
    "t-brand-guide":      { due: daysFromNow(10) },
    "t-social-kit":       { due: daysFromNow(14) },

    "t-portal-auth":      { due: daysFromNow(30) },
    "t-portal-dashboard": { due: daysFromNow(40) },
    "t-portal-invoices":  { due: daysFromNow(55) },
    "t-portal-chat":      { due: daysFromNow(70) },

    "t-offline-sync":     { due: daysFromNow(5), start: daysAgo(5) },
    "t-push-notif":       { due: daysFromNow(7) },
    "t-ios-review":       { due: daysFromNow(14) },
    "t-biometric-auth":   { due: daysAgo(2) },
    "t-deep-links":       { due: daysFromNow(3) },
    "t-crash-report":     { due: daysAgo(4) },

    "t-ci-pipeline":      { due: daysAgo(5) },
    "t-monitoring":       { due: daysFromNow(4) },
    "t-staging-env":      { due: daysAgo(2) },
    "t-db-backup":        { due: daysAgo(7) },
    "t-docs-site":        { due: daysFromNow(25) },
  };
  let updated = 0;
  for (const [id, { due, start }] of Object.entries(taskDates)) {
    const data: Record<string, Date> = {};
    if (due)   data.dueDate = due;
    if (start) data.startDate = start;
    await prisma.task.update({ where: { id }, data })
      .then(() => updated++)
      .catch((e) => console.warn(`  skip task ${id}: ${e.message}`));
  }
  console.log(`✅ ${updated}/${Object.keys(taskDates).length} task due/start dates refreshed`);

  await prisma.$disconnect();
  console.log("Done.");
}

main().catch(async (e) => {
  console.error(e);
  await prisma.$disconnect();
  process.exit(1);
});
