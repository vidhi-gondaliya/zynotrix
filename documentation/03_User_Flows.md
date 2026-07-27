# ZYNOTRIX — User Flows

This document maps every user journey through ZYNOTRIX, including happy paths, error states, empty states, and loading states.

---

## 1. First-Time Registration Flow

```
Landing page (/)
  └─ Redirect → /login (unauthenticated)
       └─ Click "Create account" → /register
            ├─ Fill form: name, email, password (min 8 chars)
            ├─ POST /api/auth/register
            ├─ [Error] Email already in use → inline error
            ├─ [Error] Weak password → validation error
            └─ [Success] → Auto sign-in → /create-workspace
```

**Empty state on register**: Name field optional. Email is required and unique.

---

## 2. Create Workspace Flow

```
/create-workspace
  ├─ Fill: Organization name, optional logo URL
  ├─ POST /api/organizations
  ├─ Session update: organizationId injected into JWT
  └─ [Success] → /dashboard
       └─ OnboardingWizard shown (first visit, localStorage check)
```

**Edge case**: If user already has an org (session has `organizationId`), middleware redirects them away from `/create-workspace` to `/dashboard`.

---

## 3. Login Flow

```
/login
  ├─ Credentials (email + password)
  │    ├─ POST to NextAuth credentials provider
  │    ├─ [Error] Wrong credentials → "Invalid email or password"
  │    └─ [Success] → check org membership
  └─ Google OAuth
       ├─ Redirect to Google consent → callback to /api/auth/callback/google
       ├─ Account linked via PrismaAdapter
       └─ [Success] → same org check flow

After successful auth:
  ├─ Has org → /dashboard
  └─ No org → /create-workspace
```

**Callback URL**: Login preserves `?callbackUrl` for deep-link after auth.

---

## 4. Dashboard Flow

```
/dashboard
  ├─ [Loading] → Skeleton grid (4 metric cards + 3 chart areas)
  ├─ [Loaded]
  │    ├─ Greeting hero (time-aware: good morning/afternoon/evening)
  │    ├─ Critical risk banner (if any alerts with severity=critical)
  │    ├─ 4 metric cards (Active Tasks, Overdue, Under Review, Total)
  │    ├─ Upcoming tasks (today + tomorrow split)
  │    ├─ Task activity area chart (14-day trend)
  │    ├─ Team activity bar chart (tasks per member)
  │    ├─ Recent tasks list
  │    ├─ Status breakdown + Meetings column
  │    └─ AI Insights card (generate on demand, view history)
  └─ [Error] fetch fails → null render (no error UI — [MISSING])
```

**AI Insights sub-flow**:
```
Click "Generate" 
  → POST /api/ai/assistant with workspace summary prompt
  → Streaming response renders token-by-token via useClaude hook
  → On complete → POST /api/ai/insights to save
  → History button reveals past 10 insights
```

---

## 5. Create Project Flow

```
/projects → "New Project" button → /projects/new
  ├─ Fill: name (required), description, status, color, icon
  ├─ Optional: deadline, budget, client name/email
  ├─ Click "Generate description" → AI fills description field
  ├─ Choose board template (from template modal or AI-generate)
  ├─ POST /api/projects
  └─ [Success] → /projects/[newId]/board
```

**Empty state** for `/projects`: No projects card with "Create your first project" CTA.

---

## 6. Kanban Board Flow

```
/projects/[projectId]/board
  ├─ [Loading] → Column skeleton loaders
  ├─ [Loaded] → Status columns (Backlog, Todo, In Progress, Review, Done)
  │    ├─ Each column: task cards sorted by position
  │    ├─ Drag card → drops into new column
  │    │    └─ PATCH /api/tasks/[taskId]/move {status, position}
  │    ├─ Click "+ Add task" in column → inline form
  │    │    └─ POST /api/projects/[projectId]/tasks
  │    └─ Click task card → Task Detail Modal
  └─ Filter bar: by assignee, priority, tags
```

**Task Detail Modal sub-flow**:
```
Click task card
  ├─ Load comments, activities, subtasks, time logs, assignees, dependencies, custom fields
  ├─ Edit title, description (inline), status, priority, due date
  ├─ Add comment → POST /api/tasks/[taskId]/comments
  ├─ Add subtask → POST /api/tasks/[taskId]/subtasks
  ├─ Add assignee → POST /api/tasks/[taskId]/assignees
  ├─ Add dependency → POST /api/tasks/[taskId]/dependencies
  ├─ Log time → POST /api/tasks/[taskId]/time
  └─ View full activity feed
```

---

## 7. AI Task Creation Flow

```
Dashboard → "AI Create Task" button
  → NLTaskCreator modal opens
  ├─ Type: "Fix the auth bug and assign to John by Friday, high priority"
  ├─ POST /api/ai/ (NLP parser)
  ├─ AI returns: { title, assigneeId, dueDate, priority, projectId }
  ├─ Form pre-filled with parsed values
  ├─ User reviews + confirms
  └─ POST /api/projects/[projectId]/tasks
```

---

## 8. Channel Chat Flow

```
/chat
  ├─ Sidebar: list of channels user is member of
  ├─ Click channel → /chat/[channelId]
  │    ├─ GET /api/channels/[channelId]/messages (last 50)
  │    ├─ SSE stream: GET /api/channels/[channelId]/sse
  │    ├─ Type message → POST /api/channels/[channelId]/messages
  │    └─ New messages broadcast to all SSE subscribers in real-time
  └─ "New Channel" button (requires channels:manage permission)
       └─ POST /api/channels → set name, description, isPrivate
```

**Empty state**: "No messages yet. Start the conversation."

---

## 9. Direct Message Flow

