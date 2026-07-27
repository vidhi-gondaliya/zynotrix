# ZYNOTRIX — Environment Variables

Every environment variable used or referenced in the ZYNOTRIX codebase is documented here.

---

## Core Variables

### `DATABASE_URL`

| Property | Value |
|----------|-------|
| **Required** | Yes |
| **Security** | SECRET — never commit or log |
| **Used In** | `prisma/schema.prisma`, Prisma Client (all API routes) |
| **Example** | `postgresql://user:password@ep-xxx.us-east-2.aws.neon.tech/neondb?sslmode=require` |

Full PostgreSQL connection string including credentials and database name.

For **Neon**, use the **pooled endpoint** (append `-pooler` before the hostname dot):
```
postgresql://user:pass@ep-xxx-pooler.us-east-2.aws.neon.tech/neondb?sslmode=require
```

**Local development** can use SQLite:
```
DATABASE_URL="file:./dev.db"
```

---

### `NEXTAUTH_SECRET`

| Property | Value |
|----------|-------|
| **Required** | Yes |
| **Security** | SECRET — critical, compromise allows JWT forgery |
| **Used In** | `src/lib/auth.ts` — NextAuth configuration |
| **Example** | `9dkfj2l3kj4h5...` (32-char base64) |
| **Generate** | `openssl rand -base64 32` |

Signs and encrypts NextAuth JWT tokens. If this value changes, all existing sessions are invalidated.

---

### `AUTH_SECRET`

| Property | Value |
|----------|-------|
| **Required** | No (fallback to NEXTAUTH_SECRET) |
| **Security** | SECRET |
| **Used In** | `src/lib/auth.ts` — `secret: process.env.NEXTAUTH_SECRET ?? process.env.AUTH_SECRET` |
| **Notes** | NextAuth v5 uses `AUTH_SECRET` by convention; v4 uses `NEXTAUTH_SECRET`. Both are supported. |

---

### `NEXTAUTH_URL`

| Property | Value |
|----------|-------|
| **Required** | Yes (production) |
| **Security** | Public |
| **Used In** | NextAuth callback URL construction |
| **Example** | `https://zynotrix.com` or `http://localhost:3000` |
| **Notes** | Must match the exact deployment URL. No trailing slash. |

---

## AI Variables

### `ANTHROPIC_API_KEY`

| Property | Value |
|----------|-------|
| **Required** | Yes (for AI features) |
| **Security** | SECRET — cost exposure risk if leaked |
| **Used In** | `src/lib/claude.ts` — Anthropic SDK initialization |
| **Example** | `sk-ant-api03-xxx...` |
| **Notes** | All AI features (assistant, health score, reports, insights) fail gracefully if absent |

Set billing limits in the Anthropic console to prevent runaway charges.

---

### `CLAUDE_MODEL`

| Property | Value |
|----------|-------|
| **Required** | No |
| **Default** | `claude-opus-4-5` |
| **Used In** | `src/lib/claude.ts` — `MODEL = process.env.CLAUDE_MODEL ?? "claude-opus-4-5"` |
| **Example** | `claude-haiku-4-5-20251001` |
| **Notes** | Override to use a cheaper/faster model. Haiku is 60x cheaper than Opus. |

---

## Google Variables

### `GOOGLE_CLIENT_ID`

| Property | Value |
|----------|-------|
| **Required** | No (Google OAuth disabled if absent) |
| **Security** | Semi-public (visible in OAuth flows) |
| **Used In** | `src/lib/auth.ts` — GoogleProvider registration |
| **Example** | `123456789-abc.apps.googleusercontent.com` |

---

### `GOOGLE_CLIENT_SECRET`

| Property | Value |
|----------|-------|
| **Required** | No (paired with CLIENT_ID) |
| **Security** | SECRET |
| **Used In** | `src/lib/auth.ts` — GoogleProvider |
| **Example** | `GOCSPX-xxx...` |

---

## Public App Variables

### `NEXT_PUBLIC_APP_NAME`

| Property | Value |
|----------|-------|
| **Required** | No |
| **Default** | `"ZYNOTRIX"` (hardcoded fallback) |
| **Used In** | UI display strings, page titles |
| **Example** | `ZYNOTRIX` |
| **Notes** | `NEXT_PUBLIC_*` prefix exposes this variable to the browser bundle. |

---

### `NEXT_PUBLIC_APP_URL`

| Property | Value |
|----------|-------|
| **Required** | No |
| **Used In** | Absolute URL generation, OG image URLs |
| **Example** | `https://zynotrix.com` |
| **Notes** | Same as NEXTAUTH_URL but accessible client-side. |

