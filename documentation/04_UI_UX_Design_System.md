# ZYNOTRIX — UI/UX Design System

## Design Language: "Obsidian Command"

ZYNOTRIX's visual language is called **Obsidian Command** — a dark-first, precision-crafted design system that draws inspiration from developer tools, terminal UIs, and modern command interfaces. The aesthetic is structured around:

- Deep navy-black backgrounds with controlled indigo undertones
- Slate-indigo as the primary action color (periwinkle in dark mode)
- Warm amber as the energy/active-state accent
- Glassmorphism panels with high blur for elevated layers
- Crisp white-blue typography on dark grounds
- Gradient text as a premium brand signature

The light theme uses the same token system but inverted: periwinkle base with white cards.

---

## Layout System

### Structural Constants

```
Sidebar width (expanded):    196px   → --sidebar-w
Sidebar width (collapsed):    48px   → --sidebar-w-collapsed
Header height:                56px   → --header-h
Content max-width:           1400px  → --content-max-w
Page horizontal gutter:       24px   → --page-x
```

### Layout Pattern

The app uses a classic shell layout:
```
[FIXED SIDEBAR (196px)] [SCROLLABLE CONTENT AREA]
                         [FIXED HEADER (56px)]
                         [MAIN CONTENT]
```

- Sidebar is `position: fixed`, full height
- Content shell uses dynamic `margin-left` (CSS variable injected via `<style>` tag to respect collapse state)
- Transition: `margin-left 0.22s cubic-bezier(0.4,0,0.2,1)`
- Mobile: sidebar hidden, triggered by hamburger in header

### Content Wrapper

All pages use `.page-content { padding: var(--page-x); width: 100%; }` for consistent gutter.

### Z-Index Layer System

```
--z-base:    0    (normal content)
--z-raised:  10   (dropdowns, tooltips)
--z-overlay: 20   (click-away backdrops)
--z-sidebar: 30   (sidebar in mobile overlay mode)
--z-modal:   50   (modals, command palette)
--z-toast:   60   (react-hot-toast notifications)
```

---

## Grid System

No external grid library. Layouts use CSS Grid and Flexbox with Tailwind utilities:

- Dashboard metrics: `grid-cols-2 lg:grid-cols-4` (2 on mobile, 4 on desktop)
- Dashboard charts: `grid-cols-1 lg:grid-cols-3` (1 on mobile, 3 on desktop)
- Admin: `grid-cols-1 sm:grid-cols-2 lg:grid-cols-3`
- Project board: horizontal flex with overflow-x scroll per column
- Project list: vertical flex table

---

## Spacing Scale

Uses Tailwind's default spacing scale (4px base). Custom semantic spacing:

| Token | Value | Use |
|-------|-------|-----|
| `gap-1` | 4px | Icon + label within a component |
| `gap-2` | 8px | Related items within a card |
| `gap-3` | 12px | Card internal padding sections |
| `gap-4` | 16px | Cards in a grid |
| `gap-5` | 20px | Section padding inside cards |
| `gap-6` | 24px | Between major page sections |
| `p-6` | 24px | Standard page content padding |

---

## Border Radius Scale

```css
--r-xs:  6px   (kbd chips, small badges)
--r-sm:  8px   (input fields, small buttons)
--r-md:  12px  (default — standard cards, modals, buttons)
--r-lg:  16px  (larger cards, panels)
--r-xl:  20px  (elevated panels, command palette)
--r-2xl: 24px  (hero cards, rounded modals)
--r-full: 9999px (pills, avatars)
```

Notable patterns:
- `rounded-[10px]` and `rounded-[14px]` appear inline as intermediate sizes
- Hero cards use `rounded-[20px]` (custom)
- Dashboard greeting card: `rounded-[20px]` with ambient radial gradient inside

---

## Shadow Scale

### Light Mode Shadows
```css
--shadow-xs:    0 1px 2px rgba(13,14,43,0.05)
--shadow-sm:    0 2px 8px rgba(13,14,43,0.07), 0 1px 2px rgba(13,14,43,0.04)
--shadow-md:    0 4px 16px rgba(13,14,43,0.10), 0 2px 4px rgba(13,14,43,0.05)
--shadow-lg:    0 8px 32px rgba(13,14,43,0.12), 0 4px 8px rgba(13,14,43,0.06)
--shadow-float: 0 20px 64px rgba(13,14,43,0.14), 0 6px 16px rgba(13,14,43,0.07)
--shadow-glow:  0 0 0 3px rgba(79,82,217,0.12), 0 4px 24px rgba(79,82,217,0.16)
--shadow-glow-btn: 0 4px 20px rgba(79,82,217,0.32), inset 0 1px 0 rgba(255,255,255,0.20)
```

