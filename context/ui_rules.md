# UI Rules — Abstrait

Visual + interaction behavior for the admin dashboard. All values come from
[ui_tokens.md](ui_tokens.md). Every reusable component built here is logged in
[ui_registry.md](ui_registry.md). Dark mode is a first-class citizen — verify contrast
in **both** themes (WCAG AA: 4.5:1 text, 3:1 UI).

## 1. Global Principles

- **Accessible by default:** semantic HTML, labels tied to inputs, visible focus rings
  (`ring-2 ring-ring ring-offset-2`), keyboard operable, `aria-*` on interactive widgets.
- **Consistent surfaces:** page → `bg-background`; raised content → `Card` (`bg-card`,
  `border`, `rounded-[--radius]`, `shadow-sm`).
- **Motion is subtle:** 150ms ease-out on hover/focus; respect `prefers-reduced-motion`.
- **Density:** it's an ops dashboard — compact tables, generous but not wasteful spacing.
- **No layout shift** on state change (loading skeletons reserve space).

## 2. Buttons

| Variant         | Look                                                                               | Use                                |
| --------------- | ---------------------------------------------------------------------------------- | ---------------------------------- |
| **Primary**     | `bg-primary text-primary-foreground`, `rounded-[--radius]`, `h-9 px-4`, weight 600 | main action (Save, Connect Server) |
| **Secondary**   | `bg-secondary text-secondary-foreground border`                                    | secondary actions                  |
| **Ghost**       | transparent, `hover:bg-muted`                                                      | toolbar/table row actions          |
| **Destructive** | `bg-danger text-danger-foreground`                                                 | disconnect, delete                 |

- **Hover:** slightly darken/lighten bg (`hover:opacity-90` or a `-hover` shade).
- **Focus-visible:** always show the ring.
- **Disabled:** `opacity-50 cursor-not-allowed`, no hover.
- **Loading:** show inline spinner, disable, keep width stable; drive via `useFormStatus`.

## 3. Inputs, Selects, Textareas

- `h-9`, `bg-background`/`bg-input`, `border`, `rounded-[--radius-sm]`, `px-3 text-sm`.
- Focus: `border-ring ring-2 ring-ring/40`. Placeholder: `text-muted-foreground`.
- **Error state:** `border-danger`, helper text `text-danger text-xs` below.
- Always pair with a `<label>`; required fields marked; validation messages inline.
- Mono font for token/ID/webhook fields; secret fields masked with a reveal toggle and
  never pre-filled with real secret values on the client.

## 4. Cards

- `bg-card text-card-foreground border rounded-[--radius] p-4/6 shadow-sm`.
- Optional header (title `text-lg` weight 600 + description `text-sm text-muted-foreground`).
- Used for: metric tiles, the command config panels, connected-server summary.

## 5. Badges (status)

Map **directly** to semantic tokens — this is how the log reads at a glance:

| Status                    | Badge                        |
| ------------------------- | ---------------------------- |
| `received`                | `bg-info/15 text-info`       |
| `processed` / `success`   | `bg-success/15 text-success` |
| `pending` / retrying      | `bg-warning/15 text-warning` |
| `failed` / rejected (401) | `bg-danger/15 text-danger`   |

- Small: `text-xs px-2 py-0.5 rounded-[--radius-sm]`, weight 500, uppercase optional.

## 6. Tables (the command/action log)

- Sticky header (`bg-muted`, `z-30`), zebra rows optional (`even:bg-muted/40`).
- Columns for the log: time · guild · command · user · status badge · action(s) · summary.
- Interaction id / user id shown in **mono**, truncated with copy-on-click + tooltip.
- Row hover `hover:bg-muted/60`. Empty state = centered muted message + primary CTA.
- **Live updates:** new rows fade/slide in (respect reduced-motion); most-recent first.
- Loading = skeleton rows; error = inline alert with retry.

## 7. Modals / Dialogs (stretch: connect-server, confirm actions)

- Overlay `bg-black/50` (`z-40`); panel `bg-card rounded-[--radius-lg] shadow-lg` (`z-50`).
- Focus trapped; `Esc` + overlay-click close (unless destructive-confirm); return focus
  to trigger. Title + description + action row (primary right, cancel left/ghost).

## 8. Toasts / Alerts

- Toasts top-right (`z-60`), auto-dismiss ~4s, colored by semantic token, dismissible.
- Inline alerts for form/section errors use `border-l-4` in the semantic color + icon.
- Never surface raw secret values or stack traces in UI — friendly message only.

## 9. Navigation & Layout

- Auth-gated shell: sidebar (Dashboard, Commands, Connected Server, Logs) + top bar
  (server name, admin menu, theme toggle). Sidebar collapses on small screens.
- Active nav item: `bg-muted text-foreground`; inactive `text-muted-foreground hover:...`.

## 10. Dark Mode

- Toggle persists (localStorage / cookie). Default **dark**. Verify every component in
  both themes; borders visible, badges legible, focus ring contrasts on both backgrounds.

## 11. Related Context

- Tokens → [ui_tokens.md](ui_tokens.md) · Component log → [ui_registry.md](ui_registry.md)
