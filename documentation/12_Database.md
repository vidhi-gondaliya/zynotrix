# ZYNOTRIX — Database Documentation

**Database**: PostgreSQL (Neon serverless)  
**ORM**: Prisma 5.22.0  
**Schema file**: `prisma/schema.prisma`

---

## Entity Relationship Overview

```
Organization ─────────┬─── OrganizationMember ── User
                      ├─── Project ──────────────┬─── Task ──────────┬─── Comment
                      │                          │                   ├─── TaskActivity
                      │                          │                   ├─── TaskAssignee
                      │                          │                   ├─── SubtaskComment
                      │                          │                   ├─── TimeLog
                      │                          │                   ├─── SprintTask
                      │                          │                   ├─── TaskDependency
                      │                          │                   ├─── TaskLink
                      │                          │                   └─── CustomFieldValue
                      │                          ├─── Sprint
                      │                          ├─── CustomField
                      │                          ├─── ClientPortal
                      │                          ├─── ProjectMember
                      │                          ├─── Meeting
                      │                          └─── Document
                      ├─── Channel ─────────────── ChannelMember + Message
                      ├─── Role
                      ├─── RewardConfig
                      ├─── Badge ────────────────── UserBadge
                      ├─── Coupon ───────────────── CouponRedemption
                      ├─── AuditLog
                      ├─── Automation ─────────── AutomationRun
                      ├─── Integration
                      ├─── SearchIndex
                      ├─── ProjectTemplate
                      ├─── Meeting ─────────────── MeetingUser
                      └─── AttendanceRecord

User ─────────────────┬─── Account (OAuth)
                      ├─── Session
                      ├─── Notification
                      ├─── NotificationPreference
                      ├─── AIInsight
                      ├─── UserPoints ─────────── PointTransaction
                      ├─── Conversation (user1/user2)
                      └─── DirectMessage
```

---

## Models

### Organization

**Table**: `organizations`

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | String | PK, CUID | Unique org identifier |
| name | String | NOT NULL | Display name |
| slug | String | UNIQUE, NOT NULL | URL-safe org identifier |
| logo | String? | Optional | Logo URL |
| plan | String | DEFAULT "FREE" | Subscription plan |
| createdAt | DateTime | DEFAULT now() | Creation timestamp |
| updatedAt | DateTime | @updatedAt | Last update |

**Relationships**: Has many Members, Projects, Channels, Roles, RewardConfigs, Badges, Coupons, AuditLogs, Automations, Integrations, SearchIndices, ProjectTemplates, Meetings, AttendanceRecords.

---

### User

**Table**: `users`

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | String | PK, CUID | User ID |
| email | String | UNIQUE, NOT NULL | Primary identifier |
| name | String? | Optional | Display name |
| image | String? | Optional | Avatar URL |
| passwordHash | String? | Optional | bcrypt hash (null for OAuth users) |
| role | String | DEFAULT "MEMBER" | System role |
| createdAt | DateTime | DEFAULT now() | |
| updatedAt | DateTime | @updatedAt | |

**Relationships**: Has Accounts, Sessions, ownedProjects, assignedTasks, createdTasks, taskAssignments, projectMembers, messages, comments, etc.

---

### Account

**Table**: `accounts`

NextAuth OAuth account table.

| Column | Type | Constraints |
|--------|------|-------------|
| id | String | PK, CUID |
| userId | String | FK → users.id CASCADE |
| type | String | e.g. "oauth" |
| provider | String | e.g. "google" |
| providerAccountId | String | Google user ID |
| refresh_token | String? | |
| access_token | String? | |
| expires_at | Int? | |
| id_token | String? | |

**Unique**: `[provider, providerAccountId]`

---

### Session

**Table**: `sessions`

NextAuth database session (used when session strategy = "database"). **[NOTE: Auth config uses JWT, so this table may be unused]**

| Column | Type |
|--------|------|
| sessionToken | String, UNIQUE |
| userId | String, FK → users |
| expires | DateTime |

---

### Project

**Table**: `projects`

