# ZYNOTRIX — Accessibility

## Overall Accessibility Score

**WCAG 2.1 Compliance Level**: AA — Partial  
**Estimated Accessibility Score**: 3/10

The application makes no explicit accessibility investments. It relies on browser defaults and Tailwind/HTML semantics. No systematic audit has been performed.

---

## Semantic HTML

### Current State

Most UI is built from `<div>` elements styled as buttons, lists, or cards. Semantic HTML usage is limited.

**What's Used Correctly**:
- `<button>` elements for most interactive actions
- `<input>`, `<label>`, `<select>` for form elements
- `<nav>` in the sidebar **[Inferred]**
- `<h1>`–`<h3>` heading hierarchy **[Partially implemented — audit required]**

**What's Missing or Incorrect**:
- `<main>`, `<aside>`, `<section>` landmark roles — likely absent
- Kanban columns should use `role="list"` with `role="listitem"` per card
- Modal dialogs should use `role="dialog"` with `aria-modal="true"`
- Alert messages should use `role="alert"` or `role="status"`

---

## ARIA Usage

### Current State

No systematic ARIA attribute usage found in the codebase. Individual components may have incidental ARIA attributes.

**Critical Missing ARIA Attributes**:

```html
<!-- Kanban Column -- Missing -->
<div role="list" aria-label="In Progress tasks">
  <div role="listitem">...</div>
</div>

<!-- Icon-only buttons -- Missing aria-label -->
<button aria-label="Close modal">
  <X className="w-4 h-4" />
</button>

<!-- Loading states -- Missing -->
<div role="status" aria-live="polite">Loading tasks...</div>

<!-- Notification count -- Missing -->
<button aria-label={`Notifications - ${unreadCount} unread`}>...</button>
```

### Framer Motion Animations

Framer Motion animations respect `prefers-reduced-motion` if configured:
```typescript
// Should be added to all motion components
const prefersReduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
<motion.div animate={prefersReduced ? {} : { opacity: 1 }}>
```

**[MISSING]**: No `prefers-reduced-motion` checks in the codebase.

---

## Keyboard Navigation

### Tab Order

The sidebar and header likely follow DOM order for tab navigation. However:
- Command palette (`Ctrl+K`) opens correctly and is keyboard-navigable **[Inferred]**
- Modals may not trap focus — keyboard users can tab behind the modal overlay
- Dropdown menus may not close on `Escape`

### Focus Management

**[MISSING]**: When modals open, focus is not moved to the modal. Screen reader users will not know a modal opened.

**[MISSING]**: After modal close, focus does not return to the trigger button.

### Keyboard Shortcuts

| Shortcut | Action | Documented |
|----------|--------|-----------|
| `Ctrl+K` | Open command palette | Yes |
| `Escape` | Close modal | Likely |
| Arrow keys | Kanban navigation | **[MISSING]** |

---

## Color Contrast

### Dark Theme (Primary)

Dark background `#06070F` with foreground `#E2E8F0` — contrast ratio is approximately **12:1** — Passes AAA.

Primary accent `#818CF8` on dark background `#06070F` — contrast ratio approximately **6.5:1** — Passes AA for normal text.

### Light Theme

Background `#F2F3FD` with text `#1E1F2E` — high contrast, estimated **14:1** — Passes AAA.

Accent `#4F52D9` on light background `#F2F3FD` — approximately **5.2:1** — Passes AA.

### Problem Areas

**Warning**: `text-gray-400` or `text-slate-400` helper text on light backgrounds may fall below 3:1 for small text. Specific color: `#94A3B8` on `#F2F3FD` — contrast ratio ~3.0:1 — **Borderline, fails AA for small text**.

**Energy accent**: `#F59E0B` (amber) on white backgrounds — approximately 2.9:1 — **Fails AA**.

---

## Form Accessibility

### Labels
- `<label>` elements should be associated with inputs via `htmlFor` / `id` pairing
- Error messages should use `aria-describedby` to link to the input

