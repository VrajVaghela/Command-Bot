# Progress Tracker — Abstrait

> **Living checklist.** The AI **must** tick items here immediately upon completing a
> feature (same change), and log any new reusable component in
> [ui_registry.md](ui_registry.md). Mirrors [build_plan.md](build_plan.md). All boxes
> start empty. Legend: `[ ]` todo · `[~]` in progress · `[x]` done.

_Last updated: 2026-07-06 — Phase 3 complete: rule engine, deferred `/report` (type 5) +
follow-up, channel post + mirror with idempotent retry-tracked `actions` rows, and a
`/api/mirror/retry` recovery route._

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

- [ ] Auth.js v5 Credentials + `admin_users` (hashed); admin seeded
- [ ] `middleware.ts` + dashboard layout guard
- [ ] Connect-server flow (invite link, post channel, mirror target)
- [ ] Live command/action log
- [ ] Command config UI (enabled, rule/template, mirror & AI toggles)
- [ ] README.md + `.env.example` + AI_NOTES.md drafted
- [ ] Full end-to-end pass on the live URL — **SHIP**

## Phase 5 — Hardening, Security & Observability

- [ ] Forged signature / bad timestamp / replay → 401 (tested)
- [ ] Duplicate delivery → processed once (tested)
- [ ] Downstream-down → recorded failure + retry, no loss (tested)
- [ ] Slow-work → deferred within 3s + follow-up (tested)
- [ ] Structured logging (secret redaction) + failure/retry history in dashboard
- [ ] Secret audit (repo/client/logs clean; `.env.example` placeholders only)
- [ ] Basic rate-limit / abuse guard on endpoint

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
- [ ] README.md (what it does, run locally, env vars, deploy notes)
- [ ] `.env.example` (no real secrets)
- [ ] Test instructions + throwaway admin login + bot invite/test server
- [ ] AI context/instruction files included (this `context/` + `agents.md`)
- [ ] AI_NOTES.md (~1 page)
