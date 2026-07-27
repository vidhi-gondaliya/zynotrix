# ZYNOTRIX — Frequently Asked Questions

---

## Developer FAQ

### Q: How do I run ZYNOTRIX locally?

1. Clone the repository and `cd` into `zynotrix/`
2. Copy `.env.example` to `.env.local` and fill in the required values
3. Install dependencies: `npm install`
4. Push the schema to your database: `npx prisma db push`
5. Start the dev server: `npm run dev`
6. Open `http://localhost:3000`

Minimum required env vars: `DATABASE_URL`, `NEXTAUTH_SECRET`.

---

### Q: Do I need an Anthropic API key to run the app?

No. The app runs without an Anthropic key. AI features (assistant, health scoring, reports) will fail with an error when invoked, but all other functionality works normally.

---

### Q: How does multi-tenancy work?

Every API route calls `requireOrg()` which extracts `organizationId` from the JWT. All database queries are then scoped with `where: { organizationId: orgId }`. This is row-level isolation — all tenants share one database.

---

### Q: How do I add a new API route?

1. Create `src/app/api/your-route/route.ts`
2. Import and call `requireOrg()` at the start of every handler
3. Always include `organizationId: orgId` in your Prisma queries
4. Return `NextResponse.json(data)` for success, appropriate status codes for errors

```typescript
import { requireOrg, isOrgError } from "@/lib/org";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const ctx = await requireOrg();
  if (isOrgError(ctx)) return ctx;
  const { orgId } = ctx;

  const data = await prisma.yourModel.findMany({
    where: { organizationId: orgId }
  });
  return NextResponse.json(data);
}
```

---

### Q: How do I add a new page?

Create a file in `src/app/(app)/your-page/page.tsx`. The `(app)` route group automatically applies the authenticated app shell (sidebar + header). Add `"use client"` at the top if the page needs browser APIs or React state.

---

### Q: Why are tags stored as JSON strings instead of a relational model?

This is a known technical debt decision. Tags are stored as `String` containing a JSON array (e.g., `"[\"bug\",\"urgent\"]"`). When reading tags, parse with `JSON.parse(task.tags ?? "[]")`. When writing, serialize with `JSON.stringify(tagsArray)`. See `27_Known_Issues.md` for the planned fix.

---

### Q: How does real-time work?

ZYNOTRIX uses Server-Sent Events (SSE). The server maintains an in-memory `Map` of active connections per channel/user. When an event occurs (new message, new notification), `broadcastToChannel()` or `broadcastToUser()` pushes a JSON payload to all matching SSE connections.

**Known limitation**: This does not work across multiple server instances. On Vercel under load, SSE breaks. See KI-001 in `27_Known_Issues.md`.

---

### Q: How do I use the AI?

Use `streamToResponse()` from `src/lib/claude.ts` for streaming text, or `generateJSON<T>()` for structured JSON output. Both accept a system prompt, a user message, and optionally a model name.

```typescript
import { streamToResponse, generateJSON } from "@/lib/claude";

// Streaming text
return streamToResponse("You are a helper.", "Summarize this project.");

// JSON output
const result = await generateJSON<{ score: number }>(
  "Return JSON with a score field.",
  "Analyze: 5 tasks done, 2 overdue."
);
```

---

### Q: How does the permission system work?

See `src/lib/permissions.ts`. Four system roles (OWNER, ADMIN, MANAGER, MEMBER) each have default permission sets. Use `hasPermission(role, "tasks:delete")` in API routes to check. Custom roles are defined in the `roles` table but are not yet fully integrated into the runtime permission checks.

---

### Q: How do I run database migrations?

ZYNOTRIX currently uses `prisma db push` (schema sync, no migration files). For production changes:
1. Edit `prisma/schema.prisma`
2. Run `npx prisma db push` locally to test
3. Run `npx prisma generate` to update the Prisma client
4. For production, the build command handles this automatically

**Warning**: `db push` is destructive on breaking changes. Switch to `prisma migrate` for production safety.

---

### Q: What is the build command?

```bash
prisma generate && next build
```

This generates the Prisma client before compiling TypeScript. Running `next build` without `prisma generate` will fail with type errors.

---

## User FAQ

