# ZYNOTRIX — API Documentation

All API routes use Next.js App Router Route Handlers (`src/app/api/`).  
All routes requiring authentication use `requireOrg()` or `auth()` from NextAuth.  
All routes are REST. No GraphQL.

**Base URL**: `https://your-domain.com/api`  
**Auth**: Session cookie (NextAuth JWT). No Bearer token support for external calls.  
**Content-Type**: `application/json` (unless noted otherwise)

---

## Authentication

### `POST /api/auth/register`
Register a new user.

**Auth Required**: No  
**Request Body**:
```json
{
  "name": "Jane Smith",
  "email": "jane@example.com",
  "password": "securepassword123"
}
```
**Response 201**: `{ "id", "email", "name" }`  
**Response 409**: `{ "error": "Email already in use" }`

---

### `GET/POST /api/auth/[...nextauth]`
NextAuth catch-all handler. Handles login, logout, OAuth callbacks.  
**Auth Required**: No  
**Managed by**: NextAuth v5 (Auth.js)

---

## Organizations

### `POST /api/organizations`
Create a new organization (workspace).

**Auth Required**: Yes (user must be logged in, no org yet)  
**Request Body**:
```json
{ "name": "Acme Inc", "slug": "acme-inc" }
```
**Response 201**: Organization object + session update.

---

## Projects

### `GET /api/projects`
List all non-archived, non-personal projects for the current org.

**Auth Required**: Yes + Org  
**Response 200**:
```json
[
  {
    "id": "cuid...",
    "name": "Website Redesign",
    "description": "...",
    "status": "ACTIVE",
    "color": "#7C3AED",
    "deadline": "2025-12-31T00:00:00.000Z",
    "budget": 50000,
    "ownerId": "cuid...",
    "owner": { "id", "name", "email", "image" },
    "_count": { "tasks": 15 }
  }
]
```

---

### `POST /api/projects`
Create a new project.

**Auth Required**: Yes + Org  
**Request Body**:
```json
{
  "name": "New Project",
  "description": "Optional description",
  "status": "ACTIVE",
  "color": "#7C3AED",
  "deadline": "2025-12-31",
  "budget": 10000,
  "clientName": "Client Corp",
  "clientEmail": "client@corp.com",
  "boardConfig": "{}"
}
```
**Response 201**: Full project object.

---

### `GET /api/projects/[projectId]`
Get single project details.

**Auth Required**: Yes + Org  
**Response 200**: Project with members, tasks count, sprints.

---

### `PUT /api/projects/[projectId]`
Update project.

**Auth Required**: Yes + Org  
**Request Body**: Any subset of project fields.  
**Response 200**: Updated project.

---

### `DELETE /api/projects/[projectId]`
Delete project and all associated data (cascade).

**Auth Required**: Yes + Org (OWNER/ADMIN role recommended)  
**Response 200**: `{ "success": true }`

---

### `GET /api/projects/[projectId]/tasks`
Get all tasks for a project.

**Auth Required**: Yes  
**Query Params**: `?status=IN_PROGRESS`  
**Response 200**: Array of tasks with assignee, creator, comment count, tags parsed from JSON.

---

### `POST /api/projects/[projectId]/tasks`
Create a task in a project.

**Auth Required**: Yes  
**Request Body**:
```json
{
  "title": "Fix login bug",
  "description": "Optional",
  "status": "BACKLOG",
  "priority": "HIGH",
  "assigneeId": "cuid...",
  "dueDate": "2025-12-01",
  "estimatedHours": 4,
  "tags": ["bug", "auth"]
}
```
**Response 201**: Task object.  
**Side effects**: Logs activity, sends notification to assignee (if different from creator), indexes in `search_index`.

---

### `GET /api/projects/[projectId]/health`
AI-generated project health score.

**Auth Required**: Yes + Org  
**Response 200**:
```json
{
  "score": 78,
  "grade": "B",
  "summary": "Project is mostly on track with minor risks.",
  "breakdown": {
    "onTimeRate": 80,
    "budgetStatus": "on_track",
    "teamVelocity": 75,
    "blockerCount": 2,
    "completionRate": 65
  },
  "risks": ["2 tasks are blocked"],
  "recommendations": ["Review blocker tasks this week"]
}
```

---

### `GET /api/projects/[projectId]/sprints`
List all sprints for a project.

### `POST /api/projects/[projectId]/sprints`
Create a new sprint.

**Request Body**:
```json
{
  "name": "Sprint 1",
  "goal": "Launch MVP",
  "startDate": "2025-01-01",
  "endDate": "2025-01-14"
}
```

### `PUT /api/projects/[projectId]/sprints/[sprintId]`
Update sprint (add tasks, change status, set velocity).

### `DELETE /api/projects/[projectId]/sprints/[sprintId]`
Delete sprint.

---

### `GET/POST /api/projects/[projectId]/custom-fields`
Manage custom fields for a project.

### `PUT/DELETE /api/projects/[projectId]/custom-fields/[fieldId]`
Update or delete a specific custom field.

