# ZYNOTRIX — Color System

## Design Philosophy

The color system uses CSS custom properties (variables) as the single source of truth, mapped to Tailwind utility classes via `tailwind.config.ts`. This enables seamless dark/light theme switching without JavaScript class manipulation.

All colors exist in both light and dark variants. The dark theme is the "primary" experience; light mode is the "comfortable alternative."

---

## Light Theme Colors

### Background Grounds

| Token | CSS Variable | Hex | RGB | HSL | Usage |
|-------|-------------|-----|-----|-----|-------|
| `bg-base` | `--bg-base` | `#F2F3FD` | `rgb(242,243,253)` | `hsl(234,71%,97%)` | Page background |
| `bg-elevated` | `--bg-elevated` | `#E9EBFB` | `rgb(233,235,251)` | `hsl(234,71%,95%)` | Slightly elevated surface |
| `bg-sidebar` | `--bg-sidebar` | `#FAFBFF` | `rgb(250,251,255)` | `hsl(234,100%,99%)` | Sidebar background |
| `bg-card` | `--bg-card` | `#FFFFFF` | `rgb(255,255,255)` | `hsl(0,0%,100%)` | Card/panel background |
| `bg-card-hover` | `--bg-card-hover` | `#F7F8FF` | `rgb(247,248,255)` | `hsl(234,100%,98%)` | Card hover state |

### Typography (Light)

| Token | CSS Variable | Hex | Usage |
|-------|-------------|-----|-------|
| `text-foreground` | `--text-foreground` | `#0D0E2B` | Primary text |
| `text-secondary` | `--text-secondary` | `#3D4274` | Secondary text, labels |
| `text-muted` | `--text-muted` | `#6B7099` | Muted text, placeholders |
| `text-subtle` | `--text-subtle` | `#A0A5CC` | De-emphasized text |
| `text-disabled` | `--text-disabled` | `#C5C8E0` | Disabled elements |

### Accent (Primary — Slate Indigo, Light)

| Token | CSS Variable | Hex | Usage |
|-------|-------------|-----|-------|
| `accent` | `--accent` | `#4F52D9` | Primary buttons, active nav, links |
| `accent-hover` | `--accent-hover` | `#3F42BD` | Button hover |
| `accent-active` | `--accent-active` | `#333599` | Button active/press |
| `accent-muted` | `--accent-muted` | `rgba(79,82,217,0.08)` | Accent-tinted background |
| `accent-glow` | `--accent-glow` | `rgba(79,82,217,0.16)` | Glow rings, focus outlines |
| `accent-foreground` | `--accent-foreground` | `#FFFFFF` | Text on accent buttons |

**Tailwind class**: `text-accent`, `bg-accent`, `border-accent`, `text-accent-foreground`

### Energy (Secondary — Warm Amber, Light)

| Token | CSS Variable | Hex | Usage |
|-------|-------------|-----|-------|
| `energy` | `--energy` | `#E99B14` | In-progress, streaks, overdue warnings |
| `energy-muted` | `--energy-muted` | `rgba(233,155,20,0.10)` | Amber-tinted background |
| `energy-glow` | `--energy-glow` | `rgba(233,155,20,0.20)` | Amber glow effects |

### Semantic Colors (Light)

| Token | CSS Variable | Hex | Usage |
|-------|-------------|-----|-------|
| `success` | `--success` | `#16A34A` | Done, healthy, positive |
| `success-muted` | `--success-muted` | `rgba(22,163,74,0.09)` | Success tinted bg |
| `warning` | `--warning` | `#D97706` | At risk, needs attention |
| `warning-muted` | `--warning-muted` | `rgba(217,119,6,0.09)` | Warning tinted bg |
| `danger` | `--danger` | `#DC2626` | Error, overdue, critical |
| `danger-muted` | `--danger-muted` | `rgba(220,38,38,0.09)` | Danger tinted bg |
| `info` | `--info` | `#2563EB` | Informational, neutral |
| `info-muted` | `--info-muted` | `rgba(37,99,235,0.09)` | Info tinted bg |

### Borders (Light)

| Token | CSS Variable | Value | Usage |
|-------|-------------|-------|-------|
| `border` | `--border` | `rgba(79,82,241,0.09)` | Default borders |
| `border-subtle` | `--border-subtle` | `rgba(79,82,241,0.05)` | Very subtle dividers |
| `border-strong` | `--border-strong` | `rgba(79,82,241,0.16)` | Emphasized borders |
| `border-focus` | `--border-focus` | `rgba(79,82,241,0.40)` | Input focus ring |

---

## Dark Theme Colors

### Background Grounds (Dark)

| Token | CSS Variable | Hex | Usage |
|-------|-------------|-----|-------|
| `bg-base` | `--bg-base` | `#06070F` | Page background (near-black navy) |
| `bg-elevated` | `--bg-elevated` | `#0C0D1E` | Elevated surface |
| `bg-sidebar` | `--bg-sidebar` | `#07081A` | Sidebar (deepest dark) |
| `bg-card` | `--bg-card` | `#0F1022` | Card background |
| `bg-card-hover` | `--bg-card-hover` | `#151728` | Card hover |

