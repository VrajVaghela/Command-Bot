# Build Plan — Abstrait

Six logical phases, sequenced so a **working, deployed core** exists as early as
possible, then hardened, then extended. Ship after Phase 4; Phases 5–6 are polish +
stretch. Keep [progress_tracker.md](progress_tracker.md) in sync as items complete.

---

## Phase 1 — Foundation, Env & Database

**Goal:** an empty-but-deployable app with a validated env and a live schema.

- [ ] Scaffold Next.js 15 (App Router, TS strict, Tailwind).
- [ ] Configure ESLint + Prettier per [code_standards.md](code_standards.md).
- [ ] `src/lib/env.ts` — Zod-validated env (server/client split); `.env.example`.
- [ ] Neon project + `DATABASE_URL`; Drizzle client `src/server/db/index.ts`.
- [ ] Define `schema.ts` (guilds, command_configs, interactions, actions, admin_users).
- [ ] `drizzle-kit generate` + `migrate`; commit migrations.
- [ ] Deploy skeleton to Vercel; confirm public URL + env wired. **← first live deploy.**

## Phase 2 — Discord Interactions Endpoint (the heart)

**Goal:** a signature-verified endpoint Discord will accept and that records commands.

- [ ] Create Discord application/bot in Developer Portal; capture App ID, Public Key, Bot Token.
- [ ] `scripts/register-commands.ts` — register `/report` and `/status`.
- [ ] `src/app/api/interactions/route.ts` (`runtime = "nodejs"`), read **raw body**.
- [ ] `server/discord/verify.ts` — Ed25519 verify; reject bad/replayed with **401**.
- [ ] Answer **PING (type 1) → PONG**.
- [ ] Dedup on `interaction.id` (unique constraint / upsert no-op).
- [ ] Record interaction row; respond in Discord for at least `/status`.
- [ ] Register the Interactions Endpoint URL in the portal; confirm Discord accepts it.
- [ ] Manual test: run `/status` in a real server → recorded + reply. **← core loop alive.**

## Phase 3 — Rules, Discord Response & Mirror Channel

**Goal:** commands apply configurable rules, reply, and mirror to a 2nd channel reliably.

- [ ] `server/rules/` — read `command_configs.rule` from DB; apply to `/report`.
- [ ] `server/discord/respond.ts` + `follow-up.ts` — immediate vs **deferred** (type 5)
      then follow-up via interaction webhook token (respect ~3s window).
- [ ] Post to the configured `post_channel_id` for `/report`.
- [ ] `server/mirror/` — send notification to Slack Incoming Webhook OR Discord webhook.
- [ ] Record every downstream `actions` row with status + attempts.
- [ ] **Resilience:** downstream failure → mark `failed`, do NOT drop; retry path
      (`/api/mirror/retry` or inline retry w/ backoff). User still gets a Discord reply.
- [ ] Idempotency verified: deliver same interaction twice → one action set.

## Phase 4 — Auth & Dashboard (login-gated)

**Goal:** admin can log in, watch the live log, and configure commands. **MVP complete.**

- [ ] Auth.js v5 Credentials provider + `admin_users` (hashed password); seed one admin.
- [ ] `middleware.ts` + `(dashboard)` layout guard — redirect unauthenticated users.
- [ ] Connect-server flow: OAuth bot invite link, pick post channel, save mirror target.
- [ ] Dashboard: **live command/action log** (recent interactions + actions + statuses).
- [ ] Command config UI: toggle enabled, edit rule (response template, mirror on/off).
- [ ] README.md + `.env.example` + AI_NOTES.md drafted.
- [ ] Full end-to-end pass on the **live URL**. **← SHIP HERE.**

## Phase 5 — Hardening, Security & Observability

**Goal:** behaves well unattended and under the unhappy paths in the quality bar.

- [ ] Adversarial tests: forged signature, bad timestamp, replayed body → 401.
- [ ] Duplicate-delivery test → processed once.
- [ ] Downstream-down test (mirror URL 500) → recorded failure + retry, no data loss.
- [ ] Slow-work test → deferred within 3s, followed up correctly.
- [ ] Structured logging (no secrets); visible failure/retry history in dashboard.
- [ ] Secret audit: nothing in repo/client/logs; `.env.example` has placeholders only.
- [ ] Rate-limit / basic abuse guard on the endpoint.

## Phase 6 — Stretch Goals (only after core is solid)

Pick by ROI; each is independent.

- [ ] **AI triage:** `/report` text → Gemini summarize/tag; show in reply + dashboard
      (behind `AI_ENABLED`, free key, resilient if AI is down).
- [ ] **Interactive components:** button on a message → MESSAGE_COMPONENT (type 3)
      follow-up (second verified interaction type).
- [ ] **Modal form:** `/report` opens a modal → MODAL_SUBMIT (type 5 interaction).
- [ ] **Multi-server:** per-guild isolation + config (schema already guild-scoped).
- [ ] **Deeper observability:** metrics, retry dashboards, failure timelines.

---

### Sequencing rationale

DB before endpoint (need to record). Endpoint before rules/mirror (need a verified
signal). Reliability/UI before stretch. Deploy in Phase 1 and keep it green every
phase — never let the live URL rot.
