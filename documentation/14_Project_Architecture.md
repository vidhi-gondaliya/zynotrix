# ZYNOTRIX — Project Architecture

## Architecture Overview

ZYNOTRIX is a **full-stack Next.js monolith** — both the frontend and backend live in the same Next.js 14 App Router application. There is no separate API server, no microservices, no message queue.

```
┌─────────────────────────────────────────────────────┐
│                    VERCEL EDGE                       │
│  ┌──────────────┐  ┌────────────────────────────┐   │
│  │  Middleware  │  │   Next.js App Router        │   │
│  │  (auth guard)│  │   ├── Server Components     │   │
│  └──────────────┘  │   ├── Client Components     │   │
│                    │   ├── API Route Handlers     │   │
│                    │   └── Server Actions [N/A]   │   │
│                    └────────────────────────────┘   │
└─────────────────────────────────────────────────────┘
         │                           │
         ▼                           ▼
┌─────────────────┐       ┌──────────────────────┐
│   Neon Postgres │       │   External Services   │
│   (serverless   │       │   - Anthropic API     │
│    connection   │       │   - Google APIs       │
│    pooling)     │       │   - Slack/GitHub      │
└─────────────────┘       └──────────────────────┘
```

---

## Rendering Strategy

| Route Type | Strategy | Reason |
|------------|----------|--------|
| Auth pages (`/login`, `/register`) | CSR (Client Component) | Form interactivity |
| App pages (`/dashboard`, `/projects`, etc.) | CSR (Client Component) | Interactive, session-dependent |
| API routes | Server | Data access, auth |
| Portal (`/portal/[token]`) | SSR potential, currently CSR | Public read-only |
| Root layout | Server | Font loading, SessionProvider |

**Note**: Almost all pages in ZYNOTRIX use `"use client"` directive. The application is effectively a CSR SPA wrapped in Next.js App Router. This is a deliberate tradeoff for interactivity at the cost of SEO and initial load performance.

### Why Not SSR?

