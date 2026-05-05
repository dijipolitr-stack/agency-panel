# Atelier — Agency Panel

A multi-tenant marketing-agency control room. One installation, used by an
agency for every client they manage. Generate AI imagery and video, brief
captions, and publish to Instagram and TikTok — all from one panel.

```
┌─────────────────────────────────────────────────────────────────┐
│  Agency  →  Clients (brands)  →  Projects (Kanban)              │
│                       ↓                  ↓                       │
│              Social accounts        Content items (AI)           │
│                       ↓                  ↓                       │
│                       └────  Posts  ─────┘                       │
└─────────────────────────────────────────────────────────────────┘
```

## What's inside

- **Multi-tenant** by Row Level Security: every agency only sees its own data.
- **Client management** — brand identity, voice, palette, keywords, notes.
- **Kanban workflow** — drag projects through `idea → production → review →
  scheduled → published`.
- **AI content creator** — Replicate-powered image/video generation with a
  curated model picker; Anthropic Claude for caption + hashtag drafting.
- **Scheduler** — schedule and publish to Instagram (Graph API) and TikTok
  (Content Posting API) with a cron worker for due posts.
- **Hybrid mock/live mode** — every external integration runs against
  realistic mocks until you populate the relevant `.env` keys.

## Stack

- Next.js 15 (App Router) + TypeScript + React 19
- Supabase (Postgres + Auth + Storage + RLS)
- Tailwind CSS with a custom editorial dark theme (Fraunces + Geist)
- Replicate for image/video generation
- Anthropic Claude for caption drafting
- Instagram Graph API v21 + TikTok Content Posting API v2

## Quick start

### 1. Clone & install

```bash
pnpm install      # or npm install / yarn install
cp .env.example .env.local
```

### 2. Set up Supabase

1. Create a project at <https://supabase.com>.
2. From the SQL editor, run `supabase/migrations/0001_initial_schema.sql` —
   it creates all tables, enums, the `user_agency_ids()` helper, and RLS
   policies.
3. Copy your project URL, anon key, and service-role key into `.env.local`:

   ```
   NEXT_PUBLIC_SUPABASE_URL=...
   NEXT_PUBLIC_SUPABASE_ANON_KEY=...
   SUPABASE_SERVICE_ROLE_KEY=...   # used only by the cron endpoint
   ```

4. Optionally turn off email confirmations during development under
   *Authentication → Providers → Email*.

### 3. Run

```bash
pnpm dev
```

Open <http://localhost:3000>. Sign up — you'll land on the dashboard with
your agency already created.

The first time through, everything works in **mock mode**:
- Image generation returns a Picsum placeholder, video returns a sample MP4.
- Captions return a deterministic mock string.
- Instagram and TikTok "OAuth" loops back through your callback with fake
  tokens; "publishing" returns fake URLs.

## Going live, integration by integration

You can flip integrations on independently. Each one is gated by an `isLive`
boolean computed in `src/lib/env.ts` from whether the relevant keys are set.

### Replicate (images + video)

1. Get a token at <https://replicate.com/account/api-tokens>.
2. Set `REPLICATE_API_TOKEN` in `.env.local`.
3. Models live in `src/lib/ai/models.ts` — extend or swap freely.

### Anthropic Claude (captions)

1. Set `ANTHROPIC_API_KEY` in `.env.local`.
2. Captions use `claude-sonnet-4-5`. Adjust in `src/lib/ai/captions.ts`.

### Instagram Graph API

1. Create a Meta App at <https://developers.facebook.com/apps>; add the
   *Facebook Login* and *Instagram Graph API* products.
2. Add OAuth redirect URI:
   `https://YOUR_DOMAIN/api/social/instagram/callback`
   (in dev: `http://localhost:3000/api/social/instagram/callback`).
3. Each agency client must:
   - Have an Instagram **Business** or **Creator** account.
   - Link that IG account to a Facebook Page they administer.
4. Set `INSTAGRAM_APP_ID`, `INSTAGRAM_APP_SECRET`, `NEXT_PUBLIC_APP_URL`.
5. For production posting beyond test users, submit your app for *Instagram
   Public Content Access* and *Content Publishing* permissions review.

### TikTok Content Posting API

1. Register at <https://developers.tiktok.com>.
2. Add the **Login Kit** and **Content Posting API** products.
3. Add redirect URI: `https://YOUR_DOMAIN/api/social/tiktok/callback`.
4. Set `TIKTOK_CLIENT_KEY`, `TIKTOK_CLIENT_SECRET`.
5. Until your app is approved, direct posting only works for the developer's
   own TikTok account. Approval is required for use with arbitrary client
   accounts.

