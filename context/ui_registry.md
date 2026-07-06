# UI Registry — Abstrait

> **Living document.** Every reusable UI component **must** be logged here the moment it
> is created. Before building a new component, **search this file first** — reuse or
> extend an existing one instead of duplicating. Primitives live in
> `src/components/ui/`; composed/feature components in `src/components/`.
>
> **Update protocol (mandatory):** on creating or materially changing a reusable
> component, add/update its row here in the same change. This is enforced by
> [../agents.md](../agents.md).

## How to log a component

| Field           | Meaning                                                      |
| --------------- | ------------------------------------------------------------ |
| **Component**   | PascalCase name                                              |
| **File**        | path under `src/`                                            |
| **Status**      | `planned` / `built` / `stable`                               |
| **Props (key)** | the main props / variants                                    |
| **Tokens used** | which [ui_tokens.md](ui_tokens.md) tokens it consumes        |
| **Notes**       | states (hover/focus/disabled/loading), a11y, where it's used |

---

## Primitives — `src/components/ui/`

| Component       | File                 | Status  | Props (key)                                                                    | Tokens used                            | Notes                                                          |
| --------------- | -------------------- | ------- | ------------------------------------------------------------------------------ | -------------------------------------- | -------------------------------------------------------------- |
| Button          | `ui/Button.tsx`      | built   | `variant` (primary/secondary/ghost/destructive), `size`, `loading`, `disabled` | primary/secondary/danger, ring, radius | hover/focus/disabled/loading per [ui_rules.md](ui_rules.md) §2 |
| Input           | `ui/Input.tsx`       | built   | `type`, `error`, `label`, `mono?`                                              | input, border, ring, danger            | label + inline error, §3                                       |
| Textarea        | `ui/Textarea.tsx`    | built   | `error`, `rows`                                                                | input, border, ring                    | §3, used by CommandConfigForm                                  |
| Select          | `ui/Select.tsx`      | built   | `options`, `value`, `onChange`                                                 | input, border, ring                    | native `<select>`, keyboard nav for free                       |
| SecretInput     | `ui/SecretInput.tsx` | built   | `label`, `reveal`                                                              | input, danger                          | masked, reveal toggle, never pre-fills real secret             |
| Card            | `ui/Card.tsx`        | built   | `title?`, `description?`, `footer?`                                            | card, border, radius, shadow           | §4                                                             |
| Badge           | `ui/Badge.tsx`       | built   | `status` (received/processed/success/pending/failed)                          | info/success/warning/danger            | status mapping §5                                              |
| Table           | `ui/Table.tsx`       | built   | `columns`, `rows`, `empty`                                                     | muted, border                          | sticky header, zebra rows, empty state §6                      |
| Modal           | `ui/Modal.tsx`       | planned | `open`, `onClose`, `title`                                                     | card, overlay, radius-lg, shadow-lg    | focus trap, Esc/overlay close §7 — not needed for MVP          |
| Toast / Toaster | `ui/Toast.tsx`       | planned | `variant`, `message`                                                           | semantic tokens                        | top-right, auto-dismiss §8 — not needed for MVP                |
| Spinner         | `ui/Spinner.tsx`     | built   | `size`                                                                         | foreground/muted                       | reduced-motion aware; used inline by Button's loading state    |
| Skeleton        | `ui/Skeleton.tsx`    | planned | `w`, `h`                                                                       | muted                                  | loading placeholders — not needed (polling is instant)         |
| ThemeToggle     | `ui/ThemeToggle.tsx` | planned | —                                                                              | background/foreground                  | dark hard-set on `<html>` for MVP; toggle deferred              |

## Feature components — `src/components/`

| Component          | File                       | Status  | Purpose                                                            | Notes                          |
| ------------------ | -------------------------- | ------- | ------------------------------------------------------------------ | ------------------------------ |
| DashboardShell     | `dashboard-shell.tsx`      | built   | Auth-gated layout: sidebar + topbar                                | §9; guard lives in `(dashboard)/layout.tsx` + `middleware.ts` |
| DashboardNav       | `dashboard-nav.tsx`        | built   | Sidebar nav with active-route highlighting                         | private to DashboardShell      |
| LiveLogPoller      | `live-log-poller.tsx`      | built   | Client `router.refresh()` every 5s                                 | renders nothing; no websocket/SSE infra per code_standards.md §4 |
| CommandLogTable    | `command-log-table.tsx`    | built   | Live log of interactions + actions                                 | driven by LiveLogPoller, status badges §6 |
| ActionStatusCell   | `action-status-cell.tsx`   | built   | Renders action kind + status + attempts                            | uses Badge                     |
| CommandConfigForm  | `command-config-form.tsx`  | built   | Edit `command_configs.rule` (enabled, template, mirror/AI toggles) | Server Action submit; AI toggle disabled (Phase 6 stretch) |
| ConnectServerPanel | `connect-server-panel.tsx` | built   | Bot invite link + pick post channel + mirror target                | uses SecretInput + Select; channel picker via bot token |
| MetricTile         | `metric-tile.tsx`          | built   | Dashboard hero metrics (counts, failure rate)                      | uses Card                      |
| LoginForm          | `login-form.tsx`           | built   | Admin credentials login                                            | Auth.js, `useActionState`, inline errors |

---

_When the table above changes, also tick the relevant item in
[progress_tracker.md](progress_tracker.md)._
