# ZYNOTRIX — Authentication

## Overview

ZYNOTRIX uses **NextAuth v5** (beta, also called Auth.js) with the **JWT session strategy**. This means user session data lives in an encrypted cookie rather than a database session record.

**Library**: `next-auth@^5.0.0-beta.31`  
**Adapter**: `@auth/prisma-adapter` (handles OAuth account storage)  
**Strategy**: JWT (not database sessions)  
**Config file**: `src/lib/auth.ts`

---

## Authentication Providers

### 1. Credentials Provider

Email + password authentication backed by bcrypt.

**Flow**:
1. User submits `{ email, password }` to NextAuth
2. `authorize()` callback fetches user by email from DB
3. `bcrypt.compare(password, user.passwordHash)` validates
4. Returns user object `{ id, email, name, image, role }` on success
5. Returns `null` on failure (NextAuth shows error on `/login`)

**Password hashing**: `bcryptjs` (pure JS, no native bindings — safe for Vercel edge)

### 2. Google OAuth Provider

**Conditional**: Only registered if `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` are set in environment.

**Scopes requested**:
- `openid email profile` — standard user info
- `https://www.googleapis.com/auth/calendar.events` — Google Calendar integration

**Flow**:
1. User clicks "Continue with Google"
2. Redirect to Google consent screen
3. Google redirects to `/api/auth/callback/google`
4. PrismaAdapter creates/links `Account` record to `User`
5. JWT callback runs to set `organizationId` etc.

**Note**: Google OAuth requires `GOOGLE_CLIENT_ID` + `GOOGLE_CLIENT_SECRET` to be configured. Without them, only credentials login is available.

---

## JWT Token Structure

The JWT contains these fields after the callback chain runs:

```typescript
{
  // Standard NextAuth
  sub: string;          // User ID (built-in NextAuth field)
  iat: number;          // Issued at
  exp: number;          // Expires at
  jti: string;          // JWT ID

  // Custom fields (set by jwt() callback)
  id: string;           // User ID (explicit copy of sub for consistency)
  role: string;         // User's system role (MEMBER, ADMIN, etc.)
  organizationId: string | null;   // Current org ID
  orgRole: string | null;          // Role within org (OWNER, ADMIN, MANAGER, MEMBER)
  accessToken?: string; // Google OAuth access token (for Calendar API)
}
```

**Important**: The `id` field is explicitly set as `token.id = token.sub` to handle cases where `token.sub` is the only user ID available (e.g., after OAuth sign-in).

---

## Session Object

The session (available via `useSession()` in client or `auth()` in server) contains:

```typescript
session.user = {
  id: string;                      // From token.id ?? token.sub
  name: string | null;
  email: string;
  image: string | null;
  role: string;                    // System role
  organizationId: string | null;   // Current workspace
  orgRole: string | null;          // Role within workspace
  accessToken?: string;            // Google access token
}
```