### Cron (scheduled publishing)

The endpoint at `/api/cron/publish-scheduled` checks for due posts and
publishes them. Authorise it with `CRON_SECRET`.

**Vercel:** `vercel.json` already includes the schedule (every 5 minutes).
Add `CRON_SECRET` as an env var in your Vercel project; Vercel automatically
sends `Authorization: Bearer ${CRON_SECRET}` when invoking your cron.

**Other platforms:** call the endpoint with the bearer header at your chosen
interval.

## Deploy to Vercel

```bash
# Push to GitHub, then import on vercel.com
# Set env vars (Settings → Environment Variables):
#   NEXT_PUBLIC_SUPABASE_URL
#   NEXT_PUBLIC_SUPABASE_ANON_KEY
#   SUPABASE_SERVICE_ROLE_KEY
#   NEXT_PUBLIC_APP_URL                (your prod URL)
#   REPLICATE_API_TOKEN                (optional, for live AI)
#   ANTHROPIC_API_KEY                  (optional, for live captions)
#   INSTAGRAM_APP_ID / _SECRET         (optional, for live IG)
#   TIKTOK_CLIENT_KEY / _SECRET        (optional, for live TikTok)
#   CRON_SECRET
```

Then update the OAuth redirect URIs in Meta and TikTok to your production
domain.

## Architecture notes

### Multi-tenancy

The `user_agency_ids()` Postgres function returns the set of agencies the
current `auth.uid()` can access (as owner or member). Every RLS policy is
written in terms of that set, so there is no way for one agency to see
another's data even if a client component constructs a query directly.

### Mock vs live

The pattern in every integration:

```ts
if (!env.replicate.isLive) return mockGeneration(...);
// ...real call...
```

This means you can hand the project off, the recipient can run it instantly
with no keys, and as soon as they add the first key, that integration starts
hitting the real API.

### Token storage

Social access tokens are stored in `social_accounts.access_token`. For
production, encrypt them at rest (Supabase Vault, KMS, or
`pgsodium`). Token refresh is left as a stub — set up a refresh worker for
TikTok (24h tokens) and rotate IG long-lived tokens before their ~60-day
expiry.

### Server actions vs API routes

- Mutations from forms use server actions (`auth/actions.ts`,
  `clients/actions.ts`).
- AI generation and social publishing use route handlers (`/api/...`)
  because they're called from client components with custom UX (loading
  states, optimistic updates).

## Project layout

```
agency-panel/
├── supabase/migrations/         # SQL schema + RLS
├── src/
│   ├── app/
│   │   ├── login/               # auth UI
│   │   ├── (app)/               # authenticated routes (sidebar layout)
│   │   │   ├── dashboard/
│   │   │   └── clients/[clientId]/
│   │   │       ├── kanban/
│   │   │       ├── content/
│   │   │       ├── schedule/
│   │   │       └── social/
│   │   ├── api/
│   │   │   ├── ai/              # generate-image, video, caption
│   │   │   ├── social/          # OAuth + publish
│   │   │   └── cron/            # scheduled publishing
│   │   └── auth/                # callback + actions
│   ├── components/
│   │   ├── ui/                  # button, card, input, badge
│   │   ├── nav/                 # sidebar, topbar
│   │   ├── kanban/              # drag-drop board
│   │   ├── content-creator/     # AI generator UI
│   │   ├── scheduler/           # calendar + post list
│   │   └── clients/             # social-connect
│   ├── lib/
│   │   ├── supabase/            # browser, server, middleware
│   │   ├── ai/                  # replicate, captions, models
│   │   ├── social/              # instagram, tiktok, types
│   │   ├── env.ts               # all env access
│   │   └── utils.ts
│   ├── types/database.ts        # DB types matching schema
│   └── middleware.ts            # auth gate
├── tailwind.config.ts
├── next.config.ts
├── vercel.json
└── package.json
```

## Roadmap ideas

- Team support (use `agency_members` table — schema is ready, UI not yet)
- Asset library (reuse generated content across projects)
- Approval flows (assign reviewers per project)
- Comments on projects
- Analytics — pull post insights from IG/TikTok APIs
- Token refresh worker
- Slack/email notifications when scheduled posts succeed/fail

## License

MIT — adapt freely.