| Column | Type | Default | Description |
|--------|------|---------|-------------|
| id | String | CUID | |
| name | String | | Project name |
| description | String? | | Optional description |
| status | String | "ACTIVE" | ACTIVE, ON_HOLD, COMPLETED, ARCHIVED |
| color | String | "#7C3AED" | Hex color for project avatar |
| icon | String? | | Emoji icon |
| deadline | DateTime? | | Project deadline |
| budget | Float? | | Total budget |
| budgetSpent | Float? | 0 | Amount spent |
| clientName | String? | | Client display name |
| clientEmail | String? | | Client email |
| healthScore | Float? | | Last AI health score |
| healthData | String? | | JSON: full health breakdown |
| boardConfig | String? | | JSON: column configuration |
| isPersonal | Boolean | false | Personal project flag |
| ownerId | String | | FK → users.id |
| organizationId | String | | FK → organizations.id CASCADE |
| createdAt | DateTime | now() | |
| updatedAt | DateTime | @updatedAt | |

---

### Task

**Table**: `tasks`

| Column | Type | Default | Description |
|--------|------|---------|-------------|
| id | String | CUID | |
| projectId | String | | FK → projects.id CASCADE |
| title | String | | Task title |
| description | String? | | Rich text description |
| status | String | "BACKLOG" | BACKLOG, TODO, IN_PROGRESS, REVIEW, DONE |
| priority | String | "MEDIUM" | LOW, MEDIUM, HIGH, URGENT |
| position | Int | 0 | Sort order within column |
| parentTaskId | String? | | Self-FK for subtasks |
| assigneeId | String? | | Primary assignee |
| creatorId | String | | FK → users.id |
| dueDate | DateTime? | | Due date |
| startDate | DateTime? | | Start date |
| estimatedHours | Float? | | Time estimate |
| storyPoints | Int? | | Agile story points |
| timeSpentMin | Int | 0 | Total minutes logged |
| recurrenceRule | String? | | RRULE string for recurring |
| tags | String | "[]" | JSON array of tag strings |
| createdAt | DateTime | now() | |
| updatedAt | DateTime | @updatedAt | |

**Indexes**: `[projectId, status]`, `[assigneeId]`, `[dueDate]`, `[updatedAt]`, `[createdAt]`

---

### Sprint

**Table**: `sprints`

| Column | Type | Default | Description |
|--------|------|---------|-------------|
| id | String | CUID | |
| projectId | String | | FK → projects.id CASCADE |
| name | String | | Sprint name |
| goal | String? | | Sprint goal |
| startDate | DateTime | | |
| endDate | DateTime | | |
| status | String | "PLANNING" | PLANNING, ACTIVE, COMPLETED |
| velocity | Int? | | Completed story points |

---

### CustomField

**Table**: `custom_fields`

| Column | Type | Description |
|--------|------|-------------|
| id | String | CUID |
| projectId | String | FK |
| name | String | Field label |
| type | String | TEXT, NUMBER, SELECT, DATE, CHECKBOX |
| options | String? | JSON array (for SELECT type) |
| isRequired | Boolean | |
| position | Int | Sort order |

---

### Channel

**Table**: `channels`

| Column | Type | Default |
|--------|------|---------|
| id | String | CUID |
| name | String | |
| description | String? | |
| isGeneral | Boolean | false |
| isPrivate | Boolean | false |
| organizationId | String | FK → organizations.id CASCADE |

**Index**: `[organizationId]`

---

### Message

**Table**: `messages`

| Column | Type | Default |
|--------|------|---------|
| id | String | CUID |
| channelId | String | FK → channels.id CASCADE |
| authorId | String | FK → users.id |
| content | String | |
| type | String | "TEXT" |
| metadata | String? | JSON |
| createdAt | DateTime | now() |

**Index**: `[channelId, createdAt]`

---

### Meeting

**Table**: `meetings`

