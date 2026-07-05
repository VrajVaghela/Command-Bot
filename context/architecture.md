# Architecture — Abstrait

## 1. Technology Stack (locked)

| Layer          | Choice                                                      | Notes                                                                                        |
| -------------- | ----------------------------------------------------------- | -------------------------------------------------------------------------------------------- |
| Language       | **TypeScript** (strict)                                     | No `any`. Shared types across client/server.                                                 |
| Framework      | **Next.js 15, App Router**                                  | React Server Components by default.                                                          |
| Runtime        | **Node.js** for the interactions route                      | Ed25519 verify needs the Node runtime, **not** Edge — set `export const runtime = "nodejs"`. |
| Styling        | **Tailwind CSS**                                            | Tokens only — see [ui_tokens.md](ui_tokens.md).                                              |
| Database       | **Neon Postgres** (serverless, free, no card)               | Pooled connection via `@neondatabase/serverless`.                                            |
| ORM            | **Drizzle ORM** + `drizzle-kit`                             | SQL-first, typed, migration files committed.                                                 |
| Auth           | **Auth.js v5 (NextAuth)** — Credentials provider            | Single admin for MVP; JWT session strategy.                                                  |
| Discord verify | **discord-interactions** (`verifyKey`) or **tweetnacl**     | Ed25519 verification of every request.                                                       |
| Mirror         | **Slack Incoming Webhook** _or_ **Discord channel webhook** | Paste-a-URL, no card.                                                                        |
| AI (stretch)   | **Google Gemini** (AI Studio free key)                      | Behind `AI_ENABLED` flag.                                                                    |
| Hosting        | **Vercel** (free tier, no card)                             | Serverless functions; env vars in project settings.                                          |
| Validation     | **Zod**                                                     | Parse all external input + env at boundaries.                                                |

## 2. System Boundaries & Data Flow

```
Discord  ──POST (Ed25519-signed)──▶  /api/interactions (Node runtime)
                                        │
                        1. verify signature (401 if bad)
                        2. answer PING → PONG (type 1)
                        3. dedup on interaction.id (unique constraint)
                        4. record interaction  ──▶  Neon Postgres
                        5. apply command rule (from DB config)
                        6. respond in Discord (immediate or DEFER)
                        7. enqueue/mirror to 2nd channel ─▶ Slack/Discord webhook
                                        │
Admin Browser ──▶ Next.js (RSC + Route Handlers) ──▶ Neon Postgres
   (login-gated dashboard: live log + command config)
```

**Trust boundary:** everything from Discord is untrusted until `verifyKey` passes.
Everything from the browser is untrusted until the Auth.js session is validated.

## 3. Folder Structure (strict)

```
abstrait/
├── agents.md                     # AI master instructions (root)
├── context/                      # the 9 context files
├── drizzle/                      # generated SQL migrations (committed)
├── public/
├── src/
│   ├── app/
│   │   ├── (marketing)/          # public landing (optional)
│   │   ├── (dashboard)/          # login-gated admin UI (route group)
│   │   │   ├── dashboard/
│   │   │   ├── commands/         # command config UI
│   │   │   └── layout.tsx        # auth guard here
│   │   ├── api/
│   │   │   ├── interactions/route.ts   # Discord endpoint (Node runtime)
│   │   │   ├── auth/[...nextauth]/route.ts
│   │   │   └── mirror/retry/route.ts   # retry worker (optional cron)
│   │   ├── layout.tsx
│   │   └── globals.css
│   ├── server/                   # SERVER-ONLY logic. Never imported by client.
│   │   ├── db/
│   │   │   ├── index.ts          # drizzle client
│   │   │   └── schema.ts         # table definitions
│   │   ├── discord/
│   │   │   ├── verify.ts         # Ed25519 verification
│   │   │   ├── respond.ts        # build interaction responses
│   │   │   ├── register.ts       # register slash commands script
│   │   │   └── follow-up.ts      # deferred follow-up via webhook token
│   │   ├── mirror/               # Slack/Discord mirror + retry
│   │   ├── rules/                # command rule engine
│   │   ├── ai/                   # Gemini (stretch, flagged)
│   │   └── auth.ts               # Auth.js config
│   ├── components/               # reusable UI — log in ui_registry.md
│   │   └── ui/                   # primitives (Button, Input, Badge, Card…)
│   ├── lib/                      # isomorphic helpers, types, constants
│   │   ├── env.ts                # Zod-validated env (server + client split)
│   │   └── types.ts
│   └── middleware.ts             # route protection
├── scripts/                      # one-off scripts (register commands)
├── .env.example                  # no real secrets
├── drizzle.config.ts
└── README.md
```

## 4. Architectural Rules (non-negotiable)

1. **Routing:** App Router only. Route groups `(dashboard)` for gated pages;
   the interactions endpoint is a Route Handler at `src/app/api/interactions/route.ts`.
2. **Client/server separation:** anything in `src/server/**` is server-only and must
   never be imported into a Client Component. Mark modules with `import "server-only"`
   where practical. Secrets live only in `src/server/**` and `src/lib/env.ts` (server half).