```
/messages
  ├─ Sidebar: list of existing conversations
  ├─ "New Message" → user picker → POST /api/conversations
  └─ /messages/[conversationId]
       ├─ GET /api/conversations/[conversationId]/messages
       ├─ SSE stream: GET /api/conversations/[conversationId]/sse
       ├─ Type → POST /api/conversations/[conversationId]/messages
       └─ Real-time delivery to recipient
```

---

## 10. Schedule Meeting Flow

```
/meetings → "New Meeting" → /meetings/new
  ├─ Fill: title, description, start/end time
  ├─ Select attendees (org members)
  ├─ Optional: link to project
  ├─ Check "Generate Google Meet link" 
  │    └─ Calls Google Calendar API via googleapis
  ├─ POST /api/meetings
  ├─ Attendees receive MEETING_INVITE notification
  └─ [Success] → Back to /meetings calendar view
```

**Edge case**: Google Meet generation requires `GOOGLE_CLIENT_ID` + `GOOGLE_CLIENT_SECRET` + valid OAuth token. If unavailable, meeting saves without a Meet URL.

---

## 11. AI Meeting Notes Flow

```
Meeting detail → "Generate Notes" (MeetingNotesPanel)
  ├─ Paste raw transcript or notes
  ├─ POST /api/ai/meeting-notes
  ├─ AI returns: { agenda, decisions, actionItems }
  └─ PATCH /api/meetings/[meetingId] with notes + actionItems
```

---

## 12. Attendance Punch Clock Flow

```
Header → PunchClock component
  ├─ "Clock In" button
  │    ├─ POST /api/attendance/clock-in
  │    ├─ Creates AttendanceRecord with clockIn timestamp
  │    └─ Awards attendance points via RewardConfig
  └─ "Clock Out" button
       ├─ PATCH /api/attendance/clock-out
       └─ Sets clockOut, calculates duration
```

**Admin view** at `/attendance`:
- See all members' attendance for the day
- Mark someone as present/absent
- View weekly/monthly history

---

## 13. Notifications Flow

```
SSE stream established on app load → /api/notifications/sse
  ├─ New notification created server-side → broadcastToUser()
  ├─ Bell icon badge count increments
  ├─ Dropdown shows unread notifications
  ├─ Click notification → navigate to relevant entity
  └─ "Mark all read" → PUT /api/notifications/read-all
```

**Preference flow** at `/settings → Notifications`:
- Toggle: task assigned, task due, task overdue, meeting invite, project update
- Channels: browser / email / WhatsApp
- DND: enable with time window
- Smart filter: minimum priority level
- Digest mode: batch low-priority

---

## 14. Rewards Flow

```
/rewards
  ├─ My Rewards tab
  │    ├─ Hero card: role avatar, point balance, lifetime points
  │    ├─ Earned badges strip
  │    ├─ All badges grid (earned vs locked)
  │    └─ Activity feed (point transactions)
  ├─ Leaderboard tab
  │    ├─ Filter by role (MEMBER / MANAGER / ADMIN)
  │    └─ Top 10 per role with medals (🥇🥈🥉)
  └─ Coupons tab
       ├─ Available coupons list (grayed if insufficient points)
       ├─ "Redeem" button → POST /api/rewards/redeem
       └─ Redemption history
```

---

## 15. Admin Flow

```
/admin (ADMIN/OWNER only)
  ├─ Users tab
  │    ├─ Search users
  │    ├─ Change role (via RoleDropdown)
  │    └─ Create user (POST /api/admin/users)
  ├─ Roles tab
  │    ├─ View all roles (system + custom)
  │    ├─ Create custom role
  │    └─ Delete custom role
  ├─ Permissions tab
  │    ├─ Select role → see permission toggles
  │    ├─ Toggle permissions on/off
  │    └─ Save → PUT /api/admin/roles/[roleId]
  └─ Rewards tab
       ├─ Point rules matrix (action × role)
       ├─ Toggle + set points per cell
       └─ Coupon management (create, toggle active, delete)
```

---

## 16. Client Portal Flow (External, No Auth)

```
Admin: /projects/[projectId]/settings → Enable Client Portal
  ├─ POST /api/projects/[projectId]/client-portal
  ├─ Returns shareable URL: /portal/[token]
  └─ Optional: set password

Client opens /portal/[token]
  ├─ GET /api/portal/[token] → validates token, checks password
  ├─ [Password required] → enter password → re-request
  ├─ [Success] → Project health, task list, timeline (per portal config)
  └─ Read-only — no create/edit actions available
```

---

## 17. Error States

| Scenario | Current Behavior |
|----------|-----------------|
| API fetch fails | Most pages: null render or empty list — no error toast |
| Session expired | Middleware redirects to /login with callbackUrl |
| No organization | Middleware redirects to /create-workspace |
| Permission denied | API returns 403; UI may not handle gracefully [MISSING] |
| AI API error | Error text appended to streaming response `[Error: ...]` |
| Network offline | No offline handling [MISSING] |

---

## 18. Loading States

All major data fetches use one of:
1. **Skeleton loaders** (`skeleton` CSS class with shimmer animation) — Dashboard, Projects list, Kanban, Admin
2. **Spinner** (`animate-spin` border) — inline forms, AI generation buttons
3. **null return** — some pages return null while loading (less ideal)

---

## 19. Empty States

| Page | Empty State |
|------|-------------|
| /projects | "Create your first project" card with + button |
| /tasks | "No tasks yet" with create button |
| /chat | "No messages yet. Start the conversation." |
| /meetings | "No upcoming meetings" with calendar icon |
| /rewards (badges) | "No badges yet" with Lock icon |
| /rewards (coupons) | "No coupons yet" with Gift icon |
| Notifications | "You're all caught up" |
| AI Insights | "Ready to analyze your workspace" with Sparkles icon |
