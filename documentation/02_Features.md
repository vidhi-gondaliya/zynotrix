# ZYNOTRIX — Feature Documentation

This document describes every implemented feature in ZYNOTRIX with purpose, business value, user value, location, inputs/outputs, edge cases, and dependencies.

---

## 1. Kanban Board

**Purpose**: Drag-and-drop task management organized by status column.  
**Location**: `/projects/[projectId]/board`  
**Business Value**: Core product loop — the reason users open the app daily.  
**User Value**: Visual overview of all work, effortless status changes.

**Status Columns** (configurable via `boardConfig` JSON on Project):
- BACKLOG → TODO → IN_PROGRESS → REVIEW → DONE

**Inputs**: Tasks with status, priority, assignee, due date, tags.  
**Outputs**: Reordered tasks with updated `status` and `position` fields.

**Dependencies**: `@dnd-kit/core`, `@dnd-kit/sortable`, `/api/tasks/[taskId]/move`  
**DB Tables**: `tasks`, `task_activities`

**Edge Cases**:
- Moving a task to DONE triggers points award if `RewardConfig` is set
- Position is maintained per-column; tasks sort by `position ASC` within status
- Empty columns show an "Add task" inline form
- Tasks with subtasks cannot be individually dragged until parent is resolved **[INCOMPLETE — subtask blocking not enforced]**

**Limitations**: No swimlane view (by assignee / epic). No WIP limits enforced.

---

## 2. Task List View

**Purpose**: Flat table view of all tasks in a project with sorting and filtering.  
**Location**: `/projects/[projectId]/list`  
**Business Value**: Power users prefer list for bulk operations.  
**User Value**: Quickly scan all tasks, filter by assignee/priority/status.

**Inputs**: Filter params (status, assignee), search query.  
**Outputs**: Filtered, sorted task list.

**Dependencies**: `/api/projects/[projectId]/tasks`  
**DB Tables**: `tasks`

---

## 3. Timeline / Gantt View

**Purpose**: Horizontal timeline showing task start/end dates with project calendar.  
**Location**: `/projects/[projectId]/timeline`  
**Business Value**: Deadline visibility for project managers.  
**User Value**: See what's due when at a glance.

**Dependencies**: `react-big-calendar`  
**DB Tables**: `tasks` (uses `startDate`, `dueDate`)

**Edge Cases**: Tasks without `startDate` or `dueDate` are not shown on timeline.

---

## 4. Sprint Management

**Purpose**: Agile sprint planning — create sprints, assign tasks, track velocity.  
**Location**: `/projects/[projectId]/sprint`  
**Business Value**: Enables scrum-based teams to adopt ZYNOTRIX.  
**User Value**: Time-boxed work planning with goal tracking.

**Inputs**: Sprint name, goal, start/end dates. Tasks dragged into sprint.  
**Outputs**: Sprint with `velocity` field (story points completed).

**APIs**: `GET/POST /api/projects/[projectId]/sprints`, `PUT/DELETE .../[sprintId]`  
**DB Tables**: `sprints`, `sprint_tasks`

**Status Values**: PLANNING → ACTIVE → COMPLETED

---

## 5. Task Dependencies

**Purpose**: Link tasks so one blocks another (BLOCKS relationship).  
**Location**: Task detail modal, sidebar  
**Business Value**: Unblock automated risk alerts when a blocker is overdue.  
**User Value**: "This task can't start until X is done."

**APIs**: `GET/POST/DELETE /api/tasks/[taskId]/dependencies`  
**DB Tables**: `task_dependencies`

**Edge Cases**: Circular dependencies are **[NOT VALIDATED]** at API level. UI does not prevent them.

---

## 6. Custom Fields

**Purpose**: Add project-specific metadata fields to tasks (text, number, select, date, checkbox).  
**Location**: Project settings → Custom Fields; rendered in task detail  
**Business Value**: Adapts ZYNOTRIX to any vertical (client name, invoice number, risk level, etc.).

**Field Types**: TEXT, NUMBER, SELECT, DATE, CHECKBOX  
**APIs**: `GET/POST /api/projects/[projectId]/custom-fields`, `PUT/DELETE .../[fieldId]`, `PUT /api/tasks/[taskId]/custom-fields`  
**DB Tables**: `custom_fields`, `custom_field_values`

