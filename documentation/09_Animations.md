# ZYNOTRIX — Animations

## Animation Library

ZYNOTRIX uses two animation systems:

1. **Framer Motion** (`framer-motion` ^12.40.0) — component-level declarative animations, `AnimatePresence` for enter/exit, spring physics
2. **CSS Keyframes + Tailwind** — CSS-level micro-animations defined in `globals.css` and `tailwind.config.ts`

---

## CSS Keyframes

Defined in `globals.css`:

### `fadeIn` (0.20s ease-out)
```css
from { opacity: 0; }
to   { opacity: 1; }
```
**Usage**: Background overlays, quick reveals, tab content switches.  
**Tailwind class**: `animate-fade-in` or `animate-fade`

### `slideUp` (0.30s cubic-bezier(0.16,1,0.3,1))
```css
from { transform: translateY(10px); opacity: 0; }
to   { transform: translateY(0); opacity: 1; }
```
**Usage**: Primary page entry animation. Applied via `.animate-in` on page wrappers.  
**Tailwind class**: `animate-slide-up` or `animate-in`

### `slideDown` (0.30s cubic-bezier(0.16,1,0.3,1))
```css
from { transform: translateY(-10px); opacity: 0; }
to   { transform: translateY(0); opacity: 1; }
```
**Usage**: Dropdown menus, notification bell dropdown, collapsible panels.  
**Tailwind class**: `animate-slide-down`

### `scaleIn` (0.22s cubic-bezier(0.16,1,0.3,1))
```css
from { transform: scale(0.96); opacity: 0; }
to   { transform: scale(1); opacity: 1; }
```
**Usage**: Modal entry, badge pop-in on rewards page, card reveals.  
**Tailwind class**: `animate-scale-in`

### `shimmer` (1.6s ease-in-out infinite)
```css
0%   { background-position:  200% 0; }
100% { background-position: -200% 0; }
```
**Usage**: Skeleton loading placeholders. Applied via `.skeleton` utility class.  
**Tailwind class**: `animate-shimmer`

### `pulseRing` (2.2s ease-in-out infinite)
```css
0%, 100% { transform: scale(1); opacity: 0.20; }
50%       { transform: scale(1.65); opacity: 0; }
```
**Usage**: Live indicator dots (notification bell with active SSE, punch clock when clocked in).  
**Tailwind class**: `animate-pulse-ring`  
**CSS class**: `.pulse-dot::after`

### `floatY` (3s ease-in-out infinite)
```css
0%, 100% { transform: translateY(0); }
50%       { transform: translateY(-4px); }
```
**Usage**: Decorative floating elements on landing/empty states.  
**Tailwind class**: `animate-float`

### `spinDot` (8s linear infinite)
```css
from { transform: rotate(0deg); }
to   { transform: rotate(360deg); }
```
**Usage**: Slow background orbit decorations.  
**Tailwind class**: `animate-spin-slow`

---

## Easing Functions

Defined as CSS variables and Tailwind `transitionTimingFunction` extensions:

| Name | Value | Use Case |
|------|-------|---------|
| `--ease-spring` | `cubic-bezier(0.175, 0.885, 0.32, 1.275)` | Playful spring-overshoot for popups, badges |
| `--ease-out` | `cubic-bezier(0.16, 1, 0.3, 1)` | Fast exit deceleration — primary UI transitions |
| `--ease-in-out` | `cubic-bezier(0.4, 0, 0.2, 1)` | Smooth bidirectional transitions (theme, sidebar) |

Tailwind config: `transitionTimingFunction: { "spring": "...", "out": "..." }`

---

## Animation Delay Helpers

Stagger animation helpers for sequential reveals:

```css
.delay-1 { animation-delay: 50ms; }
.delay-2 { animation-delay: 100ms; }
.delay-3 { animation-delay: 150ms; }
.delay-4 { animation-delay: 200ms; }
.delay-5 { animation-delay: 250ms; }
```

**Usage**: Dashboard card grid stagger, admin user list items.

---

## Framer Motion Patterns

### Page/Section Entry
```tsx
<motion.div
  initial={{ opacity: 0, y: 10 }}
  animate={{ opacity: 1, y: 0 }}
  transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
>
```

### Staggered Cards (Dashboard metrics)
```tsx
<motion.div
  initial={{ opacity: 0, y: 16, scale: 0.96 }}
  animate={{ opacity: 1, y: 0, scale: 1 }}
  transition={{ delay: index * 0.07, duration: 0.4 }}
>
```

### Modal Entry
```tsx
<motion.div
  initial={{ opacity: 0, scale: 0.95, y: 16 }}
  animate={{ opacity: 1, scale: 1, y: 0 }}
  exit={{ opacity: 0, scale: 0.95 }}
>
```