### Q: How do I create a workspace?

After signing up, you'll be redirected to `/create-workspace` if you don't have an organization. Enter your workspace name and you'll be set up as the OWNER with all permissions.

---

### Q: How do I invite team members?

Go to **Admin** → **Users** tab → **Create User**. Enter their name, email, and password, and assign their role. They can then log in with those credentials.

**Note**: There is currently no email invitation link feature. You'll need to share credentials manually.

---

### Q: What's the difference between roles?

| Role | What they can do |
|------|----------------|
| OWNER | Everything — all permissions |
| ADMIN | Manage users, projects, channels, analytics |
| MANAGER | Manage projects, tasks, assignments, meetings |
| MEMBER | Create and edit their own tasks only |

Custom roles with specific permission combinations can be created in Admin → Roles.

---

### Q: Can I reset my password?

**Not currently available.** Password reset is a known gap. If you've forgotten your password, contact your workspace Admin who can update it in the Admin → Users panel.

---

### Q: How do I earn points and badges?

Points are awarded automatically when you:
- Complete a task (move it to "Done")
- Complete a task before its due date (bonus)
- Clock in for attendance
- Maintain a 7-day activity streak

Badges are earned by hitting milestones (e.g., "Complete 10 tasks", "100 lifetime points"). Visit **Rewards** → **My Rewards** to see your progress.

---

### Q: What does the AI health score mean?

The AI health score (0–100) is generated by Claude AI based on:
- Task completion rate
- Number of overdue tasks
- Budget status
- Blocked task count
- Team velocity

A score of 80+ is healthy. Below 50 signals a project in trouble. Click **Refresh** on any project's health card to generate a new score.

---

### Q: How do I use the AI Assistant?

Navigate to **AI** in the sidebar. Type any question about your projects, tasks, or team. The assistant has context about your workspace data.

You can also:
- Ask "What's at risk this week?"
- Ask "Write a standup summary for my team"
- Use the Dashboard AI Insights card for automatic analysis

---

### Q: Why aren't I receiving notifications?

Check your notification preferences:
1. Click the bell icon → **Settings** (gear icon)
2. Ensure the event types you want are toggled on
3. Check if Do Not Disturb is enabled
4. Verify your browser allows notifications from this site

**Note**: Email and WhatsApp notifications are not yet implemented.

---

## Admin FAQ

### Q: How do I create a custom role?

1. Go to **Admin** → **Roles** tab
2. Click **Create Role**
3. Enter a role name
4. Switch to **Permissions** tab
5. Find your new role and toggle specific permissions on/off

Note: Custom role permissions are stored but may not be fully enforced in all cases. See `27_Known_Issues.md` KI-002.

---

### Q: How do I configure reward points?

1. Go to **Admin** → **Rewards** tab
2. The matrix shows each action (task_complete, attendance, etc.) × each role
3. Click the point value to edit it
4. Changes take effect immediately for new point awards

---

### Q: Can I see an audit log of changes?

The system maintains an `audit_logs` database table. However, there is currently no UI to view it. This is a known gap — planned in the Roadmap.

---

## Deployment FAQ

### Q: What's the minimum Vercel plan needed?

**Hobby plan** works for basic use, but AI features that take longer than 10 seconds will timeout. For production with AI features, you need **Pro plan** ($20/month) for 60-second function timeouts.

---

### Q: The app works locally but AI features don't work on Vercel.

Common causes:
1. `ANTHROPIC_API_KEY` not set in Vercel env vars
2. Function timeout too low (default 10s on Hobby) — add `vercel.json` with `maxDuration: 60`
3. Check Vercel Function logs in Dashboard → Functions → Logs

---

### Q: Why is chat not working in production?

The SSE-based real-time system may not work reliably on Vercel under load because of how serverless functions are isolated. Real-time features require a persistent pub/sub system (Pusher, Ably). This is a known architectural limitation (KI-001).

---

### Q: How do I update the database schema?

1. Modify `prisma/schema.prisma`
2. Run `npx prisma db push` (warning: potentially destructive)
3. Run `npx prisma generate`
4. Redeploy to Vercel

For a safer approach, switch to `prisma migrate dev` and `prisma migrate deploy`.