---

## 7. Subtasks

**Purpose**: Break a task into smaller sub-items tracked within the same task.  
**Location**: Task detail modal  
**APIs**: `GET/POST /api/tasks/[taskId]/subtasks`  
**DB Tables**: `tasks` (self-relation via `parentTaskId`), `subtask_comments`

---

## 8. Task Comments

**Purpose**: Threaded conversation attached to a specific task.  
**APIs**: `GET/POST /api/tasks/[taskId]/comments`  
**DB Tables**: `comments`

**Real-time**: Comments are not currently pushed via SSE — requires page refresh to see others' comments. **[MISSING: real-time comment push]**

---

## 9. Task Activity Feed

**Purpose**: Immutable audit trail of all changes to a task.  
**Tracked Actions**: created, status_changed, assigned, priority_changed, due_date_changed, commented, subtask_added, title_changed  
**APIs**: `GET /api/tasks/[taskId]/activity`  
**DB Tables**: `task_activities`

---

## 10. Time Logging

**Purpose**: Track time spent on tasks per user.  
**Location**: Task detail → Time tab  
**APIs**: `GET/POST /api/tasks/[taskId]/time`  
**DB Tables**: `time_logs`

**Edge Cases**: Open time logs (no `endedAt`) are not auto-closed on logout. **[MISSING]**

---

## 11. Task Links

**Purpose**: Link tasks to external entities: GitHub PRs, GitHub Issues, Slack messages, Calendar events.  
**APIs**: `GET/POST/DELETE /api/tasks/[taskId]/links`  
**DB Tables**: `task_links`

**Link Types**: GITHUB_PR, GITHUB_ISSUE, SLACK_MESSAGE, CALENDAR_EVENT  
**Status Values**: open, merged, closed, cancelled

---

## 12. AI Natural Language Task Creation

**Purpose**: Create tasks by typing plain English. AI parses the input into structured task fields.  
**Location**: Dashboard → "AI Create Task" button, Command Palette  
**Example**: "Fix the login bug for Sarah by Friday, high priority" → parsed to title/assignee/dueDate/priority  
**Dependencies**: `@anthropic-ai/sdk`, `/api/ai/` routes, `src/lib/nlp-parser.ts`

---

## 13. AI Project Description Generator

**Purpose**: Generate project description from a brief prompt using Claude.  
**Location**: New Project form  
**API**: `POST /api/ai/project-description`

---

## 14. AI Project Template Generator

**Purpose**: Generate a full board template (columns, sample tasks) from a project type description.  
**API**: `POST /api/ai/project-template`

---

## 15. AI Meeting Notes

**Purpose**: Paste raw meeting transcript/notes; AI structures them into agenda, decisions, action items.  
**Location**: Meeting detail → AI Notes panel  
**API**: `POST /api/ai/meeting-notes`  
**DB Tables**: `meetings` (stores `notes`, `actionItems`)

---

## 16. AI Recurring Task Suggestions

**Purpose**: AI analyzes completed tasks and suggests which ones should recur (weekly standup, monthly report, etc.).  
**API**: `POST /api/ai/recurring`

---

## 17. AI Assistant

**Purpose**: Persistent AI chat bubble and dedicated assistant page. Ask anything about your workspace.  
**Location**: Floating bubble (all pages), `/ai/assistant`  
**AI Model**: `claude-opus-4-5` (streaming), `claude-haiku-4-5` (fast mode)  
**API**: `POST /api/ai/assistant`

---

## 18. AI Project Health Scoring

**Purpose**: AI analyzes project metrics and returns a health score (0-100), grade, risks, and recommendations.  
**Location**: `/ai/health`  
**API**: `GET /api/projects/[projectId]/health`  
**DB Tables**: `projects` (stores `healthScore`, `healthData` JSON)

**Health Breakdown**:
- On-time rate
- Budget status (on_track / at_risk / over_budget)
- Team velocity
- Blocker count
- Completion rate

---

## 19. AI Reports Page

**Purpose**: Generate narrative project status reports (team report, client report) using AI.  
**Location**: `/ai/reports`

---

## 20. AI Semantic Search

