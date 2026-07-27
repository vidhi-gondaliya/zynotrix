# ZYNOTRIX — SEO

## Current SEO Status

**Overall SEO Score**: 2/10

ZYNOTRIX is a logged-in SaaS application. Most pages are behind authentication, making traditional SEO largely irrelevant for those pages. However, the public-facing pages and the marketing potential of the product are currently under-optimized.

---

## Current Metadata

### Root Layout (`src/app/layout.tsx`)

```typescript
export const metadata: Metadata = {
  title: "ZYNOTRIX — Smart Workspace",
  description: "AI-powered task management and team collaboration platform",
};
```

**Applied to**: All pages (no per-page overrides found in the codebase).

**Issues**:
- Single title for the entire app — no per-page titles
- Description is generic and not keyword-optimized
- No Open Graph tags
- No Twitter Card tags
- No canonical URLs
- No JSON-LD structured data

---

## Pages That Could Benefit from SEO

### Currently SEO-Relevant

| Page | URL | Indexable? | Notes |
|------|-----|-----------|-------|
| Root redirect | `/` | Yes | Redirects immediately — no content |
| Login | `/login` | Limited | Should have noindex |
| Register | `/register` | Yes | Marketing opportunity — "Sign up for ZYNOTRIX" |
| Client Portal | `/portal/[token]` | No (token-based) | Private by design |

### Should NOT Be Indexed

All `/dashboard`, `/projects`, `/tasks`, etc. — behind auth. Should have `robots: noindex` meta tag or X-Robots-Tag header.

---

## Robots Configuration

**[MISSING]** — No `robots.txt` file in the project. No `src/app/robots.ts` Next.js config.

**Recommended `robots.txt`**:
```
User-agent: *
Allow: /
Allow: /register
Disallow: /dashboard
Disallow: /projects
Disallow: /tasks
Disallow: /chat
Disallow: /admin
Disallow: /api
Sitemap: https://yourdomain.com/sitemap.xml
```

---

## Open Graph Tags

**[MISSING]** — No OG meta tags defined.

**Recommended** (add to root layout or per-page metadata):
```typescript
export const metadata: Metadata = {
  title: "ZYNOTRIX — AI-Powered Team Workspace",
  description: "Manage projects, tasks, and team collaboration in one AI-powered workspace. Free to start.",
  openGraph: {
    title: "ZYNOTRIX — AI-Powered Team Workspace",
    description: "Replace Jira + Slack with one intelligent workspace.",
    url: "https://zynotrix.com",
    siteName: "ZYNOTRIX",
    images: [{ url: "/og-image.png", width: 1200, height: 630 }],
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "ZYNOTRIX — Smart Workspace",
    description: "AI-powered task management for growing teams.",
    images: ["/og-image.png"],
  },
};
```

---

## Sitemap

**[MISSING]** — No `sitemap.xml` and no `src/app/sitemap.ts`.

**Recommended** (minimal sitemap for public pages):
```typescript
// src/app/sitemap.ts
export default function sitemap() {
  return [
    { url: "https://zynotrix.com", lastModified: new Date() },
    { url: "https://zynotrix.com/register", lastModified: new Date() },
    { url: "https://zynotrix.com/login", lastModified: new Date() },
  ];
}
```

---

## Performance Impact on SEO

Next.js Core Web Vitals directly affect Google rankings:

| Metric | Current Concern | Impact |
|--------|----------------|--------|
| LCP | All pages are CSR with loading skeletons — LCP is deferred | High |
| CLS | Skeleton → content swap may cause layout shift | Medium |
| FID/INP | Heavy JavaScript bundle | Medium |
| TTFB | Neon cold starts add ~100ms | Low |

---

## Missing SEO Improvements (Priority Order)

### P0 — Critical
1. Add `robots.txt` to block auth pages
2. Add OG image (`/public/og-image.png`) and meta tags
3. Add per-page `<title>` tags (Next.js `generateMetadata()`)

### P1 — Important
4. Create a proper landing page at `/` instead of immediate redirect
5. Add `sitemap.xml` for public pages
6. Add JSON-LD structured data for the SaaS product

### P2 — Nice to Have
7. Add canonical URL meta tags
8. Implement SSR for the `/portal/[token]` page (client portals could be indexed if made public)
9. Add `hreflang` when localization is added

---

## Landing Page SEO Opportunity

Currently `/` redirects immediately to `/dashboard` or `/login`. A proper landing page would:
- Be indexed by search engines
- Convert organic traffic to signups
- Allow SEO-optimized headlines, features, and copy

**Recommended URL structure**:
```
/               — Landing page (public, SEO-optimized)
/login          — Login (noindex)
/register       — Signup (index — "ZYNOTRIX sign up")
/app/dashboard  — Move authenticated app to /app/* prefix
```

---

## Meta Tags Checklist

- [ ] `<title>` per page
- [ ] `<meta name="description">` per page
- [ ] `og:title`, `og:description`, `og:image`
- [ ] `twitter:card`, `twitter:title`, `twitter:image`
- [ ] `<link rel="canonical">`
- [ ] `robots` meta for authenticated pages
- [ ] Favicon + Apple touch icon
- [ ] Theme-color meta tag
