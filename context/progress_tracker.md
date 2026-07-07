# Progress Tracker — Abstrait

> **Living checklist.** The AI **must** tick items here immediately upon completing a
> feature (same change), and log any new reusable component in
> [ui_registry.md](ui_registry.md). Mirrors [build_plan.md](build_plan.md). All boxes
> start empty. Legend: `[ ]` todo · `[~]` in progress · `[x]` done.

_Last updated: 2026-07-08 — Phase 6 (4 of 5 stretch goals): AI triage via
`@google/genai` (Gemini) behind `AI_ENABLED`/`aiEnabled`, wired as a new `"ai"`
downstream action with a single-attempt retry and a resilient no-op when
disabled/failed; interactive components + modal form shipped together — the
`/report` follow-up now carries a "File another report" button
(MESSAGE_COMPONENT) that opens a modal (MODAL_SUBMIT) reusing the exact
`/report` pipeline via a shared `handleReportSubmission`; multi-server
isolation — dashboard pages (`/server`, `/commands`, `/dashboard`) gained a
`GuildSwitcher` and now scope every query by the selected guild instead of
assuming a single connected server; deeper observability — per-kind
(discord_reply/mirror/ai) success/failed/pending breakdown and an
approximate retry-latency table, both derived from existing columns (no
migration).

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

- [x] AI triage via Gemini (flagged, free, resilient — `server/ai/gemini.ts`,
      single-attempt retry, disabled/failure degrades to the plain reply)
- [x] Interactive components (button → MESSAGE_COMPONENT follow-up — the
      "File another report" button on the `/report` follow-up)
- [x] Modal form (`/report` → MODAL_SUBMIT — the button opens a modal that
      reuses the exact `/report` pipeline via `handleReportSubmission`)
- [x] Multi-server isolation + per-guild config (`GuildSwitcher` + `?guild=`
      scoping across `/server`, `/commands`, `/dashboard`)
- [x] Deeper observability (metrics, retry timelines — per-kind
      success/failed/pending breakdown + approximate latency table, both
      derived from existing columns, no migration)

---

## Deliverables Checklist

- [ ] GitHub repo with clean commit history
- [ ] Deployed URL working & reachable
- [x] README.md (what it does, run locally, env vars, deploy notes)
- [x] `.env.example` (no real secrets)
- [ ] Test instructions + throwaway admin login + bot invite/test server
- [x] AI context/instruction files included (this `context/` + `agents.md`)
- [x] AI_NOTES.md (~1 page)
