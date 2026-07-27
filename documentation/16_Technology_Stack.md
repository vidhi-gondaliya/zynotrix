# ZYNOTRIX — Technology Stack

## Core Framework

### Next.js 14.2.35
**Why**: Full-stack React framework with App Router. Provides file-based routing, API routes, server components, and Vercel-optimized deployment in one package. The App Router's nested layouts perfectly support ZYNOTRIX's sidebar + header shell pattern.

**Alternatives considered**: Remix (similar full-stack, less Next.js ecosystem lock-in), SvelteKit (better DX but smaller community), standalone Express + React (more control, more setup).

**Trade-offs**: NextAuth v5 is in beta, which means breaking changes may occur. The `"use client"` boundary requires careful thought.

**Upgrade path**: Next.js 15 (out) — would require updating turbopack config and potentially caching behavior.

---

### React 18
**Why**: Industry-standard UI library. Concurrent features (Suspense, transitions) available but not widely used in ZYNOTRIX yet.

**Key features used**: `useState`, `useEffect`, `useRef`, `useCallback`, `useMemo`, `createContext`.

---

### TypeScript 5
**Why**: Type safety catches bugs at compile time. Prisma generates types from schema. Critical for a data-heavy app.

**Coverage**: High — most files are typed. Some `as any` casts used for Prisma JSON fields (`meta`, `config`) and for session type augmentation.

---

## Database & ORM

### Prisma 5.22.0
**Why**: Best TypeScript ORM. Auto-generated client types from schema. Excellent DX with Prisma Studio. Migration system handles schema evolution.

**Key patterns used**:
- `prisma.model.findMany({ where: { organizationId: orgId } })` — row-level filtering
- `include` for eager loading relations
- `_count` for counting related records
- `aggregate` for max position in Kanban columns
- `upsert` for attendance records (unique constraint on userId+orgId+date)

**Known workarounds**: JSON fields (tags, permissions, config) stored as `String` and parsed manually — Prisma's `Json` type isn't used.

**Upgrade path**: Prisma 6 (available) — would require reviewing breaking changes in query API.

---

### Neon PostgreSQL
**Why**: Serverless PostgreSQL that auto-scales to zero. No server to manage. Vercel integration makes connection string injection seamless. HTTP connection pooling via Neon Proxy.

**Trade-offs**: Neon has cold starts (~100ms) on serverless connections. For high-throughput apps, standard PostgreSQL with PgBouncer would be better.

**Upgrade path**: Can migrate to any PostgreSQL-compatible DB by changing `DATABASE_URL`.

---

## Authentication

### NextAuth v5 (^5.0.0-beta.31)
**Why**: Provides credentials + OAuth in a few lines. Deep Next.js App Router integration. The beta supports middleware natively.

**Key features used**: JWT strategy, Credentials provider, Google provider, PrismaAdapter, jwt/session callbacks, `update()` for org injection.

**Risk**: v5 is beta — API may change. Consider pinning to a specific release.

**Alternatives**: Lucia Auth (lighter, more control), Clerk (hosted auth, less code but paid), Auth0 (enterprise, expensive).

---

### @auth/prisma-adapter
**Why**: Connects NextAuth to Prisma automatically — handles Account/Session/VerificationToken models.

---

### bcryptjs 3.0.3
**Why**: Pure JavaScript bcrypt implementation — works on Vercel Edge without native bindings. Slower than native bcrypt but compatible everywhere.

---

## AI

### @anthropic-ai/sdk ^0.104.1
**Why**: Official Anthropic TypeScript SDK. Streaming support. Well-maintained.

**Models used**:
- `claude-opus-4-5` — primary model (smart, slower)
- `claude-haiku-4-5-20251001` — fast model (quick JSON generation)
- Configurable via `CLAUDE_MODEL` env var

**Usage modes**:
- `claude.messages.stream()` — for streaming chat responses
- `claude.messages.create()` — for JSON generation

**Cost consideration**: Opus is significantly more expensive than Haiku. High AI feature usage could spike costs.

---

## UI & Animation

### Tailwind CSS 3.4.1
**Why**: Utility-first CSS. Excellent for consistent spacing, responsive layouts, and custom design tokens. All colors, fonts, shadows are CSS variables mapped to Tailwind tokens.

**Custom extensions**: Colors (all use CSS var references), font families, border radius, box shadows, animations, gradient backgrounds.

---

### Framer Motion ^12.40.0
**Why**: Production-quality animation library for React. Spring physics, `AnimatePresence` for exit animations, WAAPI acceleration.

**Usage**: Page transitions, modal/dropdown enter/exit, tab switches, staggered list items, progress bars, badge pop-ins.

**Bundle impact**: ~30KB gzipped. Justified by animation quality but could be replaced with CSS animations for simpler cases.

