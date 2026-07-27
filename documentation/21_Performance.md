# ZYNOTRIX — Performance

## Architecture Performance Baseline

ZYNOTRIX is a client-side-rendered (CSR) Next.js application with no server-side rendering for authenticated pages. This baseline means:

- **First Contentful Paint (FCP)**: Delayed until JavaScript executes and first fetch completes
- **Largest Contentful Paint (LCP)**: Skeleton loaders appear first, then real content
- **Time to Interactive (TTI)**: High — large JS bundle + data fetches before interactivity
- **Cumulative Layout Shift (CLS)**: Risk during skeleton → content transitions

---

## Bundle Strategy

### JavaScript
Next.js 14 App Router with Turbopack (dev mode: `next dev --turbo`). Production build uses standard Webpack.

**Code splitting**: Next.js automatically code-splits by page (route). Each page loads its own JS chunk.

**Client boundaries**: All pages use `"use client"` — the entire app is essentially a traditional SPA. No Server Components used for data-fetching, which means no streaming HTML from server.

**Bundle concerns**:
- `framer-motion`: ~30KB gzipped — heavy for an animation library
- `recharts`: ~70KB gzipped — full SVG charting library
- `@dnd-kit`: ~15KB gzipped
- `react-big-calendar`: ~45KB gzipped
- `googleapis`: Large server-only package — must not be bundled client-side
- `exceljs`: Large — should only be loaded on the import-export page

**[IMPROVEMENT]**: Use `dynamic()` with `{ ssr: false }` for heavy components that aren't needed on every page:
```typescript
const ReactBigCalendar = dynamic(() => import("react-big-calendar"), { ssr: false });
```

---

## Lazy Loading

### Images
**[MISSING]** — `next/image` is not used anywhere in the codebase. All avatars use `<img>` tags. User-uploaded images (via URL) are not optimized.

Recommended: Replace all `<img>` tags with `next/image` for automatic:
- WebP conversion
- Responsive sizes
- Lazy loading
- `alt` text enforcement

### Component Lazy Loading
**[PARTIAL]** — Some modal components are conditionally rendered (not pre-loaded). Heavy libraries like `react-big-calendar` load eagerly on every page that might show meetings.

---

## Caching

### API Response Caching
**[NONE]** — All API route responses have no explicit cache headers. Next.js App Router defaults to no caching for dynamic routes.

Opportunities:
```typescript
// Add to API responses that change infrequently
return NextResponse.json(data, {
  headers: { "Cache-Control": "s-maxage=60, stale-while-revalidate=300" }
});
```

### Client-Side Caching
**[NONE]** — No React Query, no SWR. Data is re-fetched on every page visit.

### Static Assets
Next.js automatically serves `/_next/static/` with long cache headers. CSS, JS chunks, and fonts are cached indefinitely.

---

## Database Performance

### Query Optimization

Potential N+1 issues identified:

1. **Dashboard** fetches tasks, then for each task fetches project — use `include: { project: true }` instead **[Inferred — review actual query]**

2. **Reward badge check** — no memoization; every task completion could trigger a full badge scan

3. **Search index** — full-text search on the `content` column has no PostgreSQL `GIN` index defined — scanning full table for each search

### Indexes
Critical indexes defined in schema:
- `tasks [projectId, status]` — Kanban queries
- `tasks [assigneeId]` — My tasks filter
- `messages [channelId, createdAt]` — Chat history

**[MISSING]**: No index on `search_index.content` for full-text search. Full table scans on every search query.

---

## Real-Time Performance

### SSE Connections
- Each SSE connection holds an open HTTP connection
- On Vercel Serverless, function instances handle connections one at a time
- Multiple users connecting to the same channel use different function instances (cannot share module-level subscriber map)

**Maximum concurrent SSE connections**: Limited by Vercel concurrent function count (varies by plan).

### Chat Performance
Loading the last 50 messages per channel on every navigation to a chat room. No message pagination, no virtual scrolling.

For channels with 1000+ messages, this is a significant performance issue. **[MISSING: pagination]**

---

## Image Optimization

Currently:
- Avatar images are loaded from external URLs (GitHub, Google) directly via `<img>` tags
- No compression, no WebP conversion, no lazy loading
- No `alt` attributes on most avatar images

Recommended:
```tsx
<Image
  src={user.image || "/default-avatar.png"}
  alt={user.name || "User"}
  width={36}
  height={36}
  className="rounded-full"
/>
```

---

## Known Performance Bottlenecks

| Bottleneck | Impact | Fix |
|------------|--------|-----|
| No client caching | High — same data re-fetched on every navigation | Add React Query / SWR |
| CSR-only pages | High — extra round-trip before content | Add SSR for key data |
| No lazy chart loading | Medium — recharts loaded on all pages | Dynamic import |
| No virtual scrolling in task lists | Medium — lists >100 items get slow | Add windowing (react-window) |
| Search without FTS index | Medium — grows with data | Add PostgreSQL GIN index |
| All JS in one hydration | Medium — large TTI | Better code-splitting |
| No image optimization | Low-Medium | Use next/image |
| Neon cold starts | Low | Use connection pooling URL |

---

## Vercel Edge Configuration

**[MISSING]** — No `vercel.json` configuration file found.

Recommended `vercel.json`:
```json
{
  "functions": {
    "src/app/api/ai/**": {
      "maxDuration": 60
    },
    "src/app/api/channels/*/sse/route.ts": {
      "maxDuration": 300
    }
  }
}
```

**Why**: AI streaming routes need >10s timeout (default Hobby limit). SSE routes need extended duration to maintain connections.

---

## Performance Measurement

**[MISSING]** — No performance monitoring setup. No:
- Vercel Analytics integration
- Core Web Vitals tracking
- Error monitoring (Sentry, Datadog)
- API response time logging

---

## Quick Performance Wins

1. **Add `vercel.json`** to set AI route timeouts (30 minutes, 0 cost)
2. **Add `react-query`** for dashboard data caching (1 day, high impact)
3. **Dynamic import `recharts`** and `react-big-calendar` (2 hours, medium impact)
4. **Add `next/image`** for avatar rendering (1 day, medium impact)
5. **Add GIN index** on `search_index.content` (30 minutes, high search impact)
6. **Paginate chat messages** to load 50 at a time on scroll (1 day)