### Typography (Dark)

| Token | CSS Variable | Hex | Usage |
|-------|-------------|-----|-------|
| `text-foreground` | `--text-foreground` | `#DDE0FF` | Primary text (blue-white) |
| `text-secondary` | `--text-secondary` | `#A0A8D8` | Secondary text |
| `text-muted` | `--text-muted` | `#6871A8` | Muted text |
| `text-subtle` | `--text-subtle` | `#3A4070` | Very de-emphasized |
| `text-disabled` | `--text-disabled` | `#252A50` | Disabled |

### Accent (Primary — Periwinkle Indigo, Dark)

| Token | CSS Variable | Hex | Usage |
|-------|-------------|-----|-------|
| `accent` | `--accent` | `#818CF8` | Primary actions (lightened for dark) |
| `accent-hover` | `--accent-hover` | `#939EF9` | Hover |
| `accent-active` | `--accent-active` | `#6D7AF4` | Active/press |
| `accent-muted` | `--accent-muted` | `rgba(129,140,248,0.10)` | Tinted background |
| `accent-glow` | `--accent-glow` | `rgba(129,140,248,0.22)` | Glow effects |

### Energy (Dark)

| Token | CSS Variable | Hex |
|-------|-------------|-----|
| `energy` | `--energy` | `#FBBF24` |
| `energy-muted` | `--energy-muted` | `rgba(251,191,36,0.10)` |
| `energy-glow` | `--energy-glow` | `rgba(251,191,36,0.22)` |

### Semantic Colors (Dark)

| Token | Hex |
|-------|-----|
| `success` | `#22C55E` |
| `warning` | `#F59E0B` |
| `danger` | `#F43F5E` |
| `info` | `#60A5FA` |

### Borders (Dark)

| Token | Value |
|-------|-------|
| `border` | `rgba(255,255,255,0.055)` |
| `border-subtle` | `rgba(255,255,255,0.025)` |
| `border-strong` | `rgba(255,255,255,0.10)` |
| `border-focus` | `rgba(129,140,248,0.50)` |

---

## Gradient Tokens

Defined in `tailwind.config.ts` as `backgroundImage` extensions:

```js
"gradient-accent":  "linear-gradient(135deg, var(--accent) 0%, #A78BFA 100%)"
"gradient-energy":  "linear-gradient(135deg, var(--energy) 0%, #FB923C 100%)"
"gradient-brand":   "linear-gradient(135deg, #4F52D9 0%, #818CF8 50%, #FBBF24 100%)"
"gradient-premium": "linear-gradient(135deg, #7C3AED 0%, #C026D3 50%, #0891B2 100%)"
```

---

## Status Color Map

Used across task boards, badges, and activity feeds:

| Status | Color |
|--------|-------|
| BACKLOG | `#6B7280` (neutral gray) |
| TODO | `#60A5FA` (sky blue) |
| IN_PROGRESS | `#A78BFA` (violet) |
| REVIEW | `#FBBF24` (amber) |
| DONE | `#34D399` (emerald) |

---

## Priority Color Map

| Priority | Badge Variant | Color |
|----------|--------------|-------|
| LOW | default | neutral gray |
| MEDIUM | info | `var(--info)` blue |
| HIGH | warning | `var(--warning)` amber |
| URGENT | danger | `var(--danger)` red |

---

## Badge Color Presets (Admin / Roles)

```
#A78BFA  purple  (OWNER)
#60A5FA  blue    (ADMIN)
#34D399  green   (MANAGER)
#FFC107  yellow  (general)
#FF4466  red     (alert)
#FB923C  orange  (general)
#EC4899  pink    (general)
#6B7280  gray    (MEMBER)
```

---

## Tailwind Class Mapping

From `tailwind.config.ts`:

```
bg-base          → var(--bg-base)
bg-elevated      → var(--bg-elevated)
bg-card          → var(--bg-card)
bg-card-hover    → var(--bg-card-hover)
text-foreground  → var(--text-foreground)
text-secondary   → var(--text-secondary)
text-muted       → var(--text-muted)
text-subtle      → var(--text-subtle)
border           → var(--border)
border-subtle    → var(--border-subtle)
border-strong    → var(--border-strong)
text-accent      → var(--accent)
bg-accent        → var(--accent)
text-energy      → var(--energy)
text-success     → var(--success)
text-warning     → var(--warning)
text-danger      → var(--danger)
shadow-glow      → var(--shadow-glow)
shadow-glow-btn  → var(--shadow-glow-btn)
```

---

## Color Accessibility Notes

**[INCOMPLETE — formal contrast ratios not verified]**

Known concerns:
- `--text-subtle` (#A0A5CC dark) on `--bg-card` (#0F1022) — needs verification at WCAG AA
- `--text-muted` in table cells may fall below 4.5:1 at small sizes
- Warning amber on white background: borderline compliant

Recommended action: Run all color pairs through a contrast checker and adjust where needed.
