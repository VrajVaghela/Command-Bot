# Code Standards — Abstrait

Conventions are **enforced**, not suggested. When in doubt, match existing code.

## 1. Language & Typing

- **TypeScript strict** (`strict: true`, `noUncheckedIndexedAccess: true`). No `any` —
  use `unknown` + narrowing, or a Zod schema.
- **All external input is parsed with Zod** at the boundary: Discord payloads, form
  data, env, third-party responses. Never trust a shape you didn't validate.
- Prefer `type` for unions/props, `interface` for extendable object contracts.
- No non-null assertions (`!`) except immediately after a proven guard with a comment.
- Derive types from Drizzle (`InferSelectModel`/`InferInsertModel`) — never hand-retype rows.

## 2. Naming Conventions

| Thing                      | Convention                                     | Example                                 |
| -------------------------- | ---------------------------------------------- | --------------------------------------- |
| Files & folders            | **kebab-case**                                 | `follow-up.ts`, `command-configs/`      |
| React components           | **PascalCase** (file + symbol)                 | `CommandLogTable.tsx`                   |
| Component files            | PascalCase                                     | `Button.tsx`, `StatusBadge.tsx`         |
| Variables / functions      | **camelCase**                                  | `verifySignature`, `mirrorNotification` |
| Types / interfaces / enums | **PascalCase**                                 | `InteractionPayload`, `ActionStatus`    |
| Constants                  | **UPPER_SNAKE_CASE**                           | `PING`, `MAX_RETRIES`                   |
| DB tables / columns        | **snake_case**                                 | `command_configs`, `post_channel_id`    |
| Env vars                   | UPPER_SNAKE_CASE; secrets never `NEXT_PUBLIC_` | `DISCORD_PUBLIC_KEY`                    |
| Route Handlers             | folder `route.ts`                              | `app/api/interactions/route.ts`         |
| Server Actions             | verb-first camelCase, `"use server"`           | `updateCommandConfig`                   |

## 3. Project Structure Rules

- **Server-only code lives in `src/server/**`** and starts with `import "server-only"`.
  It must never be imported by a Client Component.
- **Client Components** are opt-in with `"use client"` at the top — keep them small and
  at the leaves. Default to **Server Components**.
- **DB access only in `src/server/**`.** UI reaches data via Server Components or Server
  Actions/Route Handlers — never a direct DB import in `"use client"` files.
- Isomorphic helpers/types go in `src/lib/**`; UI primitives in `src/components/ui/**`.
- One React component per file; co-locate its sub-parts only if private to it.

## 4. State Management

- **Server state is the default** — fetch in Server Components; mutate via Server Actions.
- No global client store (no Redux/Zustand) for MVP. Local UI state → `useState`/`useReducer`.
- Data mutations from the client call **Server Actions**, then `revalidatePath`/`router.refresh()`.
- The dashboard live log may poll (Server Action / route revalidation every N s) or use
  a lightweight `EventSource` — no websocket infra. Keep it simple; document the choice.
- Forms: server-action-first with `useFormStatus`/`useActionState`. Validate with Zod on
  the server regardless of any client validation.

## 5. Error Handling Protocol

- **Never throw across the Discord response path.** Verification failure → `401` with a
  minimal body. Everything else in the handler is wrapped so the user always gets a valid
  interaction response within the window.
- Downstream calls (mirror, AI, Discord follow-up) use a typed **Result** pattern:
  `{ ok: true, value } | { ok: false, error }`. Failures are recorded in `actions`
  (`status: "failed"`, incremented `attempts`) and retried — **never swallowed silently**.
- Retries use **bounded exponential backoff** with a max attempt cap (`MAX_RETRIES`).
- User-facing dashboard errors are friendly; server logs carry the detail (no secrets).
- Every `catch` either handles meaningfully or re-throws with context — no empty catches.

## 6. Security Rules (hard requirements)

- **Verify Ed25519 on every interaction request** before doing anything else; read the
  **raw body** for verification.
- **Idempotency:** dedup on `interaction.id`. Reprocessing is a no-op.
- Secrets only server-side. Never log tokens, public key, webhook URLs, or DB URL.
  Add a log redactor for known secret patterns.
- Hash admin passwords (argon2/bcrypt). Session via Auth.js JWT; guard all `(dashboard)` routes.
- All env access through `src/lib/env.ts`. Fail fast on missing/invalid.

## 7. Formatting & Tooling

- **Prettier** (default + Tailwind plugin) is the formatter of record; **ESLint** for correctness.
- Imports ordered: node/builtins → external → `@/` internal → relative; no unused imports.
- Path alias `@/*` → `src/*`.
- Async/await over `.then` chains. No floating promises (await or `void` explicitly).
- Comments explain **why**, not what. Match the surrounding comment density.

## 8. Commits & Git

- **Conventional Commits**: `feat:`, `fix:`, `chore:`, `docs:`, `refactor:`, `test:`.
- Small, focused commits with a clear history (the evaluator reads it).
- Never commit `.env*` (except `.env.example`) or any real secret. `.gitignore` enforced.

## 9. Testing

- Prioritize the **quality-bar paths**: signature verify (valid/forged/replayed),
  PING→PONG, dedup, defer/follow-up, mirror retry on downstream failure.
- Pure logic (rule engine, verify, mirror formatting) is unit-tested. Keep it runnable
  with `npm test`.

## 10. Related Context

- Library-specific how-tos → [library_docs.md](library_docs.md)
- Architecture rules → [architecture.md](architecture.md)