3. **Database access rule:** the **only** place SQL/Drizzle runs is `src/server/**`
   (Route Handlers, Server Actions, server components calling server modules). Client
   Components never touch the DB — they call Server Actions or Route Handlers.
4. **The interactions endpoint MUST, in order:** verify signature → handle PING →
   dedup → record → act → respond within 3s (defer if slow). Never skip verification.
5. **Runtime:** the interactions route pins `runtime = "nodejs"` (Ed25519 + raw body
   needed). Read the **raw request body** for signature verification — do not
   `await req.json()` before verifying.
6. **Idempotency:** every write keyed by Discord `interaction.id` (unique). Reprocessing
   a delivered interaction is a no-op that returns the recorded result.
7. **Env validation:** all env vars pass through `src/lib/env.ts` (Zod). Missing/invalid
   env fails fast at boot. Never read `process.env.X` directly in feature code.
8. **No secrets client-side:** only `NEXT_PUBLIC_*` reaches the browser, and none of
   those are secrets. Bot token, public key, webhook URLs, DB URL are server-only.
9. **Errors:** downstream failures (mirror/AI) never fail the Discord response path —
   they are recorded with a `failed` status and retried; the user still gets a reply.
10. **Config over code:** command behavior is read from the DB `command_configs` table,
    editable in the UI. No hard-coded per-command business rules.

## 5. Initial Database Schema (Drizzle / Postgres)

Designed so **multi-server** is a later toggle, not a rewrite (everything scopes by
`guild_id`).

### `guilds` — connected Discord servers

| column               | type                    | notes                             |
| -------------------- | ----------------------- | --------------------------------- |
| `id`                 | text (PK)               | Discord guild id                  |
| `name`               | text                    |                                   |
| `post_channel_id`    | text                    | channel the bot may post to       |
| `mirror_type`        | enum(`slack`,`discord`) | mirror target kind                |
| `mirror_webhook_url` | text (encrypted/secret) | server-only; never sent to client |
| `connected_by`       | text                    | admin user id                     |
| `created_at`         | timestamptz             | default now                       |

### `command_configs` — per-command, per-guild rules (UI-editable)

| column         | type                        | notes                                                                       |
| -------------- | --------------------------- | --------------------------------------------------------------------------- |
| `id`           | uuid (PK)                   |                                                                             |
| `guild_id`     | text (FK→guilds.id)         |                                                                             |
| `command_name` | text                        | e.g. `report`, `status`                                                     |
| `enabled`      | boolean                     | default true                                                                |
| `rule`         | jsonb                       | rule definition (keyword tags, response template, mirror on/off, ai on/off) |
| `updated_at`   | timestamptz                 |                                                                             |
| unique         | (`guild_id`,`command_name`) |                                                                             |

### `interactions` — the recorded command log (idempotency anchor)

| column             | type                                  | notes                                  |
| ------------------ | ------------------------------------- | -------------------------------------- |
| `id`               | text (PK)                             | **Discord interaction id — dedup key** |
| `guild_id`         | text                                  |                                        |
| `type`             | int                                   | 1/2/3/5                                |
| `command_name`     | text                                  | nullable                               |
| `user_id`          | text                                  | invoking user                          |
| `user_name`        | text                                  |                                        |
| `payload`          | jsonb                                 | raw options/text (no secrets)          |
| `status`           | enum(`received`,`processed`,`failed`) |                                        |
| `response_summary` | text                                  | what we replied                        |
| `created_at`       | timestamptz                           |                                        |

### `actions` — every downstream action taken per interaction

| column                      | type                                | notes                                   |
| --------------------------- | ----------------------------------- | --------------------------------------- |
| `id`                        | uuid (PK)                           |                                         |
| `interaction_id`            | text (FK→interactions.id)           |                                         |
| `kind`                      | enum(`discord_reply`,`mirror`,`ai`) |                                         |
| `status`                    | enum(`pending`,`success`,`failed`)  |                                         |
| `attempts`                  | int                                 | retry counter                           |
| `detail`                    | jsonb                               | request/response summary, error message |
| `created_at` / `updated_at` | timestamptz                         |                                         |

### `admin_users` — dashboard login

| column          | type        | notes         |
| --------------- | ----------- | ------------- |
| `id`            | uuid (PK)   |               |
| `email`         | text unique |               |
| `password_hash` | text        | bcrypt/argon2 |
| `created_at`    | timestamptz |               |

## 6. Environment Variables (see `.env.example`)

Server-only: `DATABASE_URL`, `DISCORD_APP_ID`, `DISCORD_PUBLIC_KEY`,
`DISCORD_BOT_TOKEN`, `AUTH_SECRET`, `MIRROR_WEBHOOK_URL` (per-guild ones live in DB),
`GEMINI_API_KEY` (stretch), `AI_ENABLED`.
Client-safe: `NEXT_PUBLIC_APP_URL` only.

## 7. Related Context

- Product scope → [project_overview.md](project_overview.md)
- Library-specific rules → [library_docs.md](library_docs.md)
- Coding conventions → [code_standards.md](code_standards.md)