**TypeScript**: The session type is extended via `src/types/next-auth.d.ts` **[MISSING — the file wasn't found in the glob, may be in a different location]**.

---

## Middleware (`src/middleware.ts`)

The middleware runs on every request matching the config pattern and enforces authentication rules:

```
matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\..*).*)"]
```

**Routing Rules**:

| Condition | Action |
|-----------|--------|
| Request to `/api/*` or `/portal/*` | Allow (no auth check) |
| Request to `/` (root) | Redirect → `/dashboard` (logged in) or `/login` (guest) |
| Not logged in + not auth page | Redirect → `/login?callbackUrl={pathname}` |
| Logged in + on auth page (`/login`, `/register`) | Redirect → `/dashboard` |
| Logged in + no org + not `/create-workspace` | Redirect → `/create-workspace` |
| All other requests | Allow through |

**Note**: API routes are not guarded by middleware — they use `requireOrg()` / `auth()` internally.

---

## `requireOrg()` Helper

**File**: `src/lib/org.ts`

The primary server-side auth guard for API routes:

```typescript
export async function requireOrg(): Promise<OrgContext | NextResponse>
```

**Returns** either:
- `OrgContext { orgId, userId, orgRole, userName, userAccessToken, session }` — on success
- `NextResponse` with 401 or 403 — on failure

**Usage pattern** (every protected API route):
```typescript
const ctx = await requireOrg();
if (isOrgError(ctx)) return ctx;
const { orgId, userId } = ctx;
// ... use orgId for all DB queries
```

This pattern ensures every query is scoped to the organization, implementing row-level multi-tenancy.

---

## Protected Routes

### API Routes
All API routes except `/api/auth/*`, `/api/portal/*`, and public endpoints use `requireOrg()` or `auth()`.

### Page Routes
The middleware protects all non-auth pages automatically. The `(app)` route group assumes the user is authenticated.

### Permission-Gated Routes
Some pages check specific permissions:

```typescript
import { hasPermission } from "@/lib/permissions";
if (!hasPermission(ctx.orgRole, "admin:access")) {
  return NextResponse.json({ error: "Forbidden" }, { status: 403 });
}
```

---

## Registration Flow

**Endpoint**: `POST /api/auth/register`

1. Validates email + password present
2. Checks for duplicate email in DB
3. Hashes password: `bcrypt.hash(password, 12)` — cost factor 12
4. Creates user with `role: "MEMBER"` default
5. Returns `{ id, email, name }` with 201

**Auto-login after register**: The register page calls `signIn("credentials", ...)` after successful registration.

---

## Session Persistence

Sessions use JWT stored in an HttpOnly cookie:
- Cookie name: `authjs.session-token` (NextAuth v5 default)
- Encrypted with `AUTH_SECRET` or `NEXTAUTH_SECRET`
- Default expiry: 30 days [NextAuth default]

---

## Session Updates

The JWT can be updated client-side via `update()` (from `useSession()`):

```typescript
// After workspace creation
update({ organizationId: newOrg.id, orgRole: "OWNER" })
```

The `jwt()` callback handles this:
```typescript
if (trigger === "update" && sessionData) {
  if (sessionData.organizationId !== undefined) token.organizationId = sessionData.organizationId;
  if (sessionData.orgRole !== undefined) token.orgRole = sessionData.orgRole;
}
```

---

## Security Considerations

### Strengths
1. **bcrypt** password hashing (cost factor 12) — industry standard
2. **HttpOnly cookie** — JWT not accessible from JavaScript
3. **Org isolation** — `requireOrg()` enforces `organizationId` on all queries
4. **No credential exposure** — passwords never returned in API responses
5. **Environment-gated** OAuth — Google provider only loads if keys are present

### Weaknesses / Known Issues

1. **[MISSING]** No rate limiting on `/api/auth/register` — susceptible to email enumeration and signup spam
2. **[MISSING]** No CSRF protection on API routes (Next.js App Router handles CSRF for form actions, but fetch-based API calls rely on SameSite cookie)
3. **[MISSING]** No email verification — accounts are active immediately
4. **[MISSING]** No "forgot password" flow
5. **[MISSING]** No session invalidation mechanism (JWTs can't be revoked until they expire)
6. **[INCOMPLETE]** Google access token stored in JWT — token refresh not implemented (expires after 1 hour)

---

## Auth Secret Configuration

The secret is read from:
```typescript
secret: process.env.NEXTAUTH_SECRET ?? process.env.AUTH_SECRET
```

Both environment variable names are supported for compatibility between NextAuth v4 (NEXTAUTH_SECRET) and v5 (AUTH_SECRET).

---

## TypeScript Types (Custom Session Fields)

The `next-auth` module is augmented to add custom fields:

```typescript
// [MISSING FILE — may be in src/types/next-auth.d.ts or similar]
declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      role: string;
      organizationId: string | null;
      orgRole: string | null;
      accessToken?: string;
    } & DefaultSession["user"]
  }
  interface User {
    role?: string;
  }
}
declare module "next-auth/jwt" {
  interface JWT {
    id?: string;
    role?: string;
    organizationId?: string | null;
    orgRole?: string | null;
    accessToken?: string;
  }
}
```
