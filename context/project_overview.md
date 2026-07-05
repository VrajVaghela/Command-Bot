# Project Overview — Abstrait

> **Codename:** Abstrait — a Discord Slash-Command Bot + admin web app.

## 1. Product Definition

Abstrait is a small but production-grade full-stack product that lets a Discord
server admin wire their server to a bot that reacts to **slash commands**, records
every interaction, applies configurable rules, replies inside Discord, and
**mirrors a notification to a second channel** (a separate Discord channel or a
Slack Incoming Webhook). A login-protected dashboard shows a live log of every
command and action and lets the admin configure command behavior.

The bot uses Discord's **HTTP Interactions** model — Discord POSTs a signed JSON
payload to our public endpoint. There is **no always-on gateway websocket**. Every
request is Ed25519-signed and must be verified.

## 2. Core Purpose

Demonstrate correct, reliable, secure **integration engineering** across several
external services (Discord, Postgres, a mirror channel, a host, optionally an LLM)
shipped end-to-end on a live public URL. The integration correctness _is_ the
product — not the feature count.

## 3. Target Audience / Users

| Persona                    | Needs                                                                                                    |
| -------------------------- | -------------------------------------------------------------------------------------------------------- |
| **Server Admin** (primary) | Sign in, connect a Discord server, pick the post channel, configure command rules, watch the live log.   |
| **Discord End User**       | Runs `/report <text>`, `/status`, etc. inside Discord and gets an immediate, correct response.           |
| **Evaluator / Operator**   | Runs it locally from the README, throws forged/duplicate/slow requests at it, expects graceful behavior. |

## 4. Primary User Flow

1. **Admin signs in** to the web app (login-gated dashboard).
2. **Admin connects a Discord server** — adds the bot via OAuth invite and picks a
   channel the bot may post to; saves the mirror target (second Discord channel
   webhook or Slack Incoming Webhook).
3. **A user runs a slash command** in Discord (e.g. `/report The API is down` or
   `/status`).
4. Discord **POSTs a signed interaction** to `/api/interactions`.
5. The app **verifies the Ed25519 signature**, answers `PING` with `PONG`,
   **dedupes on interaction id**, **records** the command, **applies the configured
   rule**, **responds in Discord**, and **mirrors a notification** to the second
   channel — deferring and following up for any slow work to respect Discord's
   ~3-second window.
6. **Admin watches the dashboard** — a live log of every command + action taken,
   with per-command configuration controls.

## 5. IN SCOPE (MVP)

- ✅ Deployed, publicly reachable Next.js app on Vercel.
- ✅ A Discord application/bot with **at least two** registered slash commands
  (`/report`, `/status`).
- ✅ Interactions endpoint at `/api/interactions` with **Ed25519 verification** and
  correct **PING→PONG**.
- ✅ **Idempotent** processing — dedup on Discord interaction id.
- ✅ Persist every interaction + resulting action to Neon Postgres.
- ✅ Bot **responds in Discord** for at least one command (reply and/or channel post).
- ✅ Bot **mirrors a notification** to a second channel (Slack Incoming Webhook or
  separate Discord channel/webhook).
- ✅ **Deferred responses** + follow-up for slow work (respect ~3s window).
- ✅ **Login-gated dashboard**: live command/action log + command configuration UI.
- ✅ **Configurable command rules in the UI** (promoted from stretch — it is the
  core config surface).
- ✅ Reliability under unhappy paths: forged/replayed requests rejected, downstream
  outage does not silently drop an interaction (retry/queue), secrets never exposed.
- ✅ `README.md` + `.env.example` (no real secrets) + `AI_NOTES.md`.

## 6. Strictly OUT OF SCOPE (MVP) — prevents feature creep

- ❌ Gateway/websocket bot, voice, presence, or message-content reading.
- ❌ Interactive message components (buttons) — _stretch, not MVP_.
- ❌ Modal form for `/report` — _stretch, not MVP_.
- ❌ AI summarize/tag/triage step — _stretch; behind a feature flag, off by default_.
- ❌ Multi-server isolation with per-server config — _stretch; schema is designed to
  allow it but MVP assumes a single connected guild_.
- ❌ Multiple admin roles / RBAC / team accounts — single admin credential for MVP.
- ❌ Billing, paid tiers, analytics vendors, email.
- ❌ Native mobile app.

## 7. Success Criteria (how "done" is judged)

1. **Works end-to-end on the live URL** — run a command, watch it record, respond in
   Discord, and mirror to the second channel (not just the happy first step).
2. **Reliable & secure integration** — forged/unsigned request rejected (401),
   duplicate interaction processed once, downstream-briefly-down does not lose data,
   slow work deferred within 3s.
3. **Clean, readable code** and a clean repo with sensible commit history.
4. **Depth** via well-executed stretch goals (only after core is solid).
5. **Honest AI collaboration notes** (`AI_NOTES.md` + these context files).

## 8. Non-Negotiable Constraints

- **Everything free, no credit card, anywhere.** If a service asks for a card, the
  wrong tier was chosen — switch.
- **Secrets never exposed** — not in the repo, not in client code, not in logs.
- Deploy to a **real public host** (localhost cannot be a Discord endpoint).
- **72-hour** build window; a smaller thing done well beats a large half-broken thing.

## 9. Related Context

- Architecture & schema → [architecture.md](architecture.md)
- Phased delivery → [build_plan.md](build_plan.md)
- Live status → [progress_tracker.md](progress_tracker.md)
