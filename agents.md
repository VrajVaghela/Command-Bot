# agents.md — Master AI Instructions for Abstrait

You are the engineering AI for **Abstrait**, a Discord Slash-Command Bot + login-gated
admin dashboard (Next.js 15 · Neon Postgres · Drizzle · Auth.js · Vercel · optional
Gemini). This file governs how you work. **Follow it exactly — it overrides default
behavior.**

---

## 0. Golden Rules (read every time)

1. **Read the context first, in order** (below) before ANY implementation, plan, or
   architectural answer. Do not write code until you have.
2. **Never hard-code visual values.** All colors, spacing, typography, radii, motion come
   from [context/ui_tokens.md](context/ui_tokens.md) via Tailwind theme tokens.
3. **Update the trackers after EVERY feature.** On completing (or materially changing) any
   feature, update [context/progress_tracker.md](context/progress_tracker.md); on adding/
   changing any reusable component, update [context/ui_registry.md](context/ui_registry.md).
   Do this in the **same change**, not later.
4. **Stop and ask** if a request contradicts [context/architecture.md](context/architecture.md)
   or [context/project_overview.md](context/project_overview.md) (e.g. scope creep, breaking
   a security/architecture rule). Explain the conflict; propose a compliant alternative.

## 1. Required Reading Order (do this before implementing)

Read these **nine** files in `context/`, in this exact order, at the start of any task:

1. [context/project_overview.md](context/project_overview.md) — what we're building, scope.
2. [context/architecture.md](context/architecture.md) — stack, boundaries, folders, schema, rules.
3. [context/build_plan.md](context/build_plan.md) — phases & sequencing.
4. [context/code_standards.md](context/code_standards.md) — conventions, typing, errors.
5. [context/library_docs.md](context/library_docs.md) — per-library implementation rules.
6. [context/ui_tokens.md](context/ui_tokens.md) — design primitives.
7. [context/ui_rules.md](context/ui_rules.md) — component visual/interaction behavior.
8. [context/ui_registry.md](context/ui_registry.md) — existing reusable components (reuse first).
9. [context/progress_tracker.md](context/progress_tracker.md) — current state; what's done.

Then, and only then, act.

## 2. Non-Negotiable Domain Rules (from the assignment)

These are graded. Never violate them:

- **Verify Ed25519 on every interaction request** before anything else; read the **raw
  body**; forged/unsigned/replayed → **401**. Answer **PING (type 1) → PONG**.
- **Idempotency:** dedup on `interaction.id`. Never process the same interaction twice.
- **Respect the ~3-second window:** defer (type 5) + follow up for slow work.
- **Never drop an interaction** if a downstream call (mirror/AI) or the service is briefly
  down — record it, mark `failed`, retry. The Discord reply must still succeed.
- **Never expose secrets** — bot token, public key, mirror webhook URLs, DB URL — not in
  the repo, client code, or logs. Only `NEXT_PUBLIC_*` (non-secret) reaches the client.
- **Everything free, no credit card.** If a service needs a card, it's the wrong tier.

## 3. Architecture Guardrails

- DB/Drizzle access **only** in `src/server/**`. Client Components never touch the DB.
- Interactions route pins `runtime = "nodejs"` and reads the raw body before parsing.
- All env access via `src/lib/env.ts` (Zod, fail-fast). No raw `process.env` in features.
- Command behavior is read from `command_configs` (UI-editable) — no hard-coded per-command rules.
- Default to Server Components + Server Actions; `"use client"` only at leaves.

## 4. Coding Conventions (summary — full rules in code_standards.md)

- TypeScript strict, no `any`; validate external input with Zod.
- Files kebab-case; components PascalCase; DB snake_case; constants UPPER_SNAKE_CASE.
- Result pattern for fallible downstream calls; bounded exponential backoff; no silent catches.
- Conventional Commits; small focused commits; never commit real secrets.

## 5. Using Context7 (required for library work)

Before writing setup/config or version-sensitive code for **React, Next.js, Drizzle,
Auth.js, Neon, discord-interactions, Tailwind, or Gemini**, fetch current docs via
**Context7 MCP** (`resolve-library-id` → `query-docs`). Your training data may be stale;
prefer Context7 over guessing. (Not for refactors/business-logic debugging.)

## 6. Definition of Done for a feature

A feature is done only when:

- [ ] Code follows architecture + code standards; types pass; lint clean.
- [ ] Relevant quality-bar paths considered (verify/dedup/defer/retry/secrets).
- [ ] UI uses tokens only; new components logged in `ui_registry.md`.
- [ ] `progress_tracker.md` box ticked (+ `_Last updated_` date).
- [ ] Verified against the real flow where possible (see the `verify`/`run` skills).

## 7. When in doubt

Ask a focused question rather than guessing on: scope changes, security trade-offs,
schema changes, or anything that contradicts the context files. A smaller thing done
correctly beats a larger thing that breaks the quality bar.
