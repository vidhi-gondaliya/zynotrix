# ZYNOTRIX — Copywriting Guide

## Brand Voice

### Core Personality
ZYNOTRIX speaks like a **senior engineer who is also a product thinker**. The voice is:
- **Direct** — no corporate fluff, no padding
- **Confident** — opinionated, never hedging
- **Smart** — aware of the user's sophistication
- **Occasionally witty** — a dry smile, never a joke

### What ZYNOTRIX is NOT
- Cheerful to the point of feeling fake ("You're doing amazing! 🎉")
- Apologetic for limitations ("We're sorry, but we can't...")
- Vague or buzzword-heavy ("Leverage synergistic workflows to unlock team potential")
- Robotic ("Error 403: Access denied.")

---

## Voice Spectrum

| Avoid | Prefer |
|-------|--------|
| "Leverage our AI-powered platform" | "Let the AI handle your standup report" |
| "We're sorry for the inconvenience" | "Something went wrong. Let's fix it." |
| "Your task has been successfully created!" | "Task created." |
| "Unlock the power of team collaboration" | "Your team, in one place" |
| "Please fill in all required fields" | "Name and project are required." |
| "Oops! That didn't work." | "Couldn't save changes — try again." |

---

## UI Copy Patterns

### Empty States

Empty states should be direct and invite action — not apologetic.

```
// Task list — empty
No tasks yet.
[+ Add your first task]

// Chat channel — empty
No messages in #general.
Say something. →

// Notifications — empty
You're all caught up.
```

Never:
```
// Bad
Wow, nothing to see here! Your task list is looking a little lonely.
Start by creating your first task to get the ball rolling! 🎯
```

---

### Loading States

Short, lowercase, no punctuation:
```
Loading tasks...
Generating report...
Asking AI...
Saving changes...
```

Never:
```
Please wait while we load your tasks for you...
Our AI is thinking hard about your request!
```

---

### Success Messages (Toast Notifications)

Keep them short. Don't celebrate — confirm.
```
Task created.
Changes saved.
Member invited.
Role updated.
Project archived.
```

Not:
```
Woohoo! Your task has been successfully created. Great job getting started!
```

---

### Error Messages

Error messages must:
1. State what happened (not "Something went wrong")
2. Give the user a clear next action
3. Not blame the user

```
// Good
Couldn't save task — check your connection and try again.

// Good
Invitation failed. That email may already have an account.

// Good
Session expired. Sign in again to continue.
```

Never:
```
// Bad — vague
An error occurred. Please try again later.

// Bad — technical
Error 500: Internal Server Error. POST /api/tasks failed.

// Bad — blaming user
You entered an invalid email address.
```

---

### Confirmation Dialogs

Be specific about what will be deleted. Use the item's name.

```
// Good
Delete "Q4 Marketing Sprint"?
This will permanently remove the sprint and all its tasks. This cannot be undone.

[Cancel]  [Delete sprint]

// Bad
Are you sure you want to delete this item?

[No]  [Yes, delete]
```

The destructive action button should echo the verb in the warning text:
- Warning says "This will permanently remove" → button says "Delete sprint"
- Warning says "This will archive" → button says "Archive project"

---

### Button Copy

Buttons must be verb-first and specific:
```
// Good
Create project
Add member
Generate report
Move to Done
Archive sprint

// Bad
Submit
OK
Confirm
Yes
Proceed
```

---

### Placeholder Text

Placeholders should be instructive examples, not vague labels:
```
// Input: task title
e.g., "Fix login redirect bug"

// Input: project name
e.g., "Product Rebrand Q4"

// Input: message
Message #general...

// Input: search
Search tasks, projects, and people...
```

---

### Tooltip Copy

Tooltips clarify what a feature does — not what the button says. Be specific.
```
// Icon button for "Archive"
Tooltip: "Archive this project. It stays accessible but won't appear in active views."

// "Health Score" info icon
Tooltip: "AI-generated score based on task completion rate, overdue items, and budget."

// "Generate Report" button
Tooltip: "Ask Claude AI to write a plain-English project summary from your current data."
```

---

## AI-Specific Copy

When AI is generating content, use passive, present-tense language:

```
// Loading
Analyzing project data...
Writing your standup...
Scoring project health...

// Error
Couldn't reach AI — your API key may be invalid or rate-limited.

// Result header
AI Health Score (generated just now)
AI Standup Summary — Thursday, Jan 23
```

Never anthropomorphize the AI beyond what's useful:
```
// Avoid
Claude is thinking about your project...
Our AI is excited to help!
```

---

## Gamification Copy

For rewards/points language, be direct and motivating without being cloying:

```
// Badge earned
New badge: "Sprint Finisher"
Complete 5 sprints on time. Done.

// Points awarded
+50 pts — task completed early

// Leaderboard
This week's top contributors ↑
```

Not:
```
Amazing work! You just earned the "Sprint Finisher" badge! Keep it up, champion! 🏆✨
```

---

## Error Copy by Category

### Authentication Errors
```
Invalid email or password.                    // Wrong credentials
Your session has expired. Sign in again.      // JWT expired
Access denied. You don't have permission.     // 403 — insufficient role
Workspace not found. Create one to continue.  // No org
```

### API/Network Errors
```
Couldn't save changes — check your connection.
Request timed out. Try again in a moment.
Too many requests. Wait a minute before trying again.
```

### Validation Errors
```
Task name is required.
Due date must be in the future.
Email is already in use.
Password must be at least 8 characters.
```

---

## Naming Conventions

Use consistent, simple terminology across all copy:

| Concept | ZYNOTRIX Term | NOT |
|---------|--------------|-----|
| Kanban board | "Board" | Kanban, kanban view |
| Work items | "Tasks" | Issues, tickets, cards |
| Organization | "Workspace" | Tenant, organization, team, company |
| Group chat | "Channel" | Room, thread, space |
| 1-to-1 chat | "Direct message" or "DM" | Private message |
| Project space | "Project" | Initiative, epic |
| AI assistant | "AI" or "Claude" | Bot, chatbot, assistant |
| Sprint | "Sprint" | Iteration, cycle, milestone |
| User rank | "Role" | Level, tier, permission level |

---

## Microcopy — Navigation

Sidebar and nav labels should be single nouns or noun-phrases:
```
Dashboard
Projects
My Tasks
Chat
Meetings
Documents
Rewards
Attendance
Reports
Admin
```

Not:
```
Your Dashboard Overview
Project Management Hub
Task Management Center
```

---

## Tone by Context

| Context | Tone | Example |
|---------|------|---------|
| Success | Calm, confirming | "Project created." |
| Error | Direct, actionable | "Couldn't save. Try again." |
| Empty state | Inviting, brief | "No tasks yet. Add one." |
| First-run | Warm, instructive | "Start by creating a project." |
| AI results | Authoritative | "Health Score: 78 — On Track" |
| Danger action | Clear, specific | "Delete 'Sprint 4'? This is permanent." |
| Loading | Minimal | "Loading..." |
