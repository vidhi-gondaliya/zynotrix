# ZYNOTRIX — Business Logic

## 1. Organization Isolation (Multi-Tenancy)

### Rule
Every piece of data belongs to an organization. Users can only access data from organizations they are members of.

### Implementation

```typescript
// requireOrg() extracts orgId from JWT
const ctx = await requireOrg();
const { orgId, userId } = ctx;

// Every query MUST scope by orgId
await prisma.project.findMany({ where: { organizationId: orgId } });
```

### Enforcement Points
1. `requireOrg()` in every API route
2. `organizationId` FK on all major models (projects, channels, meetings, etc.)
3. Middleware redirects to `/create-workspace` if no org in JWT

### Edge Cases
- A user can technically only belong to one organization at a time (the JWT has one `organizationId`)
- If a user is added to a second org, their JWT still reflects the first until they re-login
- **[MISSING]**: Org-switching UI for multi-org users

---

## 2. Permission System (RBAC)

### Role Hierarchy

```
OWNER  >  ADMIN  >  MANAGER  >  MEMBER
```

### Default Permission Matrix

| Permission | OWNER | ADMIN | MANAGER | MEMBER |
|-----------|-------|-------|---------|--------|
| projects:create | ✓ | ✓ | ✓ | ✗ |
| projects:edit | ✓ | ✓ | ✓ | ✗ |
| projects:delete | ✓ | ✓ | ✗ | ✗ |
| tasks:create | ✓ | ✓ | ✓ | ✓ |
| tasks:edit | ✓ | ✓ | ✓ | ✓ |
| tasks:delete | ✓ | ✓ | ✓ | ✗ |
| tasks:assign | ✓ | ✓ | ✓ | ✗ |
| users:manage | ✓ | ✓ | ✗ | ✗ |
| roles:manage | ✓ | ✗ | ✗ | ✗ |
| channels:manage | ✓ | ✓ | ✓ | ✗ |
| meetings:manage | ✓ | ✓ | ✓ | ✗ |
| documents:manage | ✓ | ✓ | ✗ | ✗ |
| attendance:view_all | ✓ | ✓ | ✓ | ✗ |
| attendance:manage | ✓ | ✓ | ✗ | ✗ |
| admin:access | ✓ | ✓ | ✗ | ✗ |
| settings:access | ✓ | ✓ | ✗ | ✗ |
| analytics:view | ✓ | ✓ | ✓ | ✗ |

### Permission Check

```typescript
// src/lib/permissions.ts
export function hasPermission(role: string, permission: Permission): boolean {
  return (DEFAULT_ROLE_PERMISSIONS[role] ?? []).includes(permission);
}

// Convenience multi-permission check
export function can(role: string, ...permissions: Permission[]): boolean {
  return permissions.every(p => hasPermission(role, p));
}
```

### Custom Roles

Admins can create custom roles with any combination of permissions. Custom role permissions are stored as a JSON array in the `roles.permissions` DB field.

**Important**: The `DEFAULT_ROLE_PERMISSIONS` in code only applies to system roles (OWNER, ADMIN, MANAGER, MEMBER). Custom roles read permissions exclusively from the DB.

**[INCOMPLETE]**: The API and frontend use `orgRole` from the JWT which only contains the role name (e.g., "MANAGER"). Custom role permission checking requires a DB lookup for each request — this is not currently done. Most permission checks use only `DEFAULT_ROLE_PERMISSIONS`.

---

## 3. Reward Point Calculations

### Configuration

Point values are configurable per organization per role per action via the Admin → Rewards tab. Stored in `reward_configs`.

**Default actions**:
- `task_complete`: Task moved to DONE status
- `task_early`: Task completed before its due date
- `attendance`: User clocks in for the day
- `streak`: 7-day activity streak bonus

### Award Trigger

Points are awarded when:
1. A task is moved to DONE → check `task_complete` + `task_early` configs
2. A user clocks in → check `attendance` config
3. A 7-day streak is detected → `streak` config

### Point Storage

```typescript
// UserPoints: current balance + lifetime total
balance:  spendable points (decremented on coupon redemption)
lifetime: ever-earned total (never decremented)
```

### Transaction Log

Every point award creates a `PointTransaction` with:
- `action`: the trigger action type
- `points`: amount awarded
- `metadata`: JSON context (e.g., taskId)

---

## 4. Badge Earning Logic

### Badge Condition Types

| conditionType | Description | Example |
|--------------|-------------|---------|
| `points_lifetime` | User's lifetime points >= threshold | "Earn 100 lifetime points" |
| `tasks_done` | Total tasks completed >= threshold | "Complete 10 tasks" |
| `attendance_streak` | Consecutive days clocked in >= threshold | "7-day attendance streak" |

### Badge Check Flow [Inferred]

When a point transaction is created:
1. Fetch all org badges
2. For each badge, evaluate condition against user's current stats
3. If condition met AND user doesn't already have the badge → create `UserBadge`
4. **[MISSING]**: Real-time badge notification to user

---

## 5. Attendance Tracking

### Clock-In Logic

```typescript
// POST /api/attendance/clock-in
// Creates or updates AttendanceRecord for today

await prisma.attendanceRecord.upsert({
  where: { userId_organizationId_date: { userId, organizationId, date: today } },
  create: {
    userId, organizationId,
    date: today,
    clockIn: now,
    status: "PRESENT"
  },
  update: { clockIn: now }
});
```

**Unique constraint**: One record per user per org per calendar day.

### Status Values

