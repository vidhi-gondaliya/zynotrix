# ZYNOTRIX — Known Issues

This document catalogs confirmed bugs, technical debt, and behavioral inconsistencies identified by auditing the ZYNOTRIX codebase. Each entry includes severity, root cause, and recommended fix.

---

## Critical Issues

### KI-001: SSE Not Horizontally Scalable

**Severity**: Critical  
**Component**: `src/lib/sse.ts`, Chat, Notifications  
**Status**: Architectural — requires redesign

**Description**: The SSE subscriber registry uses a module-level `Map` object stored in Node.js memory:
```typescript
const channelSubscribers = new Map<string, Set<Controller>>();
const notificationSubscribers = new Map<string, Set<Controller>>();
```

On Vercel Serverless, each function invocation may run in a separate container. Two users connected to the same channel may be on different instances and cannot receive each other's messages.

**Impact**: Real-time chat and notifications break as soon as more than one Vercel function instance is active (i.e., under any meaningful load).

**Fix**: Replace with a pub/sub system (Pusher, Ably, Upstash Redis pub/sub, Supabase Realtime).

---

### KI-002: Custom Role Permissions Not Enforced

**Severity**: Critical (Security)  
**Component**: `src/lib/permissions.ts`, all API routes  
**Status**: Incomplete implementation

**Description**: The custom roles feature allows admins to create roles with specific permission sets stored in the `roles.permissions` JSON string. However, `hasPermission()` only reads from `DEFAULT_ROLE_PERMISSIONS` which covers only OWNER, ADMIN, MANAGER, MEMBER. Custom role names are not looked up.

**Impact**: Any user with a custom role effectively has MEMBER-level permissions regardless of what permissions were assigned to their custom role.

**Fix**: For custom roles, the permission check must query the `roles` table by role name and parse the permissions JSON.

---

### KI-003: Google Calendar OAuth Token Not Refreshed

**Severity**: High  
**Component**: `src/lib/google-meet.ts`, `src/lib/auth.ts`  
**Status**: Missing implementation

**Description**: Google OAuth access tokens expire after 1 hour. The `accessToken` stored in the JWT is not refreshed. After 1 hour, Google Meet link generation silently fails.

**Fix**: Implement token refresh in the NextAuth `jwt` callback using the `refreshToken` from Google's OAuth response.

---

### KI-004: Kanban Position Collisions

**Severity**: High  
**Component**: `src/app/api/tasks/[taskId]/move/route.ts`  
**Status**: Logic bug

**Description**: When tasks are dragged to a new position, only the moved task's `position` field is updated. Adjacent tasks in the column are not re-sorted. Over multiple drags, two tasks can have the same `position` value, causing non-deterministic ordering.

**Fix**: After any drag-drop, re-index all tasks in the destination column with sequential integers (1, 2, 3...).

---

## High Severity Issues

### KI-005: Search Index Not Updated on Task Edit

**Severity**: High  
**Component**: `src/app/api/tasks/[taskId]/route.ts` (PATCH)  
**Status**: Incomplete implementation

**Description**: A `SearchIndex` entry is created when a task is created (POST), but the index is not updated when the task title, description, or tags are modified (PATCH). Search results show stale data after edits.

**Fix**: In the task PATCH handler, upsert the `SearchIndex` row with updated content.

---

### KI-006: No Rate Limiting on Auth Endpoints

**Severity**: High (Security)  
**Component**: `/api/auth/[...nextauth]`  
**Status**: Missing implementation

**Description**: The login endpoint accepts unlimited credential attempts. A brute-force attack against any known email address is undetected and unblocked.

**Fix**: Implement rate limiting (e.g., 5 attempts per IP per 15 minutes) using Upstash Redis ratelimit.

---

### KI-007: Integration Secrets Stored Plaintext

**Severity**: High (Security)  
**Component**: `integrations.config` database field  
**Status**: By design, but insecure

**Description**: Integration configurations (Slack webhook URLs, API tokens) are stored as plaintext JSON strings in the `integrations.config` column. Database access = credential access.

**Fix**: Encrypt integration configs with AES-GCM using a master secret from env vars before storing.

---

### KI-008: Multi-Org Users See Only First Org

**Severity**: High  
**Component**: `src/lib/auth.ts` JWT callback, `src/lib/org.ts`  
**Status**: By design, but incomplete

**Description**: The JWT stores a single `organizationId`. If a user is a member of multiple organizations (possible via the `OrgMembership` schema), they can only access the first org found in the JWT. There is no org-switching UI.

**Fix**: Add an org-switching flow: user selects active org → JWT is updated via `update()` → page reloads with new org context.

---

## Medium Severity Issues

### KI-009: Tags Stored as JSON String, Not Array

**Severity**: Medium (Technical Debt)  
**Component**: `prisma/schema.prisma`, all tag-related code  
**Status**: By design, but problematic