---

### `GET/POST /api/projects/[projectId]/client-portal`
Manage the client portal for a project.

**POST Request Body**:
```json
{
  "showTasks": true,
  "showHealth": true,
  "showTimeline": false,
  "password": "optional"
}
```
**Response**: Portal object with `token` (used in `/portal/[token]` URL).

---

### `GET /api/projects/[projectId]/export-template`
Export project board config as a reusable template (Excel or JSON).

### `POST /api/projects/[projectId]/import-tasks`
Import tasks from Excel file upload.

---

## Tasks

### `PATCH /api/tasks/[taskId]/move`
Move task to new status/position (used by Kanban drag-drop).

**Request Body**:
```json
{ "status": "IN_PROGRESS", "position": 2 }
```
**Response 200**: Updated task.

---

### `GET /api/tasks/[taskId]/comments`
Get all comments on a task.

### `POST /api/tasks/[taskId]/comments`
Add a comment.

**Request Body**: `{ "content": "This needs more context." }`

---

### `GET /api/tasks/[taskId]/subtasks`
Get subtasks.

### `POST /api/tasks/[taskId]/subtasks`
Create a subtask.

---

### `GET /api/tasks/[taskId]/activity`
Get task activity feed (audit trail).

---

### `GET/POST /api/tasks/[taskId]/assignees`
Get or add assignees (multi-assignee support).

---

### `GET/POST/DELETE /api/tasks/[taskId]/dependencies`
Manage task dependencies (BLOCKS relationship).

---

### `GET/POST /api/tasks/[taskId]/time`
Log time on a task.

**POST Request Body**:
```json
{
  "startedAt": "2025-01-15T09:00:00Z",
  "endedAt": "2025-01-15T11:00:00Z",
  "duration": 120,
  "description": "Worked on auth flow"
}
```

---

### `GET/POST /api/tasks/[taskId]/links`
Manage external links (GitHub PR, Slack message, etc.).

---

### `PUT /api/tasks/[taskId]/custom-fields`
Set custom field values for a task.

---

### `GET /api/tasks/[taskId]/subtask-comments`
Get comments on subtasks.

---

### `GET /api/tasks/upcoming`
Get tasks due today and tomorrow for the current user.

**Response 200**:
```json
{
  "today": [{ task with project }],
  "tomorrow": [{ task with project }]
}
```

---

## Channels (Chat)

### `GET /api/channels`
List channels the current user is a member of.

### `POST /api/channels`
Create a channel.

**Request Body**:
```json
{
  "name": "design",
  "description": "Design team discussions",
  "isPrivate": false
}
```

### `GET /api/channels/[channelId]/messages`
Get messages for a channel (most recent 50).

### `POST /api/channels/[channelId]/messages`
Send a message.

**Request Body**: `{ "content": "Hello team!" }`  
**Side effects**: `broadcastToChannel()` pushes message to all SSE subscribers.

### `GET /api/channels/[channelId]/sse`
Open SSE stream for real-time channel messages.

**Response**: `text/event-stream`  
**Events**: `data: { type: "message", payload: Message }\n\n`

### `GET/POST /api/channels/[channelId]/members`
View or add channel members.

---

## Conversations (Direct Messages)

### `GET /api/conversations`
List all DM conversations for the current user.

### `POST /api/conversations`
Create or find a conversation with another user.

**Request Body**: `{ "userId": "other-user-id" }`

### `GET /api/conversations/[conversationId]/messages`
Get DM history.

### `POST /api/conversations/[conversationId]/messages`
Send a DM.

### `GET /api/conversations/[conversationId]/sse`
SSE stream for real-time DM delivery.

---

## Meetings

### `GET /api/meetings`
List all meetings in the org.

### `POST /api/meetings` (via `/api/meetings` route)
Create a meeting.

**Request Body**:
```json
{
  "title": "Sprint Review",
  "description": "Q1 sprint review",
  "startTime": "2025-01-15T14:00:00Z",
  "endTime": "2025-01-15T15:00:00Z",
  "attendeeIds": ["userId1", "userId2"],
  "projectId": "optional",
  "generateMeetLink": true
}
```

### `PUT /api/meetings/[meetingId]`
Update meeting (notes, action items, status, attendees).

### `DELETE /api/meetings/[meetingId]`
Cancel a meeting.

---

## Notifications

### `GET /api/notifications`
Get unread + recent notifications for current user.

### `PUT /api/notifications/read-all`
Mark all notifications as read.

### `GET /api/notifications/sse`
SSE stream for real-time notification push.

### `GET/PUT /api/notifications/preferences`
Get or update notification preference settings.

---

## Documents

### `GET /api/documents`
List accessible documents (authored + shared).

### `POST /api/documents`
Create a document.

### `GET/PUT/DELETE /api/documents/[documentId]`
Get, update, or delete a document.

### `POST /api/documents/[documentId]/share`
Share document with a user.

