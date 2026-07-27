# ZYNOTRIX — Product Gaps

This document captures features, flows, and experiences that are absent, broken, or incomplete in the current implementation. Gaps are classified by user impact.

---

## Navigation and Discoverability

### No Landing Page
The root URL `/` immediately redirects to `/dashboard` or `/login`. There is no marketing page, feature showcase, or conversion funnel. New users arriving from a shared link or search engine see a login form with zero context.

**Impact**: Zero organic growth potential. No brand impression before signup.

---

### No Onboarding After First Workspace Creation
After creating a workspace and arriving at the dashboard, users see:
- A `StandupWidget` prompt (only visible on first load via `localStorage`)
- An `OnboardingWizard` that appears based on `localStorage("zynotrix_onboarded")`

The wizard's steps and content are not confirmed from codebase inspection. If the wizard is superficial (one dismissible modal), users have no guided path to creating their first project, inviting a team member, or understanding the value of AI features.

**Impact**: High churn during first session — users don't know what to do next.

---

### No Search Results Page
The command palette (`Ctrl+K`) supports search via `/api/search`. However, there is no dedicated full search results page. Users can only act on the top few results shown in the palette.

**Impact**: Power users cannot bulk-find and manage items by keyword.

---

## Authentication and Identity

### No Password Reset Flow
The credentials provider uses email/password. There is no "Forgot Password" UI, no reset token generation, and no reset email sending.

**Impact**: Any user who forgets their password is permanently locked out unless an admin resets it manually via database.

---

### No Email Verification
New accounts can be created with any email address. There is no verification step. Bots, fake accounts, and typo-ed emails all create valid accounts.

**Impact**: Low data quality; potential for spam or abuse.

---

### No Account Deletion
Users cannot delete their own accounts. Admins cannot remove users entirely from the organization (they can change roles but the user record persists).

**Impact**: GDPR compliance failure. Users have no "right to erasure" path.

---

## User Management

### No User Invitation by Email
There is no flow to invite a user who doesn't have an account yet. Admins can create accounts (new user modal in Admin panel), but the invited user needs to be told their credentials out-of-band (email, Slack, etc.).

**Impact**: Team onboarding is friction-heavy. No invitation link or email flow.

---

### No Org-Switching UI
A user can belong to multiple organizations (the schema supports it), but there is no UI to switch between them. The JWT contains only one `organizationId` and the first org found is always used.

**Impact**: Consultants or users in multiple workspaces must use different accounts.

---

### No User Profile Page
Users cannot edit their own name, avatar, or password after account creation. There is an account settings page (`/account`) but its completeness is unclear.

**[INCOMPLETE]**: Needs audit to determine what fields are editable.

---

## Task Management

### No Task Comments
Tasks have no threaded comment system. The `Activity` model exists for audit-trail events, but there is no user-facing comment thread on a task.

**Impact**: Team discussions about a task must happen in chat (disconnected from the task) or in the description field.

---

### No File Attachments
Tasks cannot have attached files (images, PDFs, documents). The schema has no attachment model. AWS S3 variables are in `.env.example` but no upload code exists.

**Impact**: Design mockups, specs, and reference materials cannot be attached to tasks.

---

### No Task Templates
While `ProjectTemplate` exists in the schema, there is no task template system. Recurring task types (e.g., "weekly report", "bug report") must be created from scratch each time.

---

### No Bulk Task Operations
The task list view does not support selecting multiple tasks for bulk status change, bulk assignment, or bulk delete.

**Impact**: Project managers migrating or reorganizing dozens of tasks do it one at a time.

---

## Project Management

### No Budget Tracking UI
The `project.budget` and `project.budgetSpent` fields exist and are used in health scoring. However, there is no UI to update `budgetSpent`. It must be set manually via API or database.

**[INCOMPLETE]**: Budget tracking is a schema concept without product implementation.

---

### No Project Archive/Restore
Projects can be archived (there is an `isArchived` field), but there is no UI to restore an archived project. Once archived, the project is gone from the UI.

---

### No GitHub PR → Task Auto-Linking
The GitHub webhook receiver (`/api/webhooks/github`) receives PR events, but the logic to automatically link a PR to a task (e.g., by branch name `fix/ZYNO-123`) is not implemented.

---

## Meetings

### Meeting Rooms Without Video
The Google Meet integration generates Meet links, but there is no embedded video experience. Users must leave the app to join the meeting.

**[Inferred]**: This is likely intentional (embedding Meet requires a different integration tier), but it's a UX gap.

---

### No Meeting Recordings
There is no mechanism to store, link, or transcribe meeting recordings within ZYNOTRIX.

---

### No Meeting Attendance Tracking
The Meetings module schedules meetings but does not track who attended. The `attendance_records` table is for clock-in/clock-out, not meeting presence.

---

## Notifications

### No Email Notifications
The `NotificationPreference` model has an `email` channel boolean, but there is no email sending implementation. No transactional email provider (Resend, SendGrid, Postmark) is integrated.

**Impact**: Users can only receive notifications while actively using the app (via SSE push). No async notification loop.

---

### No WhatsApp Notifications (Despite Schema)
The `notificationPreferences.whatsapp` channel and `whatsappPhone` field exist in the schema. Twilio variables are in `.env.example`. But the WhatsApp sending implementation is a stub.

---

### No Notification Action Buttons
Notifications appear in the notification panel as text-only. There are no "Mark Done", "View Task", or "Accept Meeting" action buttons inside the notification.

---

## Analytics and Reports

### No Scheduled Reports
The AI report generator creates reports on-demand. There is no scheduled report (weekly digest, monthly summary) that emails stakeholders automatically.

---

### No Export to PDF
Reports can be generated as text, but there is no PDF export. `exceljs` is installed for Excel export, but PDF generation is not implemented.

---

## Admin

### No Audit Log UI
The `audit_logs` table exists and is populated, but there is no admin UI to view it. Admins cannot see who made what change and when.

---

### No Organization Settings Page
There is no UI to:
- Change the organization name
- Upload a logo
- Set the organization's timezone
- Manage billing

---

## Client Portal

### No Client Login
The client portal is accessible via a secret token URL. Once accessed, clients cannot log in or create accounts to maintain persistent access. Every share requires generating a new link.

---

## Mobile Experience

The app has no responsive layout for mobile devices. The sidebar does not collapse on small screens. Task cards and kanban columns overflow horizontally on phones.

**Impact**: Any team member using a mobile device has an unusable experience.

---

## Summary Table

| Gap | Category | User Impact | Effort |
|-----|----------|-------------|--------|
| No landing page | Marketing | Very High | Large |
| No password reset | Auth | Very High | Small |
| No email notifications | Notifications | High | Medium |
| No task comments | Collaboration | High | Medium |
| No file attachments | Tasks | High | Large |
| No user invitation | User Mgmt | High | Small |
| No mobile layout | UX | High | Large |
| No bulk task ops | Productivity | Medium | Medium |
| No audit log UI | Admin | Medium | Small |
| No account deletion | Compliance | Medium | Small |
| No email verification | Trust | Medium | Small |
| No org settings page | Admin | Medium | Medium |
| No meeting attendance | Meetings | Low | Small |
| No scheduled reports | Analytics | Low | Medium |
