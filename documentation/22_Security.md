# ZYNOTRIX — Security

## Security Posture Overview

ZYNOTRIX implements several layers of security but has meaningful gaps for a production SaaS. The core multi-tenancy isolation (orgId scoping) is solid; the weak spots are in rate limiting, output encoding, and secrets handling.

**Overall Security Score**: 5/10 (see `PROJECT_AUDIT.md` for full scoring)

---

## Authentication Security

### Session Strategy
- NextAuth v5 JWT strategy with `HttpOnly`, `Secure`, `SameSite=Lax` cookies
- Cookies are inaccessible to JavaScript (XSS-resistant)
- Token contains: `userId`, `email`, `name`, `organizationId`, `orgRole`, `accessToken`

### Password Security
- bcryptjs with default rounds (10) — acceptable for 2025
- No minimum password strength enforcement **[MISSING]**
- No maximum password length limit — bcrypt truncates at 72 bytes **[POTENTIAL ISSUE]**

### Credential Attacks
- **[MISSING]**: No rate limiting on `/api/auth/[...nextauth]` — brute force attacks are possible
- **[MISSING]**: No account lockout after N failed attempts
- **[MISSING]**: No CAPTCHA or bot detection

### Session Management
- JWT expiry: **[MISSING]** — no explicit `maxAge` set in NextAuth config — defaults to 30 days
- No session revocation mechanism (JWTs are stateless — cannot be revoked before expiry)
- Google OAuth access tokens stored in JWT — refresh not implemented

---

## Multi-Tenancy Isolation

### Implementation
Every database query is scoped by `organizationId` extracted from the JWT. The `requireOrg()` helper is called at the top of every API route.

```typescript
const ctx = await requireOrg();
if (isOrgError(ctx)) return ctx; // 401 or 403
const { orgId } = ctx;
// All queries use: where: { organizationId: orgId }
```

### Assessment
This is the strongest security feature in the codebase. Row-level isolation is consistently applied across all major models. A malicious user from Org A cannot read Org B's data.

### Risk Areas
- **[RISK]**: If an API route forgets to call `requireOrg()`, data leaks across orgs. No automated test covers this.
- **[RISK]**: Client Portal (`/portal/[token]`) uses a shared secret token, not orgId — verify this cannot be guessed

---

## Input Validation

### Zod Validation
Some API routes use Zod schemas for request body validation. This prevents injection if properly applied.

**[INCOMPLETE]**: Validation coverage is inconsistent. Some routes call `z.parse()`, others use raw `body.fieldName` without validation. No global input validation middleware.

### SQL Injection
Prisma ORM parameterizes all queries by default. Raw SQL is not used anywhere in the codebase. **SQL injection risk is very low.**

### XSS (Cross-Site Scripting)

**[RISK]**: User-generated content is rendered in several places:
- Chat messages (rendered as text — low risk if not parsed as HTML)
- Document editor content stored and rendered as Markdown
- AI responses rendered via `react-markdown`

`react-markdown` strips dangerous HTML by default. The Markdown renderer must NOT have `rehype-raw` enabled without `rehype-sanitize`.

**[ACTION REQUIRED]**: Audit all locations where user content is rendered as HTML.

---

## CSRF Protection

NextAuth v5 uses CSRF tokens for form-based auth flows. However:
- API routes accept `Content-Type: application/json` requests without CSRF checks
- This is a common pattern for JWT-authenticated APIs — the `Authorization` header pattern would be the alternative

**Assessment**: Acceptable. JSON APIs with Same-Origin cookie auth are CSRF-resistant because the browser sends cookies only for same-origin requests, and cross-origin JS cannot read the cookie value.

---

## Authorization (API-Level)

### What's Enforced
- `requireOrg()` checks authentication + org membership
- Permission checks exist on some routes

### What's Missing
- **[INCOMPLETE]**: Not all mutation routes check RBAC permissions. A MEMBER can potentially call `POST /api/projects` if they know the endpoint, depending on implementation.
- **[MISSING]**: No global authorization middleware — permissions must be manually checked in each route
- Task delete requires checking `tasks:delete` permission — verify this is implemented **[Inferred — review routes]**

---

## Rate Limiting

**[MISSING]** — No rate limiting anywhere in the application.

Critical missing rate limits:
- `/api/auth/[...nextauth]` — brute force login
- `/api/ai/*` — cost abuse (someone could drain your Anthropic API credit)
- `/api/projects`, `/api/tasks` — general API abuse

**Recommended implementation using Vercel's KV or upstash-ratelimit**:
```typescript
import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

const ratelimit = new Ratelimit({
  redis: Redis.fromEnv(),
  limiter: Ratelimit.slidingWindow(10, "1 m"),
});

const { success } = await ratelimit.limit(orgId);
if (!success) return NextResponse.json({ error: "Rate limited" }, { status: 429 });
```

---

## Secrets Management

### Environment Variable Security
- `NEXTAUTH_SECRET` / `AUTH_SECRET` — JWT signing key
- `ANTHROPIC_API_KEY` — AI cost exposure risk
- `DATABASE_URL` — Full DB access
- `GOOGLE_CLIENT_SECRET` — OAuth secret

These must be stored in Vercel Dashboard env vars (never committed to git).

**[RISK]**: No `.env.example` file ensuring developers know what to set without committing real values.

**[SECURITY ISSUE]**: Integration configs (Slack webhook URLs, etc.) are stored as plaintext JSON strings in the `integrations.config` database column. If the database is compromised, all integration secrets are exposed.

**Recommended fix**: Encrypt sensitive config values with AES-GCM using a master key stored in env vars.

---

## File Upload Security

**[MISSING]** — No file upload functionality. Users provide avatar URLs (strings). No SSRF protection on URL fetching.

**[RISK]**: If avatar URLs are ever used for server-side fetching (e.g., to proxy/resize), SSRF attacks become possible.

---

## Dependency Security

Key packages to monitor for vulnerabilities:
- `next-auth@^5.0.0-beta.31` — beta software, may have unfixed CVEs
- `bcryptjs@^3.0.3` — stable
- `@anthropic-ai/sdk` — regularly updated

**[MISSING]**: No automated dependency scanning (Dependabot, Snyk).

---

## Security Headers

**[MISSING]** — No security headers configured.

Recommended additions to `next.config.ts`:
```typescript
const securityHeaders = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-XSS-Protection", value: "1; mode=block" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  {
    key: "Content-Security-Policy",
    value: "default-src 'self'; script-src 'self' 'unsafe-inline'; ..."
  },
];
```

---

## Data Privacy

- No GDPR "right to deletion" flow
- No data export capability for individual users
- Audit log (`audit_logs` table) exists for tracking changes — good
- No data retention policies configured

---

## Security Checklist

| Item | Status |
|------|--------|
| JWT HttpOnly cookies | ✅ Implemented |
| Multi-tenant org isolation | ✅ Implemented |
| Password hashing (bcrypt) | ✅ Implemented |
| SQL injection prevention (Prisma) | ✅ Implemented |
| CSRF resistance (JSON API) | ✅ Acceptable |
| Rate limiting | ❌ Missing |
| Brute force protection | ❌ Missing |
| Input validation (consistent) | ⚠️ Partial |
| RBAC enforcement (all routes) | ⚠️ Partial |
| Security headers | ❌ Missing |
| Session revocation | ❌ Missing |
| Secret encryption at rest | ❌ Missing (integration configs) |
| Dependency scanning | ❌ Missing |
| XSS audit | ⚠️ Needs audit |