### Dark Mode Shadows
Dark shadows use pure black with higher opacity to create depth against dark backgrounds:
```css
--shadow-xs:    0 1px 3px rgba(0,0,0,0.60)
--shadow-sm:    0 2px 10px rgba(0,0,0,0.55), 0 1px 3px rgba(0,0,0,0.45)
--shadow-lg:    0 12px 44px rgba(0,0,0,0.80), 0 4px 12px rgba(0,0,0,0.60)
--shadow-float: 0 28px 80px rgba(0,0,0,0.90), 0 8px 24px rgba(0,0,0,0.65)
--shadow-glow:  0 0 0 1px rgba(129,140,248,0.28), 0 8px 32px rgba(129,140,248,0.18)
```

---

## Card Variants

### `.card` (base)
```css
background: var(--bg-card);
border: 1px solid var(--border);
border-radius: var(--r-lg);   /* 16px */
box-shadow: var(--shadow-sm);
```
Dark mode: linear gradient from `#0F1022` to `#0C0D1E` + `inset 0 1px 0 rgba(255,255,255,0.04)`

### `.stat-card`
Same as `.card` but with:
- 20px 24px padding
- `::before` pseudo-element: 2px top accent bar (`--_card-accent` CSS variable)
- Hover: `translateY(-1px)` lift

### `.panel` (elevated)
Used for dropdowns, modals, command palette:
```css
background: var(--bg-card);
border: 1px solid var(--border-strong);
border-radius: var(--r-xl);   /* 20px */
box-shadow: var(--shadow-float);
```
Dark mode: `backdrop-filter: blur(40px)` glassmorphism

---

## Glassmorphism Elements

Used on:
1. Command palette background (dark: `rgba(10,11,24,0.98)` + blur 40px)
2. Mobile sidebar overlay
3. Dark `.panel` components
4. Hero section ambient gradient blobs

Pattern: semi-transparent background + `backdrop-filter: blur(Xpx)` + subtle border.

---

## Mesh Background

```css
.mesh-bg {
  background-image:
    radial-gradient(ellipse at 12% 6%,  rgba(79,82,217,0.12) 0, transparent 45%),
    radial-gradient(ellipse at 88% 8%,  rgba(129,140,248,0.07) 0, transparent 40%),
    radial-gradient(ellipse at 4% 85%,  rgba(79,82,217,0.06) 0, transparent 40%);
}
```

Used on auth pages (login, register) and landing page.

---

## Gradient Text

```css
.gradient-text {
  background: linear-gradient(135deg, var(--accent) 0%, #C084FC 60%, var(--energy) 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
}
```

Used for hero headings, stat card values, reward balance display.

---

## Navigation Item States

`.nav-item`:
- Default: `color: var(--text-muted)`
- Hover: `background: var(--bg-card-hover)`, `color: var(--text-secondary)`
- Active: `color: var(--accent)` + 3px left accent bar

---

## Interaction Principles

1. **Hover lift**: Cards use `hover:translateY(-1px)` for subtle elevation
2. **Press scale**: Buttons use `:active { transform: scale(0.97) }`
3. **Spring easing**: `cubic-bezier(0.175, 0.885, 0.32, 1.275)` for modal/dropdown entrances
4. **Smooth out**: `cubic-bezier(0.16, 1, 0.3, 1)` for standard transitions
5. **Staggered animations**: Dashboard cards use `index * 0.07s` animation delay

---

## Motion Strategy

- **Enter animations**: `slide-up` (modal content), `fade-in` (overlays), `scale-in` (dropdown)
- **Exit animations**: Same in reverse via `AnimatePresence`
- **Streaming AI**: Dots pulse animation while Claude streams
- **Metric counters**: Animated from 0 to target value using RAF loop (Rewards page)
- **Progress bars**: Framer Motion `animate={{ width: pct% }}` with delay

All animations respect `prefers-reduced-motion` **[MISSING — not currently implemented]**.

---

## Dark/Light Theme Architecture

Theme is controlled by `data-theme` attribute on `<html>`:
- `data-theme="dark"` → CSS custom properties override
- `data-theme="light"` → root defaults
- No attribute + `prefers-color-scheme: dark` → media query fallback

The `ThemeInit.tsx` component reads `localStorage('theme')` on mount and sets `data-theme` before first paint (prevents FOUC).

`ThemeToggle.tsx` cycles between light/dark and persists to localStorage.

---

## Responsive Breakpoints

Uses Tailwind's default breakpoints:
- `sm`: 640px
- `md`: 768px  
- `lg`: 1024px (primary layout breakpoint — sidebar visibility, grid columns)
- `xl`: 1280px
- `2xl`: 1536px

The product is **desktop-first** with mobile accommodation but not mobile-optimized. Most table views collapse or scroll horizontally on small screens.