```html
<!-- Recommended -->
<label htmlFor="task-title">Task Title</label>
<input id="task-title" aria-describedby="task-title-error" />
<span id="task-title-error" role="alert">This field is required</span>
```

**[MISSING]**: Form error messages are typically rendered as text near the input without ARIA association.

### Required Fields
**[MISSING]**: No `required` attribute or `aria-required="true"` on required form inputs.

---

## Screen Reader Compatibility

### Image Alt Text
**[MISSING]**: Avatar `<img>` elements lack `alt` attributes in most cases. Users' profile images should have `alt={user.name}` or `alt=""` if decorative.

### Dynamic Content Updates
Real-time notifications arrive via SSE. Screen readers must be informed:
```html
<div aria-live="polite" aria-atomic="true" className="sr-only">
  {latestNotificationMessage}
</div>
```

**[MISSING]**: No `aria-live` regions for dynamic content updates.

---

## Responsive Accessibility

The application is primarily designed for desktop use. No explicit mobile accessibility testing appears to have been done.

- Touch targets should be at least 44×44px (WCAG 2.5.5)
- Sidebar collapse may create small touch targets on mobile

---

## Internationalization (i18n)

**[MISSING]**: The `<html>` element has no `lang` attribute specified in `layout.tsx`. This is required for screen readers to use the correct language for text-to-speech.

**Fix**: Add `lang="en"` to the root element:
```typescript
// src/app/layout.tsx
<html lang="en">
```

---

## WCAG 2.1 Level AA Gap Analysis

| Criterion | Level | Status | Notes |
|-----------|-------|--------|-------|
| 1.1.1 Non-text Content | A | ❌ Fail | Icon-only buttons lack aria-label |
| 1.3.1 Info and Relationships | A | ⚠️ Partial | Semantic HTML partially used |
| 1.3.3 Sensory Characteristics | A | ✅ Pass | Not relying on color alone |
| 1.4.1 Use of Color | A | ⚠️ Review | Status indicators use color + text |
| 1.4.3 Contrast (Minimum) | AA | ⚠️ Partial | Most pass; amber fails |
| 1.4.4 Resize Text | AA | ✅ Pass | Tailwind rem units scale |
| 1.4.10 Reflow | AA | ⚠️ Unknown | Not tested at 400% zoom |
| 1.4.11 Non-text Contrast | AA | ⚠️ Partial | Form borders may fail |
| 2.1.1 Keyboard | A | ⚠️ Partial | Some features keyboard-accessible |
| 2.1.2 No Keyboard Trap | A | ❌ Risk | Modals may trap incorrectly |
| 2.4.3 Focus Order | A | ⚠️ Unknown | Not audited |
| 2.4.7 Focus Visible | AA | ⚠️ Partial | Tailwind focus rings present |
| 3.1.1 Language of Page | A | ❌ Fail | No lang attribute on html element |
| 3.3.1 Error Identification | A | ⚠️ Partial | Some forms show errors |
| 3.3.2 Labels or Instructions | A | ⚠️ Partial | Labels exist; ARIA links missing |
| 4.1.2 Name, Role, Value | A | ❌ Partial | Icon buttons missing names |
| 4.1.3 Status Messages | AA | ❌ Fail | No aria-live regions |

---

## Priority Accessibility Fixes

### P0 — Critical (Quick wins)
1. Add `lang="en"` to `<html>` in `layout.tsx`
2. Add `aria-label` to all icon-only buttons
3. Add `alt` text to all `<img>` tags

### P1 — Important
4. Add `role="dialog"` and focus trap to all modals
5. Add `aria-live="polite"` region for SSE notifications
6. Add `prefers-reduced-motion` checks to Framer Motion

### P2 — Comprehensive
7. Full keyboard navigation audit for Kanban
8. `aria-describedby` for form validation errors
9. ARIA role audit for all list/grid components