### Backdrop
```tsx
<motion.div
  initial={{ opacity: 0 }}
  animate={{ opacity: 1 }}
  exit={{ opacity: 0 }}
  className="absolute inset-0 bg-black/50 backdrop-blur-sm"
/>
```

### Tab Transitions (AnimatePresence)
```tsx
<AnimatePresence mode="wait">
  <motion.div
    key={tab}
    initial={{ opacity: 0, x: -8 }}
    animate={{ opacity: 1, x: 0 }}
    exit={{ opacity: 0, x: 8 }}
  >
```

### Permission Toggle Spring
```tsx
<motion.div
  animate={{ x: checked ? 16 : 2 }}
  transition={{ type: "spring", stiffness: 500, damping: 30 }}
  className="toggle-thumb"
/>
```

### Progress Bar Animation
```tsx
<motion.div
  initial={{ width: 0 }}
  animate={{ width: `${percentage}%` }}
  transition={{ delay: 0.4, duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
/>
```

### Streaming AI Dots
```tsx
{[0, 1, 2].map((i) => (
  <motion.div
    animate={{ scale: [1, 1.4, 1], opacity: [0.5, 1, 0.5] }}
    transition={{ duration: 0.9, delay: i * 0.2, repeat: Infinity }}
    style={{ background: "var(--accent)" }}
    className="w-1.5 h-1.5 rounded-full"
  />
))}
```

### Badge Pop-in (Rewards page)
```tsx
<motion.div
  initial={{ scale: 0 }}
  animate={{ scale: 1 }}
  transition={{ type: "spring" }}
>
```

### Leaderboard Row Entry
```tsx
<motion.div
  initial={{ opacity: 0, x: -8 }}
  animate={{ opacity: 1, x: 0 }}
  transition={{ delay: i * 0.04 }}
>
```

---

## Animated Counter (Rewards Page)

Custom JavaScript animation using `requestAnimationFrame`:

```typescript
function Counter({ target }) {
  const [v, setV] = useState(0);
  useEffect(() => {
    let f = 0; const total = 60;
    const tick = () => {
      f++;
      setV(Math.round((1 - Math.pow(1 - f / total, 3)) * target));
      if (f < total) requestAnimationFrame(tick); else setV(target);
    };
    requestAnimationFrame(tick);
  }, [target]);
  return <>{v.toLocaleString()}</>;
}
```

**Easing**: `1 - (1-t)^3` (cubic ease-out) — starts fast, decelerates to final value.  
**Duration**: ~60 frames at 60fps ≈ 1 second.

---

## Theme Transition

Body background and text color animate on theme switch:
```css
body {
  transition: background 0.25s var(--ease-in-out), color 0.25s var(--ease-in-out);
}
```

Sidebar collapse transition:
```css
.sidebar-transition { transition: width 0.22s var(--ease-in-out); }
```

Content shell shift on sidebar collapse:
```js
style={{ transition: "margin-left 0.22s cubic-bezier(0.4,0,0.2,1)" }}
```

---

## Hover Interactions

| Element | Hover Effect |
|---------|-------------|
| `.card` | Shadow MD + border-strong |
| `.stat-card` | Shadow MD + translateY(-1px) |
| `.btn` | Background shift + shadow intensify |
| `.btn-primary` | Glow expand + brightness |
| `.btn:active` | `scale(0.97)` |
| `.nav-item` | `bg-card-hover` + text-secondary |
| Leaderboard row | `bg-card-hover` |
| Task list row | `bg-card-hover` |
| Dashboard card link | `hover:scale-[1.02]` |

---

## Loading Spinner

Standard loading indicator for buttons and inline loaders:
```tsx
<span className="w-3 h-3 rounded-full border-2 border-white/30 border-t-white animate-spin" />
```

Used in: AI Generate button, Create User modal submit, Redeem coupon button.

---

## Performance Notes

1. Framer Motion uses WAAPI (Web Animations API) by default for hardware-accelerated animations where possible.
2. `transform` and `opacity` are the only properties animated — never `width`, `height`, or layout-affecting properties (except progress bars which use `width` intentionally).
3. `backdrop-filter: blur()` is GPU-accelerated but expensive — limited to elevated panels and modals.
4. `animate-shimmer` uses `background-size: 400%` and `background-position` animation — no layout cost.
5. **[MISSING]**: `prefers-reduced-motion` media query not respected. All animations run regardless of OS motion preference.

---

## Animation Duration Standards

| Category | Duration | Rationale |
|----------|----------|-----------|
| Quick reveals | 150–200ms | Instant feel, no perceived delay |
| Standard transitions | 220–300ms | Perceptible but snappy |
| Modal/panel entry | 300–400ms | Deliberate, premium feel |
| Counters / progress | 600ms–1000ms | Satisfying completion sense |
| Infinite animations | Varies | Background activity, not blocking |
