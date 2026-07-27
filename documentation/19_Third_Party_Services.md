# ZYNOTRIX — Third-Party Services

## 1. Anthropic Claude AI

**Purpose**: Powers all AI features in ZYNOTRIX — assistant, task creation, health scoring, meeting notes, reports, search, recurring task suggestions.

**Integration**: `@anthropic-ai/sdk` (official SDK)  
**File**: `src/lib/claude.ts`

**API Endpoints Used**:
- `claude.messages.stream()` — streaming text generation
- `claude.messages.create()` — single response JSON generation

**Models**:
- `claude-opus-4-5` (or env var `CLAUDE_MODEL`) — primary, most capable
- `claude-haiku-4-5-20251001` (FAST_MODEL) — for quick operations

**Environment Variables**:
- `ANTHROPIC_API_KEY` — required for all AI features
- `CLAUDE_MODEL` — optional, overrides default model

**Free Tier**: None — Anthropic is pay-per-token.

**Pricing [as of 2025]**:
- Opus 4.5: ~$15/M input tokens, ~$75/M output tokens
- Haiku 4.5: ~$0.25/M input, ~$1.25/M output

**Failure Behavior**: AI routes catch errors and append `[Error: ...]` to the streaming response. Non-streaming routes return HTTP 500.

**Rate Limiting**: Anthropic enforces rate limits per API key. No application-level throttling.

**Alternatives**: OpenAI GPT-4o, Google Gemini 1.5 Pro.

---

## 2. Google APIs (Calendar + OAuth)

**Purpose**: 
1. Google OAuth sign-in
2. Google Calendar event creation (for Google Meet link generation)

**Integration**: `googleapis` package + NextAuth GoogleProvider  
**Files**: `src/lib/auth.ts`, `src/lib/google-meet.ts`

**OAuth Scopes**:
- `openid email profile` — user identity
- `https://www.googleapis.com/auth/calendar.events` — create/read calendar events

**Environment Variables**:
- `GOOGLE_CLIENT_ID` — required for Google OAuth
- `GOOGLE_CLIENT_SECRET` — required for Google OAuth

**Configuration**: Google Cloud Console → OAuth 2.0 credentials → Authorized redirect URI must include `/api/auth/callback/google`

**Free Tier**: Google OAuth is free. Google Calendar API has a free quota of 1M queries/day.

**Failure Behavior**: If Google credentials are not set, the Google OAuth provider is simply not registered (conditional loading). Calendar features require valid OAuth tokens — if expired (after 1 hour), Meet link generation fails silently.

**Known Issue**: OAuth access token refresh is **[NOT IMPLEMENTED]**. After the initial token expires (~1 hour), Google Calendar integration stops working until the user re-authenticates.

---

## 3. Neon PostgreSQL

**Purpose**: Serverless PostgreSQL database hosting.

**Integration**: Prisma ORM with `DATABASE_URL` connection string  
**Connection**: Neon provides connection pooling via a proxy endpoint

**Environment Variables**:
- `DATABASE_URL` — full Neon connection string with credentials

**Free Tier**: Neon has a generous free tier (10GB storage, 3 databases, connection pooling).

**Cold Starts**: Neon's serverless model has ~100ms cold start latency for the first query. Subsequent queries in the same connection are fast.

**Failure Behavior**: If `DATABASE_URL` is not set or Neon is unreachable, Prisma throws and all API routes return 500 errors.

**Alternatives**: Supabase, PlanetScale (MySQL), Railway, direct self-hosted PostgreSQL.

---

## 4. Vercel (Deployment)

**Purpose**: Hosting and edge network for Next.js deployment.

**Integration**: Native Next.js deployment — no additional configuration needed beyond `vercel.json` or dashboard settings.

**Features Used**:
- Serverless Functions (API routes)
- Edge Middleware (auth guard)
- Static file serving (CSS, fonts, images)
- Environment variable management

**Free Tier**: Vercel Hobby plan — 100GB bandwidth, 6,000 serverless function invocations/day.

**Limitations**:
- Serverless functions timeout at 10s (Hobby) or 60s (Pro) — AI streaming might hit this
- No persistent storage — SSE connections don't survive function reuse
- Cold starts add ~200ms to first request

**Environment Variables**: Set in Vercel Dashboard → Project → Settings → Environment Variables.

---

## 5. Slack Integration

**Purpose**: Send notifications to Slack channels and receive Slack event webhooks.

**Integration Type**: Webhook-based (not the full Slack SDK)  
**Files**: `src/app/api/integrations/slack/test/route.ts`, `src/app/api/webhooks/slack/route.ts`

**Environment Variables**:
- `SLACK_WEBHOOK_URL` — Slack Incoming Webhook URL (stored in `integrations.config`)
- `SLACK_SIGNING_SECRET` — for validating incoming webhooks

**Free Tier**: Slack API is free for standard workspaces.

**Status**: **[ALPHA]** — Test connection implemented; actual event processing is stub.

**Failure Behavior**: Failed webhook calls are logged to `webhook_logs` with `status: "failed"`.

---

## 6. GitHub Integration

**Purpose**: Receive GitHub webhooks for PR/issue events and link them to tasks.

**Integration**: Inbound webhook receiver  
**File**: `src/app/api/webhooks/github/route.ts`

**Environment Variables**:
- `GITHUB_WEBHOOK_SECRET` — for validating GitHub webhook payloads

**Status**: **[ALPHA]** — Webhook receives and logs events. Task linking via `task_links` table is manual (no automatic PR → task association yet).

**Free Tier**: GitHub webhooks are free.

---

## 7. WhatsApp (External Provider)

**Purpose**: Send WhatsApp notification messages to users.

**Integration**: Via third-party WhatsApp Business API provider (Twilio, Gupshup, etc.)  
**File**: `src/app/api/integrations/whatsapp/test/route.ts`

**Status**: **[ALPHA]** — Test endpoint exists. No specific provider is hardcoded. Implementation requires choosing a provider and configuring their API.

**Note**: The `notification_preferences` table has `whatsapp` and `whatsappPhone` fields, indicating this is planned as a notification channel.

---

## 8. Email (Inbound Webhooks)

**Purpose**: Process inbound emails (e.g., create tasks by emailing a special address).

**File**: `src/app/api/webhooks/email/route.ts`

**Status**: **[ALPHA]** — Endpoint stub only.

---

## Integration Configuration Storage

Integration credentials are stored in the `integrations` table:

```json
{
  "userId": "...",
  "organizationId": "...",
  "type": "slack",
  "config": "{\"webhookUrl\": \"https://hooks.slack.com/...\"}",
  "isActive": true
}
```

**Security concern**: Integration configs (including tokens/secrets) are stored as plaintext JSON in the database. **[SECURITY ISSUE]** — These should be encrypted at rest.

---

## Service Health Dependencies

| Service | Required | Impact if Down |
|---------|----------|----------------|
| Neon PostgreSQL | Yes | App completely down |
| Vercel | Yes | App completely down |
| Anthropic API | No | AI features show error |
| Google APIs | No | OAuth login and Calendar features fail |
| Slack | No | Slack notifications fail silently |
| GitHub | No | Webhook events lost |
| WhatsApp | No | WhatsApp notifications fail silently |
