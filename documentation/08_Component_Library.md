# ZYNOTRIX — Component Library

All components live in `src/components/`. This document covers every reusable UI component.

---

## UI Primitives (`src/components/ui/`)

### Button (`Button.tsx`)

A styled button component with variants and sizes.

**Props**:
```typescript
variant?: "primary" | "ghost" | "danger" | "secondary"
size?: "sm" | "md" | "lg"
disabled?: boolean
loading?: boolean
children: React.ReactNode
onClick?: () => void
className?: string
```

**CSS Classes Used**:
- `.btn` (base)
- `.btn-primary` (accent background, glow shadow)
- `.btn-ghost` (transparent, border, muted text)
- `.btn-danger` (danger color)
- `.btn-sm` (32px height)
- `.btn-md` (36px height)
- `.btn-lg` (42px height)

**States**:
- Default → Hover (background shift, shadow intensify)
- Active → `scale(0.97)` press feedback
- Disabled → `opacity: 0.45`, `cursor: not-allowed`
- Loading → Spinner replaces children

**Accessibility**: Should have `aria-disabled`, `aria-busy` — **[INCOMPLETE]**

---

### Input (`Input.tsx`)

Styled text input matching design system.

**Props**:
```typescript
placeholder?: string
value: string
onChange: (e) => void
type?: "text" | "email" | "password" | "number" | "date"
error?: string
disabled?: boolean
className?: string
```

**CSS Class**: `.input`  
**Focus**: accent border + 3px accent-muted ring  
**Error state**: danger border + error message below **[Inferred — verify implementation]**

---

### Textarea (`Textarea.tsx`)

Multi-line text input with consistent styling.

**Props**: Same as Input but renders `<textarea>`.  
**Notable**: Auto-resize is **[MISSING]** — height is fixed or manually styled.

---

### Select (`Select.tsx`)

Styled native `<select>` element.

**Variants**: Not documented separately — uses `input` CSS class styling **[Inferred]**.

---

### Badge (`Badge.tsx`)

Inline label for status, priority, categories.

**Props**:
```typescript
variant: "default" | "accent" | "energy" | "success" | "warning" | "danger" | "info" | "neutral"
size?: "sm" | "md"
children: React.ReactNode
```

**CSS Classes**: `.badge`, `.badge-accent`, `.badge-success`, etc.  
**Shape**: Pill (`border-radius: var(--r-full)`)  
**Typography**: 11px, weight 600, letter-spacing 0.01em

**Variants mapped to task priorities**:
- LOW → `default`
- MEDIUM → `info`
- HIGH → `warning`
- URGENT → `danger`

---

### Avatar (`Avatar.tsx`)

Circular user avatar — image fallback to initials.

**Props**:
```typescript
name?: string | null
image?: string | null
size?: "xs" | "sm" | "md" | "lg"
```

**Size Scale**:
- `xs`: 20px
- `sm`: 28px
- `md`: 36px (default)
- `lg`: 48px

**Fallback**: Extracts initials from name (first letter of first/last name) and shows on colored background.  
**Colors**: Hash of name used to pick from a preset palette — ensures consistent color per user.

---

### Modal (`Modal.tsx`)

Full-screen overlay modal with portal rendering.

**Props**:
```typescript
isOpen: boolean
onClose: () => void
title?: string
children: React.ReactNode
size?: "sm" | "md" | "lg" | "xl"
```

**Animation**: `scale-in` (0.22s spring) on open, same reversed on close via Framer Motion `AnimatePresence`.  
**Backdrop**: `rgba(0,0,0,0.50)` + `backdrop-filter: blur(8px)` on dark, lighter on light.  
**Z-index**: `--z-modal` (50)  
**Keyboard**: `Escape` closes **[Inferred]**  
**Focus trap**: **[MISSING]** — tab focus not trapped inside modal.

---

### Skeleton (`Skeleton.tsx`)

Loading placeholder with shimmer animation.

**Props**:
```typescript
className?: string
width?: string
height?: string
rounded?: boolean
```

**CSS Class**: `.skeleton` — uses `shimmer` keyframe animation (200% background-size gradient moving right to left).

**Usage pattern**: All major data-loading areas show skeleton grids before data arrives.

---

### EmptyState (`EmptyState.tsx`)

Standardized empty/zero-data placeholder.

**Props**:
```typescript
icon?: React.ReactNode
title: string
description?: string
action?: { label: string; onClick: () => void }
```

**Design**: Icon centered, heading, subtext, optional primary action button.

---

### MarkdownRenderer (`MarkdownRenderer.tsx`)

Renders AI-generated markdown content.

**Libraries**: `react-markdown`, `remark-gfm`  
**CSS wrapper**: `.prose-ai`  
**Supported**: Headings, bold, italic, lists, code blocks, blockquotes, links, tables (via GFM)

---

## Layout Components (`src/components/layout/`)

### Sidebar (`Sidebar.tsx`)

Primary navigation sidebar.

**Features**:
- Collapsible (icon-only mode, 48px wide)
- Collapse state persisted in Zustand (`useTheme` store or dedicated store)
- Logo + workspace name at top
- Navigation sections: Main (dashboard, projects, tasks, workload), Collaboration (chat, messages, meetings, documents), Team (attendance, rewards, audit), AI (assistant, reports, health, search), Admin (admin panel, settings, integrations, automations)
- User avatar + name at bottom
- Mobile: overlay with backdrop

