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
| Button          | `ui/Button.tsx`      | planned | `variant` (primary/secondary/ghost/destructive), `size`, `loading`, `disabled` | primary/secondary/danger, ring, radius | hover/focus/disabled/loading per [ui_rules.md](ui_rules.md) §2 |
| Input           | `ui/Input.tsx`       | planned | `type`, `error`, `label`, `mono?`                                              | input, border, ring, danger            | label + inline error, §3                                       |
| Textarea        | `ui/Textarea.tsx`    | planned | `error`, `rows`                                                                | input, border, ring                    | §3                                                             |
| Select          | `ui/Select.tsx`      | planned | `options`, `value`, `onChange`                                                 | input, border, ring                    | keyboard nav                                                   |
| SecretInput     | `ui/SecretInput.tsx` | planned | `label`, `reveal`                                                              | input, danger                          | masked, reveal toggle, never pre-fills real secret             |
| Card            | `ui/Card.tsx`        | planned | `title?`, `description?`, `footer?`                                            | card, border, radius, shadow           | §4                                                             |
| Badge           | `ui/Badge.tsx`       | planned | `status` (received/processed/pending/failed)                                   | info/success/warning/danger            | status mapping §5                                              |
| Table           | `ui/Table.tsx`       | planned | `columns`, `rows`, `empty`                                                     | muted, border                          | sticky header, skeleton, empty state §6                        |
| Modal           | `ui/Modal.tsx`       | planned | `open`, `onClose`, `title`                                                     | card, overlay, radius-lg, shadow-lg    | focus trap, Esc/overlay close §7                               |
| Toast / Toaster | `ui/Toast.tsx`       | planned | `variant`, `message`                                                           | semantic tokens                        | top-right, auto-dismiss §8                                     |
| Spinner         | `ui/Spinner.tsx`     | planned | `size`                                                                         | foreground/muted                       | reduced-motion aware                                           |
| Skeleton        | `ui/Skeleton.tsx`    | planned | `w`, `h`                                                                       | muted                                  | loading placeholders                                           |
| ThemeToggle     | `ui/ThemeToggle.tsx` | planned | —                                                                              | background/foreground                  | persists dark/light §10                                        |

## Feature components — `src/components/`

| Component          | File                       | Status  | Purpose                                                            | Notes                          |
| ------------------ | -------------------------- | ------- | ------------------------------------------------------------------ | ------------------------------ |
| DashboardShell     | `dashboard-shell.tsx`      | planned | Auth-gated layout: sidebar + topbar                                | §9; guards live in layout      |
| CommandLogTable    | `command-log-table.tsx`    | planned | Live log of interactions + actions                                 | live updates, status badges §6 |
| ActionStatusCell   | `action-status-cell.tsx`   | planned | Renders action kind + status + attempts                            | uses Badge                     |
| CommandConfigForm  | `command-config-form.tsx`  | planned | Edit `command_configs.rule` (enabled, template, mirror/AI toggles) | Server Action submit           |
| ConnectServerPanel | `connect-server-panel.tsx` | planned | Bot invite link + pick post channel + mirror target                | uses SecretInput               |
| MetricTile         | `metric-tile.tsx`          | planned | Dashboard hero metrics (counts, failure rate)                      | uses Card                      |
| LoginForm          | `login-form.tsx`           | planned | Admin credentials login                                            | Auth.js, inline errors         |

---

_When the table above changes, also tick the relevant item in
[progress_tracker.md](progress_tracker.md)._
