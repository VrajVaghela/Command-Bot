# Library Docs & Integration Rules — Abstrait

> **Rule:** before writing non-trivial code against any library below, fetch **current**
> docs via **Context7 MCP** (`resolve-library-id` → `query-docs`). APIs drift; these
> notes capture _our conventions_, not a substitute for current syntax.

---

## 1. Discord Interactions (the endpoint)

**Libraries:** `discord-interactions` (Ed25519 `verifyKey`, `InteractionType`,
`InteractionResponseType`) or `tweetnacl` directly. **Node runtime only.**

**Hard rules:**

- `export const runtime = "nodejs"` on `app/api/interactions/route.ts`.
- **Read the raw body** for verification — do not parse JSON first:
  ```ts
  const sig = req.headers.get("x-signature-ed25519")!;
  const ts = req.headers.get("x-signature-timestamp")!;
  const raw = await req.text(); // raw, unparsed
  const ok = verifyKey(raw, sig, ts, env.DISCORD_PUBLIC_KEY);
  if (!ok) return new Response("invalid request signature", { status: 401 });
  const body = JSON.parse(raw);
  ```
- **PING:** `if (body.type === 1) return Response.json({ type: 1 })` (PONG).
- **Interaction types:** `1 PING`, `2 APPLICATION_COMMAND`, `3 MESSAGE_COMPONENT`,
  `5 MODAL_SUBMIT`.
- **Response types:** `4 CHANNEL_MESSAGE_WITH_SOURCE` (immediate reply),
  `5 DEFERRED_CHANNEL_MESSAGE_WITH_SOURCE` (ack now, follow up later),
  `6 DEFERRED_UPDATE_MESSAGE`, `7 UPDATE_MESSAGE`, `9 MODAL`.
- **~3-second window:** if work may exceed it → return type `5` (defer), then
  **follow up** via the interaction webhook:
  `PATCH https://discord.com/api/v10/webhooks/{APP_ID}/{interaction.token}/messages/@original`.
- **Ephemeral replies:** set `data.flags = 64`.
- **Dedup:** upsert on `interaction.id`; a duplicate is a no-op returning the prior result.
- **Register commands** out-of-band via REST (`PUT
/applications/{APP_ID}/commands` global, or `/guilds/{GUILD_ID}/commands` for instant
  guild-scoped during dev). Bot token in `Authorization: Bot <token>` — server-side script only.
- **Posting to a channel** (not as an interaction reply) uses the Bot token:
  `POST /channels/{channelId}/messages`.

## 2. Neon Postgres + Drizzle ORM

- Connect with `@neondatabase/serverless` (HTTP/pooled) for serverless compatibility:
  ```ts
  import { drizzle } from "drizzle-orm/neon-http";
  import { neon } from "@neondatabase/serverless";
  export const db = drizzle(neon(env.DATABASE_URL), { schema });
  ```
- Schema lives in `src/server/db/schema.ts`. **Migrations are generated & committed**
  (`drizzle-kit generate` → `drizzle-kit migrate`). Never hand-edit the DB.
- Use typed queries only; no raw string SQL except via `sql` template with params.
- Idempotent writes via `.onConflictDoNothing()` / `.onConflictDoUpdate()` on the
  `interaction.id` PK.
- `drizzle.config.ts` points at `schema.ts` + `DATABASE_URL`.

## 3. Auth.js v5 (NextAuth)

- Config in `src/server/auth.ts`; Credentials provider validating against `admin_users`
  (argon2/bcrypt hash). Session strategy **jwt**. `AUTH_SECRET` required.
- Export `auth`, `signIn`, `signOut`, and handlers; wire
  `app/api/auth/[...nextauth]/route.ts`.
- Protect `(dashboard)` via `middleware.ts` and/or an `await auth()` guard in the
  dashboard layout — redirect unauthenticated users to `/login`.
- Never expose session secrets to the client; read session in Server Components.

## 4. Mirror Channel (second channel)

- **Slack Incoming Webhook:** `POST <webhook_url>` with `{ "text": "..." }` (or Block Kit).
- **Discord channel webhook:** `POST <webhook_url>` with `{ "content": "..." }` /`embeds`.
- The webhook URL is a **secret** — store per-guild in `guilds.mirror_webhook_url`
  (server-only) or in `MIRROR_WEBHOOK_URL` env for single-guild MVP. Never send to client.
- Wrap in the Result pattern + retry; a mirror failure records `actions.status="failed"`
  and is retried — it must **not** break the Discord reply.

## 5. Google Gemini (stretch — AI triage)

- Use `@google/genai` (or REST) with `GEMINI_API_KEY` from **AI Studio free tier** (no card).
- Behind `AI_ENABLED` flag; default off. Model: a free-tier text model (verify current id
  via Context7). Prompt `/report` text → short summary + tags; store in `interactions`
  /`actions` and surface in the reply + dashboard.
- Must be resilient: AI timeout/failure downgrades gracefully (record `failed`, still reply).
- **Free only** — no paid LLM API.

## 6. Zod

- One schema per external shape in `src/lib/` or co-located. Parse env in `src/lib/env.ts`
  and fail fast. Parse Discord option payloads before use.

## 7. Tailwind CSS

- Utilities only, driven by tokens in [ui_tokens.md](ui_tokens.md). No arbitrary hex in
  JSX — use theme tokens/CSS variables. See [ui_rules.md](ui_rules.md).

## 8. Context7 usage reminder

For React, Next.js, Drizzle, Auth.js, Neon, discord-interactions, Tailwind, and Gemini —
**resolve the library id then query current docs** before implementing setup, config,
migrations, or version-sensitive APIs.