---

## Integration Variables

### `SLACK_BOT_TOKEN`

| Property | Value |
|----------|-------|
| **Required** | No |
| **Security** | SECRET |
| **Used In** | `src/app/api/integrations/slack/` |
| **Example** | `xoxb-xxx...` |
| **Status** | **[ALPHA]** — Integration stub |

---

### `SLACK_SIGNING_SECRET`

| Property | Value |
|----------|-------|
| **Required** | No |
| **Security** | SECRET |
| **Used In** | `src/app/api/webhooks/slack/route.ts` — webhook signature validation |
| **Example** | `abc123...` |

---

### `TWILIO_ACCOUNT_SID`

| Property | Value |
|----------|-------|
| **Required** | No |
| **Used In** | WhatsApp notification sending (via Twilio) |
| **Example** | `ACxxx...` |
| **Status** | **[ALPHA]** — Not fully implemented |

---

### `TWILIO_AUTH_TOKEN`

| Property | Value |
|----------|-------|
| **Required** | No |
| **Security** | SECRET |
| **Used In** | Twilio API authentication |
| **Example** | `xxx...` |

---

### `TWILIO_WHATSAPP_FROM`

| Property | Value |
|----------|-------|
| **Required** | No |
| **Used In** | WhatsApp message sender ID |
| **Example** | `+14155238886` (Twilio sandbox number) |

---

### `GITHUB_WEBHOOK_SECRET`

| Property | Value |
|----------|-------|
| **Required** | No |
| **Security** | SECRET |
| **Used In** | `src/app/api/webhooks/github/route.ts` — HMAC signature validation |
| **Example** | `my-github-secret-123` |

---

### `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, `AWS_REGION`, `AWS_S3_BUCKET`

| Property | Value |
|----------|-------|
| **Required** | No |
| **Security** | SECRET |
| **Used In** | **[NOT IMPLEMENTED]** — Listed in `.env.example` but no S3 upload code found |
| **Notes** | Reserved for future file upload functionality |

---

## Variable Summary Table

| Variable | Required | Secret | Client-Side | Feature |
|----------|----------|--------|-------------|---------|
| `DATABASE_URL` | Yes | Yes | No | Core |
| `NEXTAUTH_SECRET` | Yes | Yes | No | Auth |
| `AUTH_SECRET` | No | Yes | No | Auth (v5 alias) |
| `NEXTAUTH_URL` | Prod | No | No | Auth |
| `ANTHROPIC_API_KEY` | Yes* | Yes | No | AI |
| `CLAUDE_MODEL` | No | No | No | AI |
| `GOOGLE_CLIENT_ID` | No | No | No | OAuth + Calendar |
| `GOOGLE_CLIENT_SECRET` | No | Yes | No | OAuth + Calendar |
| `NEXT_PUBLIC_APP_NAME` | No | No | Yes | UI |
| `NEXT_PUBLIC_APP_URL` | No | No | Yes | URLs |
| `SLACK_BOT_TOKEN` | No | Yes | No | Slack |
| `SLACK_SIGNING_SECRET` | No | Yes | No | Slack Webhooks |
| `TWILIO_ACCOUNT_SID` | No | No | No | WhatsApp |
| `TWILIO_AUTH_TOKEN` | No | Yes | No | WhatsApp |
| `TWILIO_WHATSAPP_FROM` | No | No | No | WhatsApp |
| `GITHUB_WEBHOOK_SECRET` | No | Yes | No | GitHub |
| `AWS_ACCESS_KEY_ID` | No | Yes | No | S3 (future) |
| `AWS_SECRET_ACCESS_KEY` | No | Yes | No | S3 (future) |
| `AWS_REGION` | No | No | No | S3 (future) |
| `AWS_S3_BUCKET` | No | No | No | S3 (future) |

`*` = Required for AI features; app runs without it but all `/api/ai/*` routes fail.

---

## Security Rules

1. **Never commit `.env` or `.env.local`** — add them to `.gitignore`
2. **`.env.example` should contain only placeholder values** — the existing file is correctly structured
3. **SECRET variables** must be rotated if exposed — especially `NEXTAUTH_SECRET` (invalidates all sessions) and `ANTHROPIC_API_KEY` (billing exposure)
4. **`NEXT_PUBLIC_*` variables** are bundled into client-side JavaScript — never put secrets here
5. **Vercel**: Set all production env vars in Dashboard, not in committed files