**Purpose**: Full-text search with AI synthesis. Ask a question, get an answer synthesized from tasks/docs/messages.  
**Location**: `/ai/search`  
**DB Tables**: `search_index` (pre-indexed content)

---

## 21. AI Standup Widget

**Purpose**: Auto-generate daily standup report from user's recent tasks.  
**Location**: Dashboard  
**Component**: `StandupWidget.tsx`

---

## 22. AI Insights (Dashboard)

**Purpose**: On-demand AI analysis of workspace metrics with bullet-point priorities.  
**Location**: Dashboard → AI Insights card  
**Stores**: Saved insights in `ai_insights` table with history browsing

---

## 23. Channel Chat

**Purpose**: Slack-like team messaging organized into named channels.  
**Location**: `/chat`, `/chat/[channelId]`  
**Real-time**: SSE via `/api/channels/[channelId]/sse`  
**Features**: Create channels (public/private), invite members, send messages, real-time delivery  
**DB Tables**: `channels`, `channel_members`, `messages`

---

## 24. Direct Messages

**Purpose**: 1:1 private messaging between team members.  
**Location**: `/messages`, `/messages/[conversationId]`  
**Real-time**: SSE via `/api/conversations/[conversationId]/sse`  
**DB Tables**: `conversations`, `direct_messages`

---

## 25. Meetings

**Purpose**: Schedule, manage, and track team meetings with optional Google Meet links.  
**Location**: `/meetings`, `/meetings/new`  
**Features**: Schedule, set attendees, RSVP, generate Google Meet link, attach AI notes and action items  
**APIs**: `GET/POST /api/meetings`, `PUT/DELETE /api/meetings/[meetingId]`  
**DB Tables**: `meetings`, `meeting_users`

---

## 26. Documents

**Purpose**: Collaborative document editor for project-linked or personal notes.  
**Location**: `/documents`  
**Features**: Create/edit rich-text documents, link to projects, share with specific users (VIEWER/EDITOR roles)  
**APIs**: `GET/POST /api/documents`, `PUT/DELETE /api/documents/[documentId]`, `POST .../share`  
**DB Tables**: `documents`, `document_shares`

---

## 27. Attendance / Punch Clock

**Purpose**: Clock-in/clock-out tracking for remote and hybrid teams.  
**Location**: `/attendance`  
**Component**: `PunchClock.tsx` (persistent in header)  
**Features**: Clock in, clock out, view daily/weekly attendance history, admin view of all users  
**Reward integration**: Clocking in awards attendance points  
**DB Tables**: `attendance_records`

---

## 28. Notifications

**Purpose**: In-app and real-time notification system.  
**Location**: Bell icon in header, `/notifications`  
**Real-time**: SSE via `/api/notifications/sse`  
**Notification Types**: TASK_ASSIGNED, TASK_DUE, TASK_OVERDUE, MEETING_INVITE, MEETING_REMINDER, HEALTH_ALERT, MENTION, COMMENT_ADDED, SYSTEM  
**APIs**: `GET /api/notifications`, `PUT /api/notifications/read-all`, `GET/PUT /api/notifications/preferences`  
**DB Tables**: `notifications`, `notification_preferences`

**Smart Features**:
- Do Not Disturb (time window, all non-URGENT suppressed)
- Smart filtering by minimum priority level
- Digest mode (batch low-priority notifications)
- Per-channel controls (browser / email / WhatsApp)

---

## 29. Gamification — Points & Badges

**Purpose**: Motivate team performance through earned rewards.  
**Location**: `/rewards`  
**Features**:
  - Points earned per configurable action (task_complete, task_early, attendance, streak)
  - Badges awarded on milestone conditions
  - Leaderboard by role
  - Coupon redemption (spend points on real-world rewards)

**DB Tables**: `user_points`, `point_transactions`, `badges`, `user_badges`, `coupons`, `coupon_redemptions`, `reward_configs`

---

## 30. Admin Panel

**Purpose**: Manage users, roles, permissions, rewards, and coupons.  
**Location**: `/admin`  
**Access**: Requires `admin:access` permission (OWNER, ADMIN roles)  
**Tabs**: Users, Roles, Permissions, Rewards

---

## 31. Role-Based Access Control (RBAC)