| Column | Type | Description |
|--------|------|-------------|
| id | String | CUID |
| title | String | |
| description | String? | |
| startTime | DateTime | |
| endTime | DateTime | |
| googleMeetUrl | String? | Auto-generated Meet link |
| googleEventId | String? | Calendar event ID |
| status | String | SCHEDULED, IN_PROGRESS, COMPLETED, CANCELLED |
| notes | String? | AI-structured notes |
| actionItems | String? | JSON array |
| projectId | String? | Optional project link |
| organizerId | String | FK → users.id |
| organizationId | String | FK → organizations.id CASCADE |

---

### Notification

**Table**: `notifications`

| Column | Type | Default | Description |
|--------|------|---------|-------------|
| id | String | CUID | |
| userId | String | | FK → users.id CASCADE |
| type | String | | TASK_ASSIGNED, TASK_DUE, TASK_OVERDUE, MEETING_INVITE, MEETING_REMINDER, HEALTH_ALERT, MENTION, COMMENT_ADDED, SYSTEM |
| title | String | | Short notification text |
| body | String? | | Extended description |
| data | String? | | JSON: { taskId, projectId, etc. } |
| isRead | Boolean | false | |
| createdAt | DateTime | now() | |

**Index**: `[userId, isRead]`

---

### Document

**Table**: `documents`

| Column | Type | Default |
|--------|------|---------|
| id | String | CUID |
| title | String | |
| content | String | Rich text / markdown |
| projectId | String? | Optional project link |
| taskId | String? | Optional task link |
| authorId | String | FK → users.id |
| isPersonal | Boolean | false |

---

### AttendanceRecord

**Table**: `attendance_records`

| Column | Type | Default | Description |
|--------|------|---------|-------------|
| id | String | CUID | |
| userId | String | | FK |
| organizationId | String | | FK |
| date | DateTime | | Date of record |
| clockIn | DateTime? | | Clock-in timestamp |
| clockOut | DateTime? | | Clock-out timestamp |
| status | String | "PRESENT" | PRESENT, ABSENT, LATE, HALF_DAY |
| notes | String? | | Admin notes |

**Unique**: `[userId, organizationId, date]` — one record per user per day.

---

### Conversation & DirectMessage

**Table**: `conversations` + `direct_messages`

`Conversation` is a pair of users (user1Id, user2Id). Unique `[user1Id, user2Id]` constraint ensures no duplicate conversations.

`DirectMessage`: individual messages within a conversation.

---

### RewardConfig

**Table**: `reward_configs`

| Column | Type | Description |
|--------|------|-------------|
| id | String | CUID |
| organizationId | String | FK |
| role | String | e.g. "MEMBER" |
| action | String | e.g. "task_complete" |
| points | Int | Points to award |
| isEnabled | Boolean | Toggle |

**Unique**: `[organizationId, role, action]`

---

### UserPoints

**Table**: `user_points`

| Column | Type | Description |
|--------|------|-------------|
| id | String | |
| userId | String | UNIQUE, FK |
| balance | Int | Current spendable balance |
| lifetime | Int | Total ever earned |

---

### Badge

**Table**: `badges`

| Column | Type | Description |
|--------|------|-------------|
| id | String | |
| organizationId | String | |
| name | String | Internal name |
| label | String | Display name |
| description | String | |
| icon | String | DEFAULT "🏆" — emoji |
| roleScope | String? | Restrict to role |
| conditionType | String | points_lifetime, tasks_done, attendance_streak |
| conditionValue | Int | Threshold number |
| conditionAction | String? | Specific action type |
| isSystem | Boolean | Cannot be deleted |

---

### Role (RBAC)

**Table**: `roles`

| Column | Type | Description |
|--------|------|-------------|
| id | String | |
| organizationId | String | |
| name | String | Internal key (e.g. "MANAGER") |
| label | String | Display name |
| color | String | DEFAULT "#6B7280" |
| description | String? | |
| permissions | String | JSON array of permission IDs |
| isSystem | Boolean | System roles can't be deleted |

---

### Automation

**Table**: `automations`

| Column | Type | Description |
|--------|------|-------------|
| id | String | |
| organizationId | String | |
| name | String | |
| rule | String | JSON rule definition |
| trigger | String | e.g. "task_status_changed" |
| action | String | e.g. "notify_assignee" |
| isActive | Boolean | |
| runCount | Int | |
| lastRunAt | DateTime? | |