The main app pages require session data that is only available client-side (via `useSession()`). All dashboard data is fetched client-side with `useEffect`. This pattern is simpler to reason about but means:
- No server-side data on initial render
- Loading states on every page
- No SEO for protected pages (acceptable — they're behind auth)

### Potential SSR Improvement

The portal (`/portal/[token]`) should be SSR for SEO and faster load, but currently renders client-side.

---

## Multi-Tenancy Design

### Row-Level Isolation

ZYNOTRIX implements **application-level row-level security (RLS)**. Every query to shared tables includes an `organizationId` filter:

```typescript
// Pattern: every API route fetches ctx first
const ctx = await requireOrg();
const { orgId } = ctx;

// All DB queries scoped by orgId
await prisma.project.findMany({
  where: { organizationId: orgId }
});
```

This is enforced by:
1. `requireOrg()` — extracts `orgId` from JWT and returns it in context
2. Developer convention — every DB call MUST use `orgId` from context
3. **[MISSING]** No database-level RLS policies — relies entirely on application code

### Tenant Isolation Guarantees

- Users can only see data from their organization
- The `organizationId` FK on all major tables enforces data belonging
- Cross-org data access would require a compromised JWT or a developer bug

### Known Limitation

A user with a manipulated JWT could potentially access another org's data if they guessed a valid `organizationId`. This would require knowing the CUID of another org AND bypassing JWT signature verification — very unlikely in practice, but no defense-in-depth.

---

## Data Flow

### Typical API Request Flow

```
Browser
  → Fetch /api/projects
  → Middleware (validates cookie, extracts JWT)
  → API Route Handler (GET /api/projects/route.ts)
  → requireOrg() (extracts orgId, userId from JWT)
  → Prisma query (WHERE organizationId = orgId)
  → Neon PostgreSQL
  → Prisma response
  → NextResponse.json(data)
  → Browser (updates React state)
```

### Real-Time (SSE) Flow

```
Browser opens SSE connection
  → GET /api/channels/[channelId]/sse
  → Route adds controller to channelSubscribers Map
  → Sends keep-alive: ": connected\n\n"
  → Connection held open

Server-side event (another user sends message)
  → POST /api/channels/[channelId]/messages
  → broadcastToChannel(channelId, message)
  → Iterates all controllers for that channel
  → Enqueues encoded data to each controller
  → Browser EventSource fires "message" event
  → React state updates → UI re-renders
```

### SSE Architecture Limitations

- SSE subscribers are stored in module-level `Map<string, Set<Controller>>`
- **Works correctly on single-server deployments** (Vercel Serverless Functions)
- **Does NOT work with multiple server instances** — subscribers are in-memory, not shared
- Vercel Serverless: each function invocation is independent — SSE streams only work as long as the same function instance handles both the subscriber AND the broadcaster
- **[KNOWN LIMITATION]** In a horizontally-scaled environment, this would require a Redis pub/sub or similar shared memory layer

---

## API Design Patterns

### REST Convention

All endpoints follow standard REST:
- `GET /api/[resource]` — list
- `POST /api/[resource]` — create
- `GET /api/[resource]/[id]` — read one
- `PUT /api/[resource]/[id]` — update
- `DELETE /api/[resource]/[id]` — delete
- `PATCH /api/[resource]/[id]/[action]` — specific action (e.g., move, archive)

### Response Shape

No consistent envelope — responses vary between endpoints:
- Some return the entity directly: `NextResponse.json(project)`
- Some return arrays: `NextResponse.json(projects)`
- Some return `{ success: true }` or `{ error: "..." }`

**[IMPROVEMENT NEEDED]** A consistent API response envelope would improve client handling and error messages.

### Error Handling

```typescript
// Typical error pattern
try {
  const result = await prisma.project.create({ ... });
  return NextResponse.json(result, { status: 201 });
} catch (error) {
  return NextResponse.json({ error: "Failed to create project" }, { status: 500 });
}
```

Most routes do NOT have try/catch — Prisma errors propagate as 500s with Next.js default error handling.

---

## State Management Architecture

See `17_State_Management.md` for full detail.

Summary:
- **Server state**: Fetched with `useEffect` + `useState` — no React Query or SWR
- **UI state**: Local `useState`
- **Auth state**: NextAuth `useSession()` hook
- **Notifications**: Zustand store (`useNotifications`)
- **Chat**: Zustand store (`useChat`)
- **Theme**: Zustand store (`useTheme`)

---

## Prisma Connection Pattern

**File**: `src/lib/prisma.ts`

```typescript
const globalForPrisma = globalThis as unknown as { prisma: PrismaClient };
export const prisma = globalForPrisma.prisma ?? new PrismaClient();
if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
```

**Why**: Prevents multiple Prisma Client instances during Next.js hot-reload in development. In production, each serverless function has its own instance.

**Neon**: Uses `DATABASE_URL` with Neon's connection string format which includes `?sslmode=require` and connection pooling via Neon's pooler endpoint.

---

## AI Integration Architecture

**File**: `src/lib/claude.ts`

Two modes:
1. **Streaming** (`streamToResponse`): Returns a `ReadableStream` that pipes Anthropic streaming tokens to the client. Used for AI chat, assistant, reports.
2. **JSON** (`generateJSON<T>`): Awaits full response, extracts and parses JSON. Used for health scoring, project templates, NLP task parsing.

Models:
- Default: `claude-opus-4-5` (or `CLAUDE_MODEL` env var)
- Fast: `claude-haiku-4-5-20251001` (for quick operations)

---

## Folder Architecture Decision

### Why No Feature-Based Folders?

The app uses a **layer-based** structure (`components/`, `lib/`, `hooks/`, `store/`) rather than **feature-based** (`features/tasks/`, `features/projects/`). This is simpler for a team of one but would become difficult to maintain past ~20+ features.

**[Recommendation]**: Migrate to feature-based colocation as the codebase grows. E.g., `src/features/tasks/` containing components, hooks, and API types for tasks.

---

## Build Process

```
prisma generate && next build
```

`prisma generate` runs first to ensure the Prisma Client is up-to-date before Next.js compiles. This is important because the Prisma Client is generated code that Next.js imports.

---

## Environment Boundaries

| Runs on | Files |
|---------|-------|
| Server only | `src/lib/prisma.ts`, `src/lib/auth.ts`, `src/lib/claude.ts`, `src/lib/sse.ts`, `src/lib/notifications.ts`, all `src/app/api/` routes |
| Client only | All components in `src/components/`, all pages with `"use client"` |
| Both | `src/lib/permissions.ts`, `src/lib/cn.ts`, `src/types/` |

**Security**: The `prisma` singleton and Anthropic API key MUST never be imported in client-side code. Next.js enforces this by erroring if server-only modules are bundled for the client.