**Purpose**: Fine-grained permission management per organization.  
**System Roles**: OWNER, ADMIN, MANAGER, MEMBER  
**Custom Roles**: Creatable by ADMIN/OWNER  
**Permissions**: 17 discrete permissions across Projects, Tasks, Users, Collaboration, Attendance, System categories  
**DB Tables**: `roles`

---

## 32. Audit Log

**Purpose**: Immutable record of all significant actions for compliance.  
**Location**: `/audit`  
**DB Tables**: `audit_logs`

---

## 33. Automations

**Purpose**: Rule-based workflow automation (trigger → action).  
**Location**: `/automations`  
**DB Tables**: `automations`, `automation_runs`  
**[Status: UI and model exist but rule execution engine is [INCOMPLETE].]**

---

## 34. Project Templates

**Purpose**: Save and reuse project board configurations.  
**Location**: `/templates`  
**DB Tables**: `project_templates`

---

## 35. Client Portal

**Purpose**: Password-protected, read-only project view for external clients — no account required.  
**Location**: `/portal/[token]`  
**Features**: Show tasks, health score, timeline (configurable per portal)  
**DB Tables**: `client_portals`

---

## 36. Integrations

**Purpose**: Connect ZYNOTRIX to third-party services.  
**Location**: `/integrations`  
**Implemented**:
  - **Slack**: Test connection, receive webhook events
  - **GitHub**: Receive PR/issue webhooks, link to tasks
  - **Google Calendar**: Sync meeting events
  - **WhatsApp**: Test connection (via external provider)
  - **Email**: Receive inbound email webhooks

**DB Tables**: `integrations`, `task_links`, `webhook_logs`

---

## 37. Import / Export

**Purpose**: Bulk import tasks from Excel; export project templates.  
**Location**: `/import-export`  
**Library**: `exceljs`  
**APIs**: `POST /api/projects/[projectId]/import-tasks`, `GET /api/projects/[projectId]/export-template`

---

## 38. Workload View

**Purpose**: See task load per team member across all projects.  
**Location**: `/workload`

---

## 39. Command Palette

**Purpose**: Keyboard-driven universal navigation and action launcher.  
**Trigger**: `Cmd+K` / `Ctrl+K`  
**Features**: Jump to any project, create task, open settings, search

---

## 40. Settings

**Purpose**: User account settings, notification preferences, theme toggle.  
**Location**: `/settings`

---

## 41. Onboarding Wizard

**Purpose**: One-time guided onboarding for first-time users.  
**Trigger**: Shown once per browser (localStorage flag `zynotrix_onboarded`)  
**Location**: Dashboard overlay  
**Component**: `OnboardingWizard.tsx`

---

## 42. Organization Bootstrap

**Purpose**: First-run setup to create the initial organization and seed system data.  
**API**: `POST /api/admin/bootstrap`

---

## 43. Webhook Receiver

**Purpose**: Receive and process inbound webhooks from GitHub, Slack, and email.  
**APIs**: `/api/webhooks/github`, `/api/webhooks/slack`, `/api/webhooks/email`  
**DB Tables**: `webhook_logs`

---

## Feature Summary Table

| Feature | Status | AI | Real-time | Auth Required |
|---------|--------|-----|-----------|---------------|
| Kanban Board | Production | No | No | Yes |
| Task List | Production | No | No | Yes |
| Timeline | Production | No | No | Yes |
| Sprint Management | Beta | No | No | Yes |
| AI Task Creation | Beta | Yes | No | Yes |
| AI Assistant | Beta | Yes | Yes (streaming) | Yes |
| Channel Chat | Production | No | Yes (SSE) | Yes |
| Direct Messages | Production | No | Yes (SSE) | Yes |
| Meetings | Beta | Yes (notes) | No | Yes |
| Documents | Beta | No | No | Yes |
| Attendance | Beta | No | No | Yes |
| Notifications | Production | No | Yes (SSE) | Yes |
| Rewards / Gamification | Beta | No | No | Yes |
| Admin Panel | Production | No | No | Yes (Admin) |
| Client Portal | Beta | No | No | No (token) |
| Automations | Alpha | No | No | Yes |
| Import / Export | Beta | No | No | Yes |
