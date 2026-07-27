# ZYNOTRIX — Deployment Guide

## Overview

ZYNOTRIX is a Next.js 14 application designed to deploy on Vercel with a Neon PostgreSQL database. This guide covers the complete deployment process from zero to production.

---

## Prerequisites

- Vercel account (free tier sufficient for testing)
- Neon account (free tier available)
- Google Cloud Console project (for OAuth and Calendar)
- Anthropic API key
- Git repository (GitHub, GitLab, or Bitbucket)

---

## Step 1: Neon PostgreSQL Setup

1. Go to [neon.tech](https://neon.tech) and create an account
2. Create a new project (e.g., `zynotrix-prod`)
3. Select the region closest to your Vercel deployment region (default: US East)
4. From the **Dashboard** → **Connection Details**:
   - Copy the **Pooled connection string** (use this for `DATABASE_URL`)
   - Format: `postgresql://user:password@ep-xxx.us-east-2.aws.neon.tech/neondb?sslmode=require`

5. **Important**: Use the **pooled endpoint** (contains `-pooler` in the URL) for serverless environments like Vercel to avoid connection limit errors.

---

## Step 2: Database Migration

After setting `DATABASE_URL` in your local `.env`:

```bash
# Generate Prisma client
npx prisma generate

# Push schema to Neon (first deploy — use push not migrate for simplicity)
npx prisma db push

# Optional: seed initial data
npx prisma db seed
```

**In production**, run migrations automatically via build command:
```json
// package.json
"build": "prisma generate && prisma db push && next build"
```

**Note**: `prisma db push` is used instead of `prisma migrate deploy` because ZYNOTRIX has no migration files. For production safety, generate proper migration files before going live.

---

## Step 3: Google OAuth Setup

1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Create a new project or select existing
3. Enable APIs:
   - Google OAuth 2.0 (built-in)
   - Google Calendar API
4. Navigate to **Credentials** → **Create Credentials** → **OAuth 2.0 Client ID**
5. Application type: **Web Application**
6. Add Authorized redirect URIs:
   - Development: `http://localhost:3000/api/auth/callback/google`
   - Production: `https://your-domain.vercel.app/api/auth/callback/google`
7. Copy **Client ID** → `GOOGLE_CLIENT_ID`
8. Copy **Client Secret** → `GOOGLE_CLIENT_SECRET`

---

## Step 4: Anthropic API Key

1. Go to [console.anthropic.com](https://console.anthropic.com)
2. Navigate to **API Keys** → **Create Key**
3. Name it `zynotrix-prod`
4. Copy the key → `ANTHROPIC_API_KEY`
5. Set billing limits to avoid unexpected charges

---

## Step 5: Generate NEXTAUTH_SECRET

```bash
# Generate a secure random secret
openssl rand -base64 32
```

Copy the output → `NEXTAUTH_SECRET`

---

## Step 6: Vercel Deployment

### Connect Repository

1. Go to [vercel.com](https://vercel.com) → **New Project**
2. Import your Git repository
3. Framework preset: **Next.js** (auto-detected)
4. Root directory: `zynotrix/` (if your repo has this as a subfolder)
5. Build command: `prisma generate && next build`
6. Output directory: `.next` (default)

### Environment Variables

In Vercel Dashboard → Project → **Settings** → **Environment Variables**, add:

| Variable | Environment | Required | Example |
|----------|-------------|----------|---------|
| `DATABASE_URL` | Production, Preview | Yes | `postgresql://user:pass@host/db?sslmode=require` |
| `NEXTAUTH_SECRET` | Production, Preview | Yes | 32-char base64 string |
| `NEXTAUTH_URL` | Production | Yes | `https://zynotrix.com` |
| `AUTH_SECRET` | Production, Preview | No | Same as NEXTAUTH_SECRET |
| `ANTHROPIC_API_KEY` | Production, Preview | Yes (for AI) | `sk-ant-...` |
| `CLAUDE_MODEL` | Production | No | `claude-opus-4-5` |
| `GOOGLE_CLIENT_ID` | Production, Preview | No | `xxx.apps.googleusercontent.com` |
| `GOOGLE_CLIENT_SECRET` | Production, Preview | No | `GOCSPX-...` |
| `SLACK_WEBHOOK_URL` | Production | No | `https://hooks.slack.com/...` |
| `SLACK_SIGNING_SECRET` | Production | No | `xxx` |
| `GITHUB_WEBHOOK_SECRET` | Production | No | `xxx` |

### Deploy

Click **Deploy**. The build process:
1. Runs `prisma generate` (generates Prisma client)
2. Runs `next build` (compiles TypeScript, builds pages)
3. Deploys to Vercel edge network

---

## Step 7: Custom Domain (Optional)

1. Vercel Dashboard → Project → **Domains**
2. Add your domain (e.g., `app.zynotrix.com`)
3. Update DNS at your registrar:
   - CNAME: `app.zynotrix.com` → `cname.vercel-dns.com`
   - Or: A record → Vercel IP
4. Update `NEXTAUTH_URL` to match: `https://app.zynotrix.com`
5. Update Google OAuth redirect URI to include the new domain

---

## Step 8: Vercel Function Configuration

Create `vercel.json` at the project root:

```json
{
  "functions": {
    "src/app/api/ai/**": {
      "maxDuration": 60
    },
    "src/app/api/channels/*/sse/route.ts": {
      "maxDuration": 300
    },
    "src/app/api/notifications/sse/route.ts": {
      "maxDuration": 300
    }
  }
}
```

**Why this matters**:
- AI streaming calls can take 30-60 seconds for long responses
- SSE connections need extended duration to stay open
- Default Vercel Hobby limit: 10 seconds — AI features will fail without this

**Note**: `maxDuration: 60` requires Vercel **Pro** plan. Hobby plan maximum is 10s.

---

## Post-Deployment Checklist

- [ ] App loads at production URL
- [ ] Login with email/password works
- [ ] Google OAuth redirects and returns correctly
- [ ] Dashboard loads with data
- [ ] Create a project and task
- [ ] AI features respond (check `ANTHROPIC_API_KEY`)
- [ ] Notifications appear (SSE is working)
- [ ] Chat messages send and appear in real-time
- [ ] Admin panel accessible for OWNER role
- [ ] Check Vercel function logs for errors

---

## Environment-Specific Configuration

### Development

```bash
# .env.local
DATABASE_URL="postgresql://..."
NEXTAUTH_SECRET="dev-secret-min-32-chars-here"
NEXTAUTH_URL="http://localhost:3000"
ANTHROPIC_API_KEY="sk-ant-..."
```

### Preview (Vercel branch deploys)

Each branch deploy gets its own URL. Set `NEXTAUTH_URL` to `$VERCEL_URL` or use Vercel's automatic NEXTAUTH_URL override.

For preview deploys sharing a database, be cautious — they share the same Neon database unless you set up separate preview databases.

### Production

All env vars set in Vercel Dashboard. Use Vercel's **Production** environment scope.

---

## Rollback

### Code Rollback
1. Vercel Dashboard → Project → **Deployments**
2. Find the last working deployment
3. Click **...** → **Promote to Production**

### Database Rollback
**[MISSING]**: No database migration system. Rollback is a manual SQL process.

For production, switch to `prisma migrate` to enable safe rollbacks:
```bash
npx prisma migrate dev --name add-new-field  # development
npx prisma migrate deploy                    # production
npx prisma migrate resolve --rolled-back     # rollback failed migration
```

---

## Monitoring

**[MISSING]**: No monitoring configured. Recommended additions:
- **Vercel Analytics**: Built-in, enable from Vercel Dashboard
- **Sentry**: Error tracking — add `@sentry/nextjs`
- **Vercel Logs**: Available in Dashboard → Functions → Logs

---

## Troubleshooting

### "PrismaClientInitializationError"
- Check `DATABASE_URL` is set in Vercel env vars
- Verify Neon connection string uses pooled endpoint
- Ensure SSL: `?sslmode=require` in connection string

### "NEXTAUTH_URL not set"
- Set `NEXTAUTH_URL` to the exact production URL including `https://`
- Must match the domain exactly (no trailing slash)

### AI features return errors
- Verify `ANTHROPIC_API_KEY` is valid and has billing enabled
- Check Vercel function logs for the specific error
- AI routes need Pro plan `maxDuration: 60`

### Google OAuth "redirect_uri_mismatch"
- Verify the exact redirect URI is listed in Google Cloud Console
- Must be: `https://your-domain.com/api/auth/callback/google`

### SSE connections dropping immediately
- This is expected on Hobby plan (10s timeout)
- Upgrade to Pro or implement reconnection logic on client
