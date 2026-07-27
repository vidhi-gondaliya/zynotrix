# ZYNOTRIX — Assets Inventory

A complete catalog of every static asset in the ZYNOTRIX application (excluding `node_modules`).

---

## Images and Icons

### Application-Owned Assets

| Asset | Path | Purpose | Format |
|-------|------|---------|--------|
| Favicon | `src/app/favicon.ico` | Browser tab + bookmark icon | ICO |

**All other image assets**: None. No logo files, no illustration files, no marketing images, no `og-image.png` are present in the codebase.

### Missing Assets **[MISSING]**

| Asset | Recommended Path | Purpose |
|-------|-----------------|---------|
| App logo (SVG) | `public/logo.svg` | Header branding, auth pages |
| App logo (PNG) | `public/logo.png` | Email headers, OG fallback |
| OG Image | `public/og-image.png` | Open Graph social sharing (1200×630) |
| Default avatar | `public/default-avatar.png` | Fallback when user has no profile image |
| Favicon (SVG) | `public/favicon.svg` | Modern favicon (better than .ico) |
| Apple Touch Icon | `public/apple-touch-icon.png` | iOS home screen icon (180×180) |
| Manifest icon 192 | `public/icons/icon-192.png` | PWA icon |
| Manifest icon 512 | `public/icons/icon-512.png` | PWA splash screen |

---

## User-Uploaded Content

### Storage Location
`public/uploads/[userId]/[filename]`

### Current State
One upload file found: `public/uploads/cmrc2fdgq003z3wh9ycqyn6xv/1783514525257-SunRuf.pdf` — this appears to be a test upload from development.

### Upload Mechanism **[Inferred]**
Files are uploaded to local disk storage (`public/uploads/`). This means:
1. Uploads are lost on Vercel redeploy (Vercel has no persistent disk)
2. Uploaded files are publicly accessible by URL (no auth gate)
3. No CDN delivery

**Production issue**: All uploaded files in `public/uploads/` will be wiped on every Vercel deployment. AWS S3 variables in `.env.example` suggest S3 was planned but not implemented.

---

## Fonts

All fonts are loaded via `next/font/google` in `src/app/layout.tsx`. No font files are self-hosted.

| Font | Variable | Usage |
|------|----------|-------|
| Plus Jakarta Sans | `--font-heading` | Headings, UI labels |
| DM Sans | `--font-body` | Body text, navigation |
| JetBrains Mono | `--font-mono` | Code blocks, `<kbd>` elements, keyboard shortcuts |

**Font loading strategy**: `next/font/google` automatically:
- Downloads font files at build time
- Serves from `/_next/static/` (self-hosted)
- Prevents layout shift (`display: swap`)
- Applies font-face declarations globally

No external font requests at runtime. CSP allows inline fonts.

---

## CSS and Design Tokens

| File | Path | Purpose |
|------|------|---------|
| Global CSS | `src/app/globals.css` | CSS variables, global styles, "Obsidian Command" design system |
| Tailwind Config | `tailwind.config.ts` | Token mapping, extension of Tailwind defaults |

The full design token set lives in `src/app/globals.css`. All color, spacing, typography, and animation tokens are defined as CSS custom properties.

---

## Icon Library

All icons come from the `lucide-react` package. No custom SVG icon files exist.

**Total icon count**: 1,300+ available in the `lucide-react@1.17.0` package. ZYNOTRIX uses approximately 60–80 unique icons across the app.

See `37_Icons.md` for the full list of icons used.

---

## Animation Assets

All animations are defined in CSS/JavaScript — no external `.gif`, `.lottie`, or `.webm` animation files.

| Animation Type | Implementation |
|----------------|----------------|
| Page transitions | Framer Motion `motion.div` variants |
| Loading states | CSS `@keyframes shimmer` (skeleton loading) |
| Notification rings | CSS `@keyframes pulseRing` |
| Floating elements | CSS `@keyframes floatY` |
| Spinning loaders | CSS `@keyframes spinDot` |
| Reward counters | JavaScript RAF (requestAnimationFrame) cubic easing |

---

## Third-Party Asset Dependencies

These assets are served by external providers (not bundled):

| Asset | Provider | URL Pattern | Note |
|-------|----------|-------------|------|
| User avatars | Google | `lh3.googleusercontent.com/...` | Google OAuth users |
| User avatars | GitHub | `avatars.githubusercontent.com/...` | GitHub OAuth users |
| Fonts (dev) | Google Fonts | `fonts.gstatic.com/...` | Only in development; self-hosted in production via next/font |

**Security note**: External image domains must be added to `next.config.ts` `images.remotePatterns` for `next/image` to optimize them. Currently, raw `<img>` tags are used, so this restriction doesn't apply — but it means no image optimization.

---

## Public Directory Structure

```
public/
├── uploads/                         ← User file uploads (development only)
│   └── [userId]/
│       └── [filename]
└── (everything else is MISSING)
```

**Recommended production structure**:
```
public/
├── favicon.ico                      ← Exists
├── favicon.svg                      ← MISSING
├── logo.svg                         ← MISSING
├── logo.png                         ← MISSING
├── og-image.png                     ← MISSING
├── default-avatar.png               ← MISSING
├── apple-touch-icon.png             ← MISSING
├── site.webmanifest                 ← MISSING
└── icons/
    ├── icon-192.png                 ← MISSING
    └── icon-512.png                 ← MISSING
```

---

## Asset Optimization Summary

| Asset Type | Current | Recommended |
|-----------|---------|-------------|
| Images | Raw `<img>` tags | `next/image` with optimization |
| Fonts | Google Fonts (auto self-hosted by next/font) | Already optimal |
| Icons | `lucide-react` (tree-shaken per import) | Already optimal |
| Uploads | Local disk (ephemeral) | AWS S3 or Cloudflare R2 |
| Animations | CSS + Framer Motion | Already optimal |
| SVG Logo | **MISSING** | Add `public/logo.svg` |
| OG Image | **MISSING** | Add `public/og-image.png` (1200×630) |
