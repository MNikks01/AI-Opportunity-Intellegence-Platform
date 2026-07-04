# Design System

**Phase 11 · Status: complete (v1 tokens) · Last updated: 2026-07-03**
**Realized in:** `packages/ui` (Phase 17+). Skills: `theme-factory`, `web-design-guidelines`,
`frontend-design`, `emil-design-eng` (motion), `vercel-composition-patterns`.

Original identity, Linear/Vercel/Stripe-grade density and calm. Everything is a **token**; components
consume tokens, never raw values. Data-viz follows the `dataviz` skill; do not hardcode chart colors.

## 1. Brand

- **Personality:** precise, calm, trustworthy, fast. "Instrument panel for the AI economy."
- **Primary:** Indigo/violet (focus, intelligence). **Accent "Signal":** teal-lime (rising/positive).
- Logo mark: a stylized rising signal glyph (◧). Voice: confident, evidence-first, never hypey
  (mirrors the product's "explainable or it doesn't ship" principle). Prose per `writing-guidelines`.

## 2. Color tokens (semantic; hex are v1, tune in `theme-factory`)

Reference two layers: **primitives** (raw scales) → **semantic** tokens (what components use).

| Semantic token      | Light     | Dark      |
| ------------------- | --------- | --------- |
| `bg` (app)          | `#FBFBFD` | `#0B0C0F` |
| `bg-subtle` (cards) | `#FFFFFF` | `#131519` |
| `bg-muted`          | `#F2F3F7` | `#1B1E24` |
| `border`            | `#E5E7EB` | `#282C34` |
| `fg` (text)         | `#0B0C0F` | `#F5F6F8` |
| `fg-muted`          | `#5B6472` | `#9BA3AF` |
| `primary`           | `#5B5BD6` | `#7C7CF0` |
| `primary-fg`        | `#FFFFFF` | `#0B0C0F` |
| `accent` (Signal)   | `#0FB5A6` | `#2DD4BF` |
| `success`           | `#16A34A` | `#4ADE80` |
| `warning`           | `#D97706` | `#FBBF24` |
| `danger`            | `#DC2626` | `#F87171` |
| `focus-ring`        | `#5B5BD6` | `#7C7CF0` |

**Score bands** (semantic, not raw): `band-high` = success, `band-medium` = warning, `band-low` =
fg-muted. **Inverted dims** (competition/risk/difficulty) reuse the same band tokens but the UI label
states "high = worse" — color never implies good/bad on its own (a11y: not color-only).

## 3. Spacing scale (4px base)

`0, 1=4, 2=8, 3=12, 4=16, 5=20, 6=24, 8=32, 10=40, 12=48, 16=64`. Dashboards use 8/12/16 gutters;
cards pad 16–24. Density mode (compact tables) drops row padding to 8.

## 4. Typography

- **Sans:** Inter (or Geist) for UI. **Mono:** Geist Mono / JetBrains Mono for code, scores, IDs.
- Scale (rem): `xs .75 / sm .875 / base 1 / lg 1.125 / xl 1.25 / 2xl 1.5 / 3xl 1.875 / 4xl 2.25`.
- Line-height: 1.5 body, 1.2 headings. Weight: 400 body, 500 UI, 600 headings. Tabular-nums for scores.

## 5. Radii, elevation, borders

- Radii: `sm 6 / md 8 / lg 12 / xl 16 / full`. Cards `lg`; inputs/buttons `md`; pills `full`.
- Elevation: prefer borders + subtle shadow over heavy drop-shadows (calm). Shadow tokens `sm/md/lg`.
- 1px borders using `border` token; focus uses 2px `focus-ring` offset ring (never remove outline).

## 6. Motion (with `emil-design-eng` taste)

- Durations: `fast 120ms / base 180ms / slow 240ms`. Easing: `standard cubic-bezier(.2,0,0,1)`,
  `emphasized cubic-bezier(.2,0,0,1)` for enter, `exit` faster.
- Use motion for **meaning** (state change, spatial continuity), never decoration. Respect
  `prefers-reduced-motion` → cut to opacity-only/instant. Framer Motion for orchestration; page/route
  transitions subtle. Score bars animate width once on load, not on every render.

## 7. Accessibility (WCAG 2.2 AA — mandatory)

- Contrast ≥ 4.5:1 text / 3:1 large + UI; verified per `web-design-guidelines`.
- Full keyboard nav; visible focus; logical tab order; skip-to-content.
- ARIA on charts/tables (data table fallback for every chart); command palette is a proper dialog.
- No color-only meaning (score bands pair color + label + value). Motion respects reduced-motion.
- Forms: label + description + error text tied via `aria-describedby`; RHF + Zod messages.

## 8. Component inventory (`packages/ui`)

Primitives: Button, IconButton, Input, Select, Combobox, Checkbox, Radio, Switch, Textarea, Slider,
Tabs, Tooltip, Popover, Dialog/Modal, Sheet/Drawer, DropdownMenu, Toast, Badge/Pill, Avatar,
Skeleton, Spinner, Progress, Separator, Card, ScrollArea, Kbd.
Composite: AppShell, TopBar, SideNav, CommandPalette (⌘K), GlobalSearch, WorkspaceSwitcher,
NotificationCenter, DataTable (TanStack), Chart wrappers (Recharts + dataviz tokens), ScoreBar,
Scorecard, TrendCard, OpportunityCard, EntityChip, EvidenceLink, FilterBar, EmptyState, ErrorState,
StatTile/KPI, PricingTable, Paywall/UpgradePrompt, FlowCanvas (React Flow where useful).

## 9. Required states for every data component

`default · loading (skeleton) · empty (instructive) · error (retry) · partial/stale (badge) ·
paginated/virtualized`. No component ships without empty + loading + error. (Enforced in review.)

## 10. Theming

CSS variables per token, `:root` (light) + `[data-theme="dark"]`; respects `prefers-color-scheme`
with a user override toggle. Tailwind config maps utilities → tokens. One system, both themes.

## 11. Review checklist

- [x] Semantic tokens defined for light + dark; no raw values in components.
- [x] Score bands are not color-only; inverted dims labeled.
- [x] Motion respects reduced-motion and encodes meaning.
- [x] Every data component has loading/empty/error states.
- [x] WCAG 2.2 AA contrast + keyboard + ARIA specified.
- [x] Chart colors deferred to `dataviz` tokens, not hardcoded.
