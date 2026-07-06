# AI Notes

Abstrait was built with Claude Code as the primary implementation collaborator,
working against a fixed spec written up front: nine `context/*.md` files
(product scope, architecture/schema, phased build plan, code standards, library
integration notes, and UI tokens/rules/registry) plus a governing `agents.md`
that the AI is required to read, in order, before writing any code.

## Why this shape

Grading criteria for an integration project like this reward correctness on the
unhappy paths (forged signatures, duplicate deliveries, downstream outages, the
3-second window) as much as feature count. Writing the spec first — rather than
prompting feature-by-feature — meant every phase had a fixed contract to build
against: the database schema, the Result-pattern error handling, the naming
conventions, and the non-negotiable rules (verify before anything else, dedup on
`interaction.id`, never expose secrets) were all decided once and referenced
every time, instead of re-litigated per prompt.

## How work was sequenced

Six phases, each shipped and verified before the next started (`context/build_plan.md`):
foundation/schema → the signed interactions endpoint → rules/response/mirror →
auth/dashboard (this phase) → hardening → stretch goals. `context/progress_tracker.md`
and `context/ui_registry.md` are living documents the AI updates in the same change
that completes a feature — a deliberate check against silent scope drift or
components getting duplicated instead of reused.

## What AI collaboration looked like in practice

- The AI was asked to implement against context files it had already read, not
  against ad hoc descriptions — most prompts referenced a specific phase in
  `build_plan.md` rather than restating requirements.
- Non-obvious decisions were left in code comments explaining *why*, not what —
  e.g. why `middleware.ts` only imports the edge-safe half of the Auth.js config
  (`src/server/auth/config.ts`) and never the Credentials/bcrypt/DB half
  (`src/server/auth.ts`), which would break on the Edge runtime.
- Every feature was verified against the real flow before being marked done in
  the tracker: `tsc --noEmit` + `eslint` clean, a production `next build`, and an
  actual credentials login through a running dev server (seed admin → CSRF →
  sign in → session cookie → protected dashboard/commands/server pages) rather
  than trusting types alone.
- Where the AI's default instinct would have added scope (a Modal component, a
  theme toggle, websocket infra for the live log) the context files' explicit
  "not needed for MVP" / "no websocket infra, keep it simple" rules were treated
  as binding, and those items were left `planned`, not half-built.

## Honest limitations

- The live log updates via a 5-second polling interval (`router.refresh()`),
  not a websocket/SSE push — an explicit, documented trade-off for MVP scope
  (`code_standards.md` §4), not an oversight.
- AI-triage toggling exists in the command config UI but is disabled — it's
  wired for Phase 6, not implemented yet.
- End-to-end verification here was run against a local dev server and a real
  Neon database; the "live URL" pass in `progress_tracker.md` still needs an
  actual Vercel deploy to tick fully.
