# ZYNOTRIX — Improvement Roadmap

Each item is scored on:
- **Impact**: 1 (trivial) → 5 (game-changing)
- **Complexity**: 1 (trivial) → 5 (very hard)
- **Priority**: Impact ÷ Complexity (higher = do first)

---

## Tier 1 — Quick Wins (< 1 day effort, high impact)

| # | Item | Impact | Complexity | Priority | Notes |
|---|------|--------|------------|----------|-------|
| 1 | Add `lang="en"` to `<html>` | 2 | 1 | 2.0 | One-line fix, WCAG compliance |
| 2 | Add `robots.txt` | 2 | 1 | 2.0 | Prevent auth pages from being indexed |
| 3 | Add `aria-label` to icon-only buttons | 3 | 1 | 3.0 | Fixes most critical a11y issue |
| 4 | Add `alt` text to `<img>` tags | 2 | 1 | 2.0 | Screen reader support |
| 5 | Add `vercel.json` function timeouts | 4 | 1 | 4.0 | AI features fail without this on Pro |
| 6 | Add OG meta tags and Twitter cards | 3 | 1 | 3.0 | Social sharing works properly |
| 7 | Reset form state on modal close | 2 | 1 | 2.0 | Fixes "stale form" UX bug |
| 8 | Handle `catch` blocks with user feedback | 3 | 1 | 3.0 | Replace `.catch(() => {})` |
| 9 | Add `next/image` for all avatars | 2 | 1 | 2.0 | Performance + lazy loading |
| 10 | Fix: update search index on task edit | 3 | 1 | 3.0 | KI-005 — stale search results |

---

## Tier 2 — Short-Term (1–3 days each, high value)

| # | Item | Impact | Complexity | Priority | Notes |
|---|------|--------|------------|----------|-------|
| 11 | Password reset (email + token flow) | 5 | 2 | 2.5 | KP-gap — users locked out forever |
| 12 | Fix Kanban position re-indexing on drag | 3 | 2 | 1.5 | KI-004 — position collisions |
| 13 | Enforce custom role permissions via DB | 4 | 2 | 2.0 | KI-002 — security bug |
| 14 | Fix Google OAuth token refresh | 3 | 2 | 1.5 | KI-003 — Calendar breaks after 1h |
| 15 | Add rate limiting on auth routes | 4 | 2 | 2.0 | KI-006 — brute force prevention |
| 16 | Add Zod validation to all API routes | 3 | 2 | 1.5 | Consistent input validation |
| 17 | Add `prefers-reduced-motion` to animations | 2 | 2 | 1.0 | WCAG 2.3.3 compliance |
| 18 | Sprint velocity auto-calculation | 3 | 2 | 1.5 | KI-012 — velocity field unused |
| 19 | Audit log admin UI | 3 | 2 | 1.5 | Admins need visibility |
| 20 | Add task comments | 4 | 3 | 1.33 | Top requested collaboration feature |

---

## Tier 3 — Medium-Term (1–2 weeks each)

| # | Item | Impact | Complexity | Priority | Notes |
|---|------|--------|------------|----------|-------|
| 21 | Email notifications (Resend/SendGrid) | 5 | 3 | 1.67 | Async notification loop critical |
| 22 | User invitation by email link | 4 | 3 | 1.33 | Onboarding blocker for teams |
| 23 | Add React Query for data caching | 4 | 3 | 1.33 | Major perceived performance boost |
| 24 | Org-switching UI | 3 | 3 | 1.0 | Multi-org users blocked |
| 25 | Mobile responsive layout | 4 | 4 | 1.0 | Mobile users see broken layout |
| 26 | Task file attachments (S3) | 4 | 3 | 1.33 | Common enterprise requirement |
| 27 | Bulk task operations | 3 | 3 | 1.0 | Productivity for PMs |
| 28 | Budget tracking UI | 3 | 2 | 1.5 | Schema exists, no UI |
| 29 | Add Vitest unit tests for permissions | 4 | 2 | 2.0 | Security regression prevention |
| 30 | Add PostgreSQL GIN index on search | 3 | 1 | 3.0 | Search performance at scale |

---

## Tier 4 — Large Investments (2–4 weeks each)

| # | Item | Impact | Complexity | Priority | Notes |
|---|------|--------|------------|----------|-------|
| 31 | Replace SSE with Pusher/Ably | 5 | 4 | 1.25 | KI-001 — production requirement |
| 32 | Landing page / marketing site | 5 | 3 | 1.67 | Zero organic growth without this |
| 33 | Full WCAG AA audit and remediation | 3 | 4 | 0.75 | Enterprise clients may require |
| 34 | E2E test suite (Playwright) | 4 | 3 | 1.33 | Quality confidence |
| 35 | Migrate tags to relational Tag model | 3 | 4 | 0.75 | KI-009 — enables tag filtering |
| 36 | PDF report export | 3 | 3 | 1.0 | Management presentations |
| 37 | Scheduled automated reports | 3 | 3 | 1.0 | Weekly digest emails |
| 38 | WhatsApp notification integration | 2 | 3 | 0.67 | Schema ready, provider needed |
| 39 | GitHub PR → Task auto-linking | 3 | 3 | 1.0 | Developer workflow integration |
| 40 | Document collaborative editing (Yjs) | 4 | 5 | 0.8 | Real-time doc co-authoring |

---

## Tier 5 — Strategic Bets (Months of work)

| # | Item | Impact | Complexity | Notes |
|---|------|--------|------------|-------|
| 41 | Native mobile app (React Native) | 5 | 5 | iOS + Android support |
| 42 | Zapier / Make.com integration | 4 | 4 | Workflow automation connectors |
| 43 | Self-hosted (Docker) deployment | 4 | 4 | Enterprise private cloud |
| 44 | Time zone per-user setting | 3 | 3 | International teams |
| 45 | AI task auto-prioritization | 4 | 4 | Intelligent workload management |
| 46 | Multi-language support (i18n) | 3 | 4 | Non-English markets |
| 47 | Billing + subscription management | 5 | 4 | Required to monetize |
| 48 | API public access + developer SDK | 4 | 4 | Platform ecosystem |
| 49 | Migrate to Prisma migration files | 3 | 3 | Production database safety |

---

## Recommended Sprint 1 (Next 2 Weeks)

### Security Sprint
Focus on fixing the most critical security and stability issues before any new features:

1. Fix KI-002 (custom role permissions)
2. Add rate limiting on auth routes
3. Add Zod validation to all mutation routes
4. Fix Google OAuth token refresh
5. Add `vercel.json` with function timeouts

### Quick Quality Pass
6. Add `lang="en"` to layout
7. Add `aria-label` to icon buttons
8. Fix `.catch(() => {})` error swallowing
9. Fix form reset on modal close
10. Update search index on task edit

**Estimated effort**: 2 engineers × 2 weeks = 20 developer-days  
**Expected outcome**: Production-ready security baseline, meaningful quality improvements

---

## Success Metrics Per Initiative

| Initiative | Metric to Track |
|-----------|----------------|
| Email notifications | % users with email channel enabled |
| Landing page | Monthly organic signups from SEO |
| Rate limiting | Auth endpoint abuse events blocked |
| Mobile layout | Mobile session duration (currently ~0) |
| React Query | Dashboard load time reduction |
| Task comments | Messages in task comments vs. chat |