**State**: `useSidebar()` hook exposes `collapsed` boolean and `setCollapsed`.

---

### Header (`Header.tsx`)

Top navigation bar (56px height).

**Contents**:
- Mobile hamburger (sidebar toggle)
- Page breadcrumb or title
- `PunchClock` component (attendance clock-in/out)
- `ThemeToggle` component  
- `NotificationBell` component
- User avatar dropdown (profile, settings, sign out)
- Command palette trigger button (Cmd+K)

---

### ThemeToggle (`ThemeToggle.tsx`)

Light/dark mode toggle button.

**Behavior**: Reads/writes `localStorage('theme')`, sets `data-theme` on `<html>`.  
**Icons**: Sun (light), Moon (dark) — likely from lucide-react.

---

### ThemeInit (`ThemeInit.tsx`)

Server-side script injected before first paint to prevent FOUC.

**Pattern**: Sets `data-theme` attribute synchronously from localStorage.  
**Implementation**: Inline `<script>` in `<head>` — runs before React hydration.

---

### NotificationBell (`NotificationBell.tsx`)

Header notification icon with unread count badge.

**Features**:
- Red badge with unread count
- Dropdown with recent notifications
- SSE integration for real-time new notifications
- "Mark all read" action
- Click navigates to relevant entity

**Provider**: `NotificationProvider` wraps the app layout and provides notification state context.

---

### PunchClock (`PunchClock.tsx`)

Persistent attendance clock widget in header.

**States**: Clocked Out → Clocked In (shows duration since clock-in)  
**Actions**: Clock In / Clock Out  
**API**: `/api/attendance/clock-in` and `/api/attendance/clock-out`

---

## AI Components (`src/components/ai/`)

### AIChatBubble (`AIChatBubble.tsx`)

Floating AI assistant accessible from any page.

**Behavior**: Fixed position bottom-right button, expands to chat interface.  
**Integration**: `useClaude` hook for streaming responses.

---

### StandupWidget (`StandupWidget.tsx`)

Dashboard widget that generates AI standup reports.

**Actions**: Click to generate standup based on user's recent tasks.  
**Output**: Markdown report: what I did / what I'm doing / blockers.

---

### NLTaskCreator (`NLTaskCreator.tsx`)

Natural language task creation modal.

**Props**:
```typescript
open: boolean
onClose: () => void
```

**Flow**: Text input → AI parse → pre-filled form → confirm → create task.

---

### MeetingNotesPanel (`MeetingNotesPanel.tsx`)

Meeting detail panel for AI-generated notes.

**Features**: Paste transcript, click generate, view structured notes.

---

## Kanban Components (`src/components/kanban/`)

### BoardTemplateModal (`BoardTemplateModal.tsx`)

Modal for selecting or generating board templates.

**Options**: Pre-built templates (Software Dev, Marketing, Client Project, etc.) or AI-generate from description.

---

## Command Palette (`src/components/command/CommandPalette.tsx`)

Universal keyboard-driven navigation and action launcher.

**Trigger**: `Cmd+K` / `Ctrl+K`  
**Features**: Fuzzy search across projects, pages, actions. Keyboard-only navigation.  
**Libraries**: Custom implementation — no external command palette library.

---

## Onboarding (`src/components/onboarding/OnboardingWizard.tsx`)

First-run onboarding modal overlay.

**Steps**: Welcome → Features overview → Create first project → Invite team  
**Persistence**: `localStorage('zynotrix_onboarded')` flag prevents re-show.

---

## Dashboard Components (`src/components/dashboard/`)

### MetricCard

Stat card for dashboard metrics.

**Props**:
```typescript
title: string
value: number
icon: React.ReactNode
color: "accent" | "danger" | "warning" | "success" | "secondary"
trend?: "up" | "down" | "neutral"
index: number    // for stagger animation delay
href?: string    // click navigates to filtered view
```

**Design**: `.stat-card` class, gradient top bar, icon in colored circle, animated number.

---

## Component Patterns

### Form Pattern

All forms follow this pattern:
```tsx
<form onSubmit={handleSubmit}>
  <div>
    <label className="text-[10px] font-bold text-subtle uppercase tracking-wider block mb-1">
      Field Name *
    </label>
    <input
      className="input"
      value={form.fieldName}
      onChange={(e) => setForm({ ...form, fieldName: e.target.value })}
    />
  </div>
  <button type="submit" className="btn-primary btn-md">Save</button>
</form>
```

### Loading Pattern

```tsx
if (loading) return (
  <div className="space-y-4">
    <div className="h-32 skeleton rounded-2xl" />
    <div className="grid grid-cols-3 gap-4">
      {[0,1,2].map(i => <div key={i} className="h-24 skeleton rounded-2xl" />)}
    </div>
  </div>
)
```

### Empty State Pattern

```tsx
<div className="flex flex-col items-center justify-center py-20 text-center">
  <IconComponent className="w-10 h-10 mb-3 text-subtle" />
  <p className="text-sm font-bold text-foreground">No items yet</p>
  <p className="text-xs text-muted mt-1">Description of what can be done</p>
  <button onClick={action} className="btn-primary btn-md mt-4">Primary Action</button>
</div>
```