- `PRESENT`: Clocked in normally
- `LATE`: Clocked in after a configured late threshold **[INCOMPLETE — late detection not implemented]**
- `ABSENT`: No clock-in by end of day (would require a cron job) **[MISSING]**
- `HALF_DAY`: Partial day (admin-set manually)

### Work Hours Calculation

Duration = `clockOut - clockIn` in minutes.

Stored directly from timestamp difference. The `timeSpentMin` field on Task is separate — it tracks task-specific time, not attendance time.

---

## 6. Sprint Velocity

### What It Measures

Sprint `velocity` = total story points of tasks in DONE status at sprint end.

### Calculation **[Inferred]**

When a sprint is marked COMPLETED:
1. Fetch all `SprintTask` records for this sprint
2. For each task in DONE status, sum `storyPoints`
3. Store result in `sprint.velocity`

**[INCOMPLETE]**: This calculation is not confirmed in the codebase. The `velocity` field exists but automatic calculation on sprint completion is not verified.

---

## 7. Project Health Scoring

### Input Data

The health API collects:
- Total tasks
- Completed tasks (DONE)
- Overdue tasks (dueDate < now, not DONE)
- Blocked tasks (has dependency in non-DONE status)
- Budget: `project.budget` vs `project.budgetSpent`

### AI Health Score

The data is sent to Claude with the `SYSTEM_PROMPTS.healthScore` system prompt:

```
You are a project health analyzer. Given project metrics, return a JSON object:
{
  "score": <0-100>,
  "grade": <"A"|"B"|"C"|"D"|"F">,
  "summary": <one sentence>,
  "breakdown": {
    "onTimeRate": <0-100>,
    "budgetStatus": <"on_track"|"at_risk"|"over_budget">,
    "teamVelocity": <0-100>,
    "blockerCount": <number>,
    "completionRate": <0-100>
  },
  "risks": [...],
  "recommendations": [...]
}
```

### Caching

The health score and JSON response are cached in `project.healthScore` and `project.healthData` after each AI call. Subsequent requests can use the cached value until explicitly refreshed.

---

## 8. Kanban Position Management

### Column Positions

Tasks within each status column are ordered by `position ASC`. Position is an integer, 0-based.

### On Task Create

```typescript
const maxPos = await prisma.task.aggregate({
  where: { projectId, status: newStatus },
  _max: { position: true }
});
task.position = (maxPos._max.position ?? -1) + 1;
```

New tasks are appended to the bottom of their column.

### On Drag-Drop (Move)

When a task is dragged to a new position:
1. `PATCH /api/tasks/[taskId]/move { status, position }`
2. Status updated to new column
3. Position updated to dropped position
4. **[INCOMPLETE]**: Adjacent tasks' positions are NOT re-sorted. This can cause position collisions over time.

**Recommended fix**: Re-sort all positions in the column after every drag-drop using sequential integers.

---

## 9. Notification Filtering Logic

### Processing Order

When `createNotification()` is called:

1. **Event toggle**: Check if the specific event type is enabled (`prefs.taskAssigned`, etc.)
2. **Channel check**: If all channels (browser, email, WhatsApp) are disabled → skip
3. **Smart filter**: If enabled, compare notification priority vs `prefs.minPriority`
4. **DND check**: If DND window is active AND notification is not URGENT → skip
5. **Create**: Write to `notifications` table
6. **Push**: `broadcastToUser(userId, notification)` via SSE

### Notification Priority Map

```typescript
const TYPE_PRIORITY = {
  TASK_ASSIGNED:    "MEDIUM",
  TASK_DUE:         "HIGH",
  TASK_OVERDUE:     "HIGH",
  MEETING_INVITE:   "MEDIUM",
  MEETING_REMINDER: "MEDIUM",
  HEALTH_ALERT:     "HIGH",
  MENTION:          "HIGH",
  COMMENT_ADDED:    "LOW",
  SYSTEM:           "LOW",
};
```

### DND Calculation

```typescript
function isInDND(start: string, end: string): boolean {
  // Handles midnight-crossing ranges (e.g., 22:00 → 08:00)
  const nowMin = now.getHours() * 60 + now.getMinutes();
  if (startMin <= endMin) return nowMin >= startMin && nowMin < endMin;
  return nowMin >= startMin || nowMin < endMin;
}
```

---

## 10. Task Assignment Notification

When a task is assigned to someone other than the creator:

```typescript
if (body.assigneeId && body.assigneeId !== session.user.id) {
  await createNotification(
    body.assigneeId,
    "TASK_ASSIGNED",
    `New task assigned: ${body.title}`,
    `You have been assigned to this task.`,
    { taskId: task.id, projectId }
  );
}
```

Self-assignments do not trigger notifications.

---

## 11. Search Indexing

When a task is created, it's indexed:
```typescript
await prisma.searchIndex.create({
  data: {
    sourceType: "TASK",
    sourceId: task.id,
    content: [title, description, tags.join(" ")].filter(Boolean).join(" "),
    projectId,
    authorId: session.user.id,
    organizationId: orgId,
  }
});
```

**[INCOMPLETE]**: Index is not updated when tasks are edited. Documents and messages may also not be indexed consistently.

---

## 12. Coupon Redemption

```typescript
// POST /api/rewards/redeem
1. Fetch coupon and user's points
2. Validate: coupon exists, isActive, not expired, stock remaining, user has enough points
3. Deduct points from user.balance (NOT lifetime)
4. Create CouponRedemption record
5. Increment coupon.usedCount
```

**Business rule**: Only `balance` is spent on coupons. `lifetime` never decreases — it's a historical measure.