**Description**: Task tags are stored as a `String` field with JSON content (e.g., `"[\"bug\",\"urgent\"]"`), not as a Prisma `Json` or relational `Tag` model. This means:
- Tags cannot be queried with Prisma `contains` on individual tag values
- Filtering by tag requires `LIKE` or application-level parsing
- Search indexing includes the raw JSON string

**Fix**: Migrate to a `Tag` model with a many-to-many relation to `Task`.

---

### KI-010: No Attendance ABSENT Status Automation

**Severity**: Medium  
**Component**: Attendance module  
**Status**: Missing implementation

**Description**: The `AttendanceRecord.status` enum includes `ABSENT`, but there is no mechanism to automatically mark users as absent at end-of-day if they didn't clock in. This requires a scheduled job (cron).

**Fix**: Implement a Vercel Cron Job at midnight to mark all users with no clock-in for the day as `ABSENT`.

---

### KI-011: Document Collaboration Sends Writes to All Users

**Severity**: Medium  
**Component**: `src/app/(app)/documents/[docId]/page.tsx`  
**Status**: Architectural limitation

**Description**: Document editing broadcasts the full content via SSE on every keystroke. For large documents with many collaborators, this causes high bandwidth usage and re-renders.

**Fix (short-term)**: Debounce saves by 1-2 seconds.  
**Fix (long-term)**: Use Yjs or operational transforms for real collaboration.

---

### KI-012: Sprint Velocity Not Auto-Calculated

**Severity**: Medium  
**Component**: Sprint completion flow  
**Status**: Incomplete implementation

**Description**: The `sprint.velocity` field exists in the schema but is not automatically populated when a sprint is marked COMPLETED. Velocity must be set manually or not at all.

**Fix**: Add velocity calculation in the PATCH handler for `sprint.status = "COMPLETED"`.

---

## Low Severity Issues

### KI-013: Form State Not Reset on Modal Close

**Severity**: Low  
**Component**: Various modals throughout the app  
**Status**: UX bug

**Description**: When users open a modal, partially fill a form, and close without submitting — the form values remain when the modal is reopened.

**Fix**: Reset form state in the `onClose` handler: `setForm(initialState)`.

---

### KI-014: Error Messages Swallowed by Empty Catch Blocks

**Severity**: Low-Medium  
**Component**: Most page-level data fetching  
**Status**: Code quality issue

**Description**: The pattern `fetch(...).catch(() => {})` silently discards errors. Users see empty states with no explanation when API calls fail.

**Fix**: Replace with `catch((err) => { setError(err.message); toast.error("Failed to load data"); })`.

---

### KI-015: No lang Attribute on HTML Element

**Severity**: Low (Accessibility)  
**Component**: `src/app/layout.tsx`  
**Status**: Omission

**Description**: The `<html>` element has no `lang` attribute, failing WCAG 3.1.1 and causing screen readers to use the wrong language.

**Fix**: Add `lang="en"` to the `<html>` element in the root layout.

---

### KI-016: No next/image Used for Avatars

**Severity**: Low  
**Component**: All avatar `<img>` tags  
**Status**: Performance issue

**Description**: User avatars use raw `<img>` tags pointing to external URLs (Google, GitHub). No optimization, no lazy loading, no WebP conversion, no fallback.

**Fix**: Replace all avatar `<img>` with Next.js `<Image>` from `next/image`.

---

### KI-017: Missing robots.txt and OG Meta Tags

**Severity**: Low  
**Component**: Public-facing pages  
**Status**: Missing implementation

**Description**: No `robots.txt` file. No Open Graph or Twitter card meta tags. Login page and dashboard are potentially being crawled.

**Fix**: See `20_SEO.md` for full recommendations.

---

## Technical Debt Tracker

| ID | Area | Type | Effort | Priority |
|----|------|------|--------|----------|
| KI-001 | Real-time (SSE) | Architecture | Large | Critical |
| KI-002 | Permissions | Security bug | Medium | Critical |
| KI-003 | Google OAuth | Missing feature | Small | High |
| KI-004 | Kanban | Logic bug | Small | High |
| KI-005 | Search | Incomplete feature | Small | High |
| KI-006 | Auth | Security | Small | High |
| KI-007 | Integrations | Security | Medium | High |
| KI-008 | Multi-org | Missing feature | Medium | High |
| KI-009 | Data model | Tech debt | Large | Medium |
| KI-010 | Attendance | Missing feature | Medium | Medium |
| KI-011 | Documents | Architecture | Large | Medium |
| KI-012 | Sprints | Incomplete feature | Small | Medium |
| KI-013 | Forms | UX bug | Small | Low |
| KI-014 | Error handling | Code quality | Medium | Low |
| KI-015 | Accessibility | Omission | Tiny | Low |
| KI-016 | Images | Performance | Small | Low |
| KI-017 | SEO | Missing | Small | Low |