---

### lucide-react ^1.17.0
**Why**: Clean, consistent icon library. Tree-shakeable. TypeScript-typed. 1000+ icons.

**Pattern**: Every icon imported individually: `import { CheckSquare, AlertTriangle } from "lucide-react"`

---

## Drag & Drop

### @dnd-kit/core ^6.3.1 + @dnd-kit/sortable ^10.0.0
**Why**: Accessible, performant DnD library for React. Better than react-beautiful-dnd (unmaintained). Works with keyboard navigation.

**Usage**: Kanban board column + task dragging.

---

## Calendar

### react-big-calendar ^1.20.0
**Why**: Full-featured React calendar. Supports month/week/day/agenda views. Used for meeting scheduling and timeline views.

**Theming**: Overridden with ZYNOTRIX CSS variables in `globals.css` (`.rbc-*` selectors).

---

## Data Visualization

### Recharts ^3.8.1
**Why**: React-native charting library. Composable SVG charts. Small bundle size.

**Charts used**: `AreaChart` (task trend), `BarChart` (team activity).

**Theming**: Custom tooltips using design system colors.

---

## Forms

### react-hook-form ^7.78.0
**Why**: Performant form state management with minimal re-renders. Used for complex forms (new project, new meeting).

**[NOTE]**: Many simpler forms in ZYNOTRIX use plain `useState` rather than react-hook-form — inconsistent pattern.

---

### Zod ^4.4.3
**Why**: Runtime type validation. Used with react-hook-form for schema-based form validation.

**Usage**: API request body validation **[INCOMPLETE — some routes validate manually, not all use Zod]**.

---

## State Management

### Zustand ^5.0.14
**Why**: Minimal, zero-boilerplate state management. No reducers, no providers needed. Perfect for simple global state.

**Stores**: `useTheme` (theme + sidebar), `useNotifications` (notification list), `useChat` (chat state).

---

## HTTP / Real-time

### Built-in fetch API
**Why**: Native browser `fetch` is sufficient for this app's needs. No Axios.

### SSE (Server-Sent Events)
**Why**: One-way server-to-client push without WebSocket overhead. Simpler infrastructure. Sufficient for notifications and chat.

**Implementation**: Custom module-level subscriber maps + ReadableStream responses.

---

## Utilities

### date-fns ^4.4.0
**Why**: Functional date utility library. Tree-shakeable. Used heavily for formatting dates, calculating distances, checking if past.

**Functions used**: `format`, `isPast`, `formatDistanceToNow`, `isToday`, `isTomorrow`.

---

### react-hot-toast ^2.6.0
**Why**: Simple, styled toast notifications. Configured with ZYNOTRIX design system colors.

---

### react-markdown ^10.1.0 + remark-gfm ^4.0.1
**Why**: Renders AI-generated markdown safely. GFM plugin adds tables, task lists, strikethrough.

---

### exceljs ^4.4.0
**Why**: Read/write Excel files for import/export. Used for bulk task import.

---

### googleapis ^173.0.0
**Why**: Official Google APIs client. Used for Google Calendar event creation (meeting scheduling).

---

## DevDependencies

| Package | Version | Purpose |
|---------|---------|---------|
| `prisma` | ^5.22.0 | CLI for migrations and generation |
| `typescript` | ^5 | TypeScript compiler |
| `tailwindcss` | ^3.4.1 | CSS framework |
| `postcss` | ^8 | CSS processing |
| `tsx` | ^4.22.4 | Run TypeScript files directly (used for seed script) |
| `@types/react` | ^18 | React type definitions |
| `@types/node` | ^20 | Node.js type definitions |
| `@types/bcryptjs` | ^2.4.6 | bcryptjs types |
| `@types/react-big-calendar` | ^1.16.3 | Calendar types |

---

## Fonts

### Plus Jakarta Sans (Google Fonts via next/font)
Primary heading font. Loaded at 400, 500, 600, 700, 800 weights.

### DM Sans (Google Fonts via next/font)
Body font. Loaded at 300, 400, 500, 600 weights.

### JetBrains Mono (Google Fonts via next/font)
Monospace font. Loaded at 400, 500, 700 weights.

**Local font files** (in `src/app/fonts/`): `GeistVF.woff` and `GeistMonoVF.woff` are present but not currently used by the layout — the Google Fonts system is used instead. **[CLEANUP NEEDED]**

---

## Version Pinning Strategy

Most dependencies use `^` (caret) semver which allows minor and patch updates. NextAuth is pinned to a beta version. `@prisma/client` is pinned exactly to `5.22.0` in dependencies (matching the `prisma` devDependency).

**Risk**: The `framer-motion ^12` major version could introduce breaking changes in future minor releases.
