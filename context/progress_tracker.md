# Progress Tracker — Abstrait

> **Living checklist.** The AI **must** tick items here immediately upon completing a
> feature (same change), and log any new reusable component in
> [ui_registry.md](ui_registry.md). Mirrors [build_plan.md](build_plan.md). All boxes
> start empty. Legend: `[ ]` todo · `[~]` in progress · `[x]` done.

_Last updated: 2026-07-07 — Phase 5 complete: Node built-in test runner (`npm
test` / `npm run test:integration`, no new dependency) covering signature
verify (valid/forged/tampered/stale-timestamp), retry backoff, dedup, and
recorded-failure paths; timestamp-freshness check closes a real replay gap in
`verify.ts`; structured JSON logging with secret redaction replaces raw
`console.error`; `/api/mirror/retry` is now auth-gated; dashboard gained a
failures/retry-history panel with a manual retry trigger; basic in-memory
per-IP rate limit on `/api/interactions`; secret audit passed (no client-side
secret imports, `.env.local` untracked, `.env.example` placeholders only)._

---

## Phase 1 — Foundation, Env & Database

- [x] Next.js 15 (App Router, TS strict, Tailwind v4) scaffolded
- [x] ESLint + Prettier configured
- [x] `src/lib/env.ts` Zod env validation + `.env.example`
- [x] Neon project + `DATABASE_URL`; Drizzle client
- [x] `schema.ts` (guilds, command_configs, interactions, actions, admin_users)
- [x] Migrations generated + committed
- [x] Skeleton deployed to Vercel (public URL live, env wired)

## Phase 2 — Discord Interactions Endpoint

- [x] Discord app/bot created; App ID, Public Key, Bot Token captured
- [x] `/report` and `/status` registered (`scripts/register-commands.ts`, run via `npm run discord:register`)
- [x] `/api/interactions/route.ts` (Node runtime, raw body)
- [x] Ed25519 verification; forged/replayed → 401
- [x] PING (type 1) → PONG
- [x] Dedup on `interaction.id`
- [x] Interaction recorded; `/status` responds in Discord
- [x] Interactions Endpoint URL registered + accepted by Discord
- [x] Manual test in a real server passes

## Phase 3 — Rules, Discord Response & Mirror

- [x] Rule engine reads `command_configs.rule` from DB
- [x] Immediate vs deferred (type 5) + follow-up within ~3s
- [x] `/report` posts to configured `post_channel_id`
- [x] Mirror to 2nd channel (Slack webhook OR Discord webhook)
- [x] `actions` rows recorded with status + attempts
- [x] Downstream failure → recorded + retried, no data loss
- [x] Duplicate delivery → single action set (idempotent)

## Phase 4 — Auth & Dashboard (MVP complete)

- [x] Auth.js v5 Credentials + `admin_users` (hashed); admin seeded
- [x] `middleware.ts` + dashboard layout guard
- [x] Connect-server flow (invite link, post channel, mirror target)
- [x] Live command/action log
- [x] Command config UI (enabled, rule/template, mirror & AI toggles)
- [x] README.md + `.env.example` + AI_NOTES.md drafted
- [ ] Full end-to-end pass on the live URL — **SHIP** _(verified locally: login,
      guarded routes, dashboard/commands/server pages all pass; live-URL pass
      still pending an actual Vercel deploy)_

## Phase 5 — Hardening, Security & Observability

- [x] Forged signature / bad timestamp / replay → 401 (tested — `verify.test.ts`;
      added a timestamp-freshness check since `verifyKey` alone never rejected a
      stale-but-validly-signed replay)
- [x] Duplicate delivery → processed once (tested — `dedup.itest.ts`,
      `actions.itest.ts`, against the real dev DB's unique constraints)
- [x] Downstream-down → recorded failure + retry, no loss (tested —
      `retry.test.ts` for the backoff/give-up logic; `actions.itest.ts` for the
      persisted attempt/detail history)
- [x] Slow-work → deferred within 3s + follow-up (`respond.test.ts` covers the
      response builders; the route always returns the deferred ack synchronously
      and does downstream work in `after()` — see `process-report.ts`)
- [x] Structured logging (secret redaction) + failure/retry history in dashboard
- [x] Secret audit (repo/client/logs clean; `.env.example` placeholders only)
- [x] Basic rate-limit / abuse guard on endpoint (in-memory per-IP, documented
      single-instance trade-off — see `rate-limit.ts`)

## Phase 6 — Stretch Goals

- [ ] AI triage via Gemini (flagged, free, resilient)
- [ ] Interactive components (button → MESSAGE_COMPONENT follow-up)
- [ ] Modal form (`/report` → MODAL_SUBMIT)
- [ ] Multi-server isolation + per-guild config
- [ ] Deeper observability (metrics, retry timelines)

---

## Deliverables Checklist

- [ ] GitHub repo with clean commit history
- [ ] Deployed URL working & reachable
- [x] README.md (what it does, run locally, env vars, deploy notes)
- [x] `.env.example` (no real secrets)
- [ ] Test instructions + throwaway admin login + bot invite/test server
- [x] AI context/instruction files included (this `context/` + `agents.md`)
- [x] AI_NOTES.md (~1 page)
