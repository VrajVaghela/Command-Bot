# UI Tokens — Abstrait

Design primitives for the admin dashboard. **Never hard-code visual values in JSX** —
reference these tokens (CSS variables + Tailwind theme). Dark-first, since it's an ops
dashboard; light mode supported. Palette is a neutral slate base with an indigo primary
and semantic status colors that map to `actions.status`.

## 1. Color System (CSS variables — HSL)

Define in `globals.css` under `:root` (light) and `.dark`. Reference via Tailwind theme
extension (`bg-background`, `text-foreground`, `bg-primary`, etc.).

```css
:root {
  --background: 0 0% 100%; /* app canvas            */
  --foreground: 222 30% 12%; /* primary text          */
  --muted: 210 20% 96%; /* subtle surfaces       */
  --muted-foreground: 215 16% 42%; /* secondary text        */
  --card: 0 0% 100%; /* card surface          */
  --card-foreground: 222 30% 12%;
  --border: 214 20% 88%;
  --input: 214 20% 88%;
  --ring: 243 75% 59%; /* focus ring (primary)  */

  --primary: 243 75% 59%; /* indigo — primary CTA  */
  --primary-foreground: 0 0% 100%;
  --secondary: 215 20% 92%; /* neutral button        */
  --secondary-foreground: 222 30% 20%;
  --accent: 262 83% 66%; /* violet accent/highlight*/
  --accent-foreground: 0 0% 100%;

  /* Semantic status — map to action/interaction status */
  --success: 142 71% 40%; /* processed / success   */
  --success-foreground: 0 0% 100%;
  --warning: 38 92% 50%; /* pending / retrying     */
  --warning-foreground: 222 30% 12%;
  --danger: 0 72% 51%; /* failed / rejected(401) */
  --danger-foreground: 0 0% 100%;
  --info: 243 75% 59%; /* received / neutral     */
}

.dark {
  --background: 222 30% 8%;
  --foreground: 210 20% 96%;
  --muted: 222 24% 14%;
  --muted-foreground: 215 16% 62%;
  --card: 222 26% 11%;
  --card-foreground: 210 20% 96%;
  --border: 222 20% 20%;
  --input: 222 20% 20%;
  --ring: 243 80% 66%;

  --primary: 243 80% 66%;
  --primary-foreground: 222 30% 8%;
  --secondary: 222 20% 20%;
  --secondary-foreground: 210 20% 96%;
  --accent: 262 83% 70%;
  --accent-foreground: 222 30% 8%;

  --success: 142 65% 45%;
  --warning: 38 92% 55%;
  --danger: 0 72% 58%;
  --info: 243 80% 66%;
}
```

### Semantic → status mapping (single source of truth)

| Token     | Used for                                       |
| --------- | ---------------------------------------------- |
| `info`    | interaction `received`, neutral badges         |
| `success` | `processed`, action `success`, signature valid |
| `warning` | action `pending`, retry in progress            |
| `danger`  | `failed`, forged/replayed request (401)        |

## 2. Typography Scale

- **Font family:** `--font-sans` = Inter (or system UI stack); `--font-mono` = a mono for
  IDs, tokens, and JSON payloads (`ui-monospace, "JetBrains Mono", monospace`).

| Token       | Size / line-height | Use                              |
| ----------- | ------------------ | -------------------------------- |
| `text-xs`   | 12 / 16            | timestamps, meta, table sub-text |
| `text-sm`   | 14 / 20            | table body, labels, badges       |
| `text-base` | 16 / 24            | body copy, inputs                |
| `text-lg`   | 18 / 28            | card titles                      |
| `text-xl`   | 20 / 28            | section headers                  |
| `text-2xl`  | 24 / 32            | page titles                      |
| `text-3xl`  | 30 / 36            | dashboard hero metric            |

- Weights: `400` body, `500` labels, `600` headings/buttons. Mono for IDs & payloads.

## 3. Spacing Scale

Tailwind default 4px base. Standardize on: `1(4px) 2(8px) 3(12px) 4(16px) 6(24px)
8(32px) 12(48px)`. Page gutter `px-6`; card padding `p-4`/`p-6`; stack gap `gap-4`.

## 4. Radius, Border, Shadow, Motion

| Token         | Value                                               |
| ------------- | --------------------------------------------------- |
| `--radius-sm` | 6px (badges, inputs)                                |
| `--radius`    | 10px (cards, buttons)                               |
| `--radius-lg` | 14px (modals)                                       |
| border width  | 1px, color `--border`                               |
| shadow-sm     | subtle (cards)                                      |
| shadow-md     | dropdowns/popovers                                  |
| shadow-lg     | modals                                              |
| motion        | 150ms ease-out (hover/focus), 200ms (modal/overlay) |

## 5. Z-index scale

`base 0 · dropdown 20 · sticky header 30 · overlay 40 · modal 50 · toast 60`.

## 6. Rules

- Consume tokens via Tailwind theme (`bg-background`, `text-muted-foreground`,
  `bg-success`, `ring-ring`) — **no raw hex/px in components**.
- Any new token is added here first, then used. See [ui_rules.md](ui_rules.md) for behavior.
