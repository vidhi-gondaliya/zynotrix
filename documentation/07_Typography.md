# ZYNOTRIX — Typography

## Font Families

### Heading Font: Plus Jakarta Sans

**Source**: Google Fonts (`next/font/google`)  
**Variable**: `--font-heading` → `var(--font-heading)`  
**Tailwind class**: `font-heading`  
**Weights loaded**: 400, 500, 600, 700, 800  
**Display**: `swap`  
**Subsets**: `latin`

**Character**: Geometric, contemporary, confident. Wide letter spacing at display sizes (-0.035em). Feels premium and modern.

**Usage**: All `h1`–`h6` elements, `.heading-xl`, `.heading-lg`, `.heading-md` utility classes, hero statistics, page titles, card section headers.

### Body Font: DM Sans

**Source**: Google Fonts (`next/font/google`)  
**Variable**: `--font-body` → `var(--font-body)`  
**Tailwind class**: `font-sans`  
**Weights loaded**: 300, 400, 500, 600  
**Display**: `swap`  
**Subsets**: `latin`

**Character**: Rounded, warm, legible at small sizes (13–14px). Designed for screens. The `ss01`, `cv02`, `cv03`, `cv04` OpenType features are enabled for improved legibility.

**Usage**: Body text, buttons, inputs, labels, navigation items, table cells, chat messages.

### Monospace Font: JetBrains Mono

**Source**: Google Fonts (`next/font/google`)  
**Variable**: `--font-mono` → `var(--font-mono)`  
**Tailwind class**: `font-mono`  
**Weights loaded**: 400, 500, 700  
**Display**: `swap`  
**Subsets**: `latin`

**Character**: Developer-grade monospace with ligatures. Highly readable for code and technical data.

**Usage**: Code blocks in markdown renderer, coupon codes, keyboard shortcuts (`.kbd`), permission IDs, internal IDs.

---

## Base Typography Settings

Set on `<html>` element:

```css
font-family: var(--font-body), "DM Sans", system-ui, -apple-system, sans-serif;
font-size: 14px;
line-height: 1.5;
-webkit-font-smoothing: antialiased;
-moz-osx-font-smoothing: grayscale;
text-rendering: optimizeLegibility;
font-feature-settings: "ss01", "cv02", "cv03", "cv04";
```

---

## Heading Hierarchy

All headings set in Plus Jakarta Sans:

```css
h1, h2, h3, h4, h5, h6 {
  font-family: var(--font-heading);
  font-weight: 700;
  letter-spacing: -0.025em;
  line-height: 1.2;
  color: var(--text-foreground);
  text-wrap: balance;
}
```

### Utility Heading Classes

| Class | Size | Weight | Letter Spacing | Line Height | Typical Use |
|-------|------|--------|---------------|------------|-------------|
| `.heading-xl` | 28px | 800 (ExtraBold) | -0.03em | 1.1 | Page hero titles |
| `.heading-lg` | 20px | 700 (Bold) | -0.025em | 1.2 | Section titles, card headers |
| `.heading-md` | 16px | 700 (Bold) | -0.02em | 1.2 | Sub-section headings |

---

## Body Text Scale

| Class / Usage | Size | Weight | Color Variable | Context |
|--------------|------|--------|---------------|---------|
| `text-sm` | 14px | 400 | `--text-foreground` | Standard body text |
| `text-xs` | 12px | 500-600 | `--text-secondary` | Labels, metadata |
| `text-[13px]` | 13px | 500-600 | `--text-foreground` | Card content, form text |
| `text-[12px]` | 12px | 500 | `--text-muted` | Supporting info |
| `text-[11px]` | 11px | 600-700 | `--text-subtle` | Timestamps, counts |
| `text-[10px]` | 10px | 700 | `--text-subtle` | Category labels, caps |
| Custom `2xs` | 10px | – | – | Defined in Tailwind config |
| Custom `xs` | 11px | – | – | Defined in Tailwind config |

---

## Caps Label Style

`.label-caps` — used for section headers, category names, stat card labels:
```css
.label-caps {
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--text-subtle);
}
```

Used heavily in: reward page stat cards, table headers, form field labels in admin.

---

## Keyboard Shortcut Style

`.kbd` — for displaying keyboard shortcuts:
```css
.kbd {
  font-family: var(--font-mono);
  font-size: 10px;
  font-weight: 600;
  background: var(--bg-elevated);
  border: 1px solid var(--border-strong);
  color: var(--text-subtle);
  padding: 2px 6px;
  border-radius: var(--r-xs);  /* 6px */
}
```

Used in: Command palette, onboarding tooltips.

---

## AI Prose Style (`.prose-ai`)

Special style for AI-generated markdown output:

```css
.prose-ai {
  line-height: 1.75;
  color: var(--text-foreground);
  font-size: 14px;
}
```

Elements within `.prose-ai`:
- Paragraphs: `margin-bottom: 0.75rem`
- H1: 1.2rem
- H2: 1.05rem
- H3: 0.95rem
- Inline code: accent-colored, accent-muted background, monospace font
- Pre/code blocks: elevated background, border, radius 12px
- Blockquotes: 2px left accent border, italic, muted color
- Links: accent color with underline

---

## Gradient Text

`.gradient-text` — used for hero stats, rewards balance:
```css
background: linear-gradient(135deg, var(--accent) 0%, #C084FC 60%, var(--energy) 100%);
-webkit-background-clip: text;
-webkit-text-fill-color: transparent;
```

`.gradient-text-subtle` — softer variant for headings:
```css
background: linear-gradient(135deg, var(--accent) 0%, #A5B4FC 100%);
```

---

## Tabular Numbers

`.tabular { font-variant-numeric: tabular-nums; }` — used in:
- Stat card values (prevents layout shift as numbers change)
- Reward point balances
- Time displays

---

## Responsive Typography

The base font size is fixed at 14px on `html`. Components use pixel values directly rather than rem-based responsive scaling. This means the app does not scale typography with browser zoom in the traditional way.

**[Improvement needed]**: Implement a fluid type scale using `clamp()` for better mobile readability.

---

## Font Loading Strategy

Fonts are loaded via `next/font/google` with:
- `display: 'swap'` — shows system fallback until web font is ready (no FOIT)
- Variables injected as CSS custom properties on `<html>`
- No flash of unstyled text on first meaningful paint
- System font stack fallbacks: `system-ui`, `sans-serif` for all families

---

## Line Height Guide

| Context | Line Height | Rationale |
|---------|-------------|-----------|
| Display/hero headings | 1.1 | Tight for large text — visually impactful |
| Section headings | 1.2 | Comfortable at 16–20px |
| Body text | 1.5 | Optimal reading rhythm at 13–14px |
| AI prose | 1.75 | Extended reading comfort |
| One-line labels | 1.4 | Single-line truncation safety |

---

## Letter Spacing Guide

| Usage | Value | Reason |
|-------|-------|--------|
| Hero headings | -0.035em | Tight for large display type |
| Section headings | -0.025em | Slightly tight for polish |
| Body text | 0 (default) | Neutral |
| All-caps labels | +0.08em | Wide tracking improves legibility at small caps sizes |
| Monospace code | +0.02em | Slight wide for code readability |
| Badge text | +0.01em | Micro-tracking for small pill text |