**Request Body**: `{ "userId": "...", "role": "VIEWER" | "EDITOR" }`

---

## Attendance

### `POST /api/attendance/clock-in`
Record clock-in for current user.

### `POST /api/attendance/clock-out`
Record clock-out for current user.

### `GET /api/attendance`
Get attendance history (own or all for admin).

---

## Admin

### `GET /api/admin/users`
List all org users.

### `POST /api/admin/users`
Create a user in the org.

### `PUT /api/admin/users/[userId]/role`
Update user's org role.

### `GET /api/admin/roles`
List all roles in org.

### `POST /api/admin/roles`
Create a custom role.

### `PUT /api/admin/roles/[roleId]`
Update role (name, color, permissions array).

### `DELETE /api/admin/roles/[roleId]`
Delete a custom role.

### `GET/PUT /api/admin/rewards`
Get or update reward point configurations.

### `GET/POST /api/admin/coupons`
List or create coupons.

### `PUT/DELETE /api/admin/coupons/[couponId]`
Update or delete a coupon.

### `POST /api/admin/bootstrap`
Initialize org with default roles and reward configs (first-run).

---

## Rewards

### `GET /api/rewards`
Get current user's rewards data (points, badges, coupons, leaderboard).

### `POST /api/rewards/redeem`
Redeem a coupon.

**Request Body**: `{ "couponId": "..." }`  
**Response**: `{ "message": "Coupon redeemed!" }` or `{ "error": "Insufficient points" }`

---

## AI

### `POST /api/ai/assistant`
Chat with the AI assistant (streaming).

**Request Body**:
```json
{
  "messages": [{ "role": "user", "content": "What tasks are overdue?" }]
}
```
**Response**: `text/plain` streaming (token-by-token).

### `POST /api/ai/project-description`
Generate project description.

**Request Body**: `{ "name": "Website Redesign", "type": "web" }`

### `POST /api/ai/project-template`
Generate board template.

### `POST /api/ai/meeting-notes`
Structure meeting notes.

### `POST /api/ai/recurring`
Suggest recurring tasks.

### `GET /api/ai/insights`
Get saved AI insights for current user.

### `POST /api/ai/insights`
Save an AI insight.

---

## Dashboard

### `GET /api/dashboard`
Aggregated dashboard data (replaces separate analytics + alerts calls).

**Response 200**:
```json
{
  "totalTasks": 45,
  "activeTasks": 12,
  "completedTasks": 28,
  "overdueTasks": 3,
  "reviewTasks": 5,
  "completionRate": 62,
  "activeProjects": 4,
  "tasksByStatus": { "BACKLOG": 5, "TODO": 7, "IN_PROGRESS": 12, "REVIEW": 5, "DONE": 16 },
  "taskTrend": [{ "date": "Jan 1", "completed": 3, "created": 5 }],
  "teamActivity": [{ "name": "Jane", "tasks": 8 }],
  "recentTasks": [...],
  "upcomingMeetings": [...],
  "alerts": [{ "title": "...", "severity": "critical" }]
}
```

---

## Portal

### `GET /api/portal/[token]`
Public endpoint (no auth) for client portal.

**Query Params**: `?password=secret` (if portal has password set)  
**Response 200**: Project data (tasks, health, timeline) per portal config.  
**Response 401**: Password required or incorrect.  
**Response 404**: Token not found or portal inactive.

---

## Automations

### `GET /api/automations`
List org automations.

### `POST /api/automations`
Create an automation rule.

### `PUT/DELETE /api/automations/[automationId]`
Update or delete an automation.

---

## Integrations

### `GET /api/integrations/slack/test`
Test Slack webhook connection.

### `GET /api/integrations/google-calendar/sync`
Sync meetings to Google Calendar.

### `GET /api/integrations/whatsapp/test`
Test WhatsApp connection.

---

## Webhooks (Inbound)

### `POST /api/webhooks/github`
Receive GitHub webhook events (push, PR, issues).

### `POST /api/webhooks/slack`
Receive Slack event subscriptions.

### `POST /api/webhooks/email`
Receive inbound email events.

---

## Attachments

### `POST /api/attachments`
Upload a file attachment.

### `DELETE /api/attachments/[attachmentId]`
Delete an attachment.

---

## Common Response Patterns

### Success
```json
HTTP 200 OK
{ "data": "..." }
```

### Created
```json
HTTP 201 Created
{ "id": "...", "...": "..." }
```

### Unauthorized
```json
HTTP 401 Unauthorized
{ "error": "Unauthorized" }
```

### Forbidden (no org)
```json
HTTP 403 Forbidden
{ "error": "No workspace. Please create or join a workspace." }
```

### Not Found
```json
HTTP 404 Not Found
{ "error": "Not found" }
```

### Server Error
```json
HTTP 500 Internal Server Error
{ "error": "Internal server error" }
```

---

## Rate Limiting

**[MISSING]** — No rate limiting is implemented at the API level. Vercel's edge limits apply but no application-level throttling.