---

### SearchIndex

**Table**: `search_index`

| Column | Type | Description |
|--------|------|-------------|
| id | String | |
| sourceType | String | TASK, DOCUMENT, MESSAGE |
| sourceId | String | UNIQUE, FK to source entity |
| content | String | Concatenated searchable text |
| projectId | String? | |
| authorId | String? | |
| organizationId | String? | |

---

### AuditLog

**Table**: `audit_logs`

| Column | Type | Description |
|--------|------|-------------|
| id | String | |
| userId | String | Who did it |
| organizationId | String | |
| action | String | e.g. "created", "updated", "deleted" |
| entityType | String | e.g. "Task", "Project" |
| entityId | String | |
| changes | String? | JSON diff |
| createdAt | DateTime | |

**Indexes**: `[entityType, entityId]`, `[userId]`, `[organizationId]`, `[createdAt]`

---

### Integration

**Table**: `integrations`

| Column | Type | Description |
|--------|------|-------------|
| id | String | |
| userId | String | FK |
| organizationId | String | FK |
| type | String | slack, github, google-calendar, whatsapp, email |
| config | String | JSON: tokens, webhooks, settings |
| isActive | Boolean | |

**Unique**: `[organizationId, type]` — one per org per integration type.

---

### TaskLink

**Table**: `task_links`

| Column | Type | Description |
|--------|------|-------------|
| id | String | |
| taskId | String | FK |
| type | String | GITHUB_PR, GITHUB_ISSUE, SLACK_MESSAGE, CALENDAR_EVENT |
| externalId | String | External identifier |
| url | String | Link to external resource |
| title | String? | Display title |
| status | String? | open, merged, closed, cancelled |
| meta | String? | JSON extra data |

---

### WebhookLog

**Table**: `webhook_logs`

| Column | Type | Description |
|--------|------|-------------|
| id | String | |
| source | String | github, slack, email |
| event | String | Event type string |
| payload | String | Raw JSON payload |
| status | String | received, processed, failed |

---

## Indexes Summary

| Table | Indexed Columns | Purpose |
|-------|----------------|---------|
| tasks | `[projectId, status]` | Kanban column queries |
| tasks | `[assigneeId]` | "My tasks" filter |
| tasks | `[dueDate]` | Upcoming tasks query |
| tasks | `[updatedAt]`, `[createdAt]` | Recent tasks |
| messages | `[channelId, createdAt]` | Channel history |
| notifications | `[userId, isRead]` | Unread count |
| point_transactions | `[userId, createdAt]`, `[userId, action]` | Points history |
| search_index | `[sourceType, projectId]`, `[organizationId]` | Search queries |
| audit_logs | `[entityType, entityId]`, `[userId]`, `[organizationId]`, `[createdAt]` | Audit queries |
| attendance_records | `[userId]`, `[organizationId]` | Attendance views |

---

## Data Integrity Notes

1. All organizations cascade-delete their children (projects, channels, members, etc.)
2. All projects cascade-delete their tasks
3. All tasks cascade-delete comments, activities, subtasks, time logs
4. Users cascade-delete their owned records
5. Tags on tasks are stored as JSON string `"[]"` — parsed on read in API routes
6. The `permissions` field on `Role` is a JSON string array — parsed/serialized in API
7. `healthData`, `boardConfig`, `rule`, `config` — all JSON-as-string fields (no Prisma Json type used)

---

## Example Records

### Task
```json
{
  "id": "cls7abc123",
  "title": "Design landing page hero",
  "status": "IN_PROGRESS",
  "priority": "HIGH",
  "position": 0,
  "tags": "[\"design\",\"urgent\"]",
  "projectId": "cls7xyz456",
  "assigneeId": "cls7user789",
  "dueDate": "2025-02-01T00:00:00.000Z",
  "createdAt": "2025-01-15T10:00:00.000Z"
}
```

### RewardConfig
```json
{
  "organizationId": "org123",
  "role": "MEMBER",
  "action": "task_complete",
  "points": 10,
  "isEnabled": true
}
```
