---
name: ui-ux
description: >-
  Deep design-system guidance for the AI Opportunity Intelligence Platform — tokens, spacing, type,
  color, motion, dashboards, and component specs to a Linear/Vercel/Stripe quality bar with an original
  identity. Use when designing or reviewing UI: creating components in @aioi/ui, laying out dashboards,
  defining tokens/themes, building data viz, or evaluating visual quality. Complements the installed
  ui-ux-pro-max, frontend-design, and theme-factory skills.
---

# UI/UX & Design System

Original identity, Linear/Vercel/Stripe-grade density and calm. **Everything is a token; components
consume tokens, never raw values.** Primary indigo `--primary`, accent "Signal" teal `--accent`; light
+ dark are first-class. Data viz follows the `dataviz` skill (never hardcode chart colors). This skill
is the project-specific layer on top of the installed `ui-ux-pro-max`, `frontend-design`, and
`theme-factory` skills. Canonical: [DESIGN_SYSTEM](../../../docs/03-design/DESIGN_SYSTEM.md).

## When to apply

- Creating/reviewing components in `@aioi/ui` or dashboard layouts.
- Defining or changing tokens, themes, spacing, type, or motion.
- Designing data viz, empty/error states, or evaluating visual polish.

## Rule categories by priority

| Priority | Category | Why |
|---|---|---|
| **CRITICAL** | Accessibility & contrast | WCAG 2.2 AA is required; color is never the only signal. |
| **CRITICAL** | Token discipline | Raw values break theming + consistency across the app. |
| **HIGH** | Data-viz clarity | Scores/dashboards must be honest and readable (inverted dims labeled). |
| **HIGH** | Consistent spacing & type | The difference between "template" and "crafted". |
| **HIGH** | Required states | Empty/loading/error are part of the design, not afterthoughts. |
| **MEDIUM** | Motion | Meaningful, calm, reduced-motion-aware. |
| **MEDIUM** | Density & hierarchy | Enterprise dashboards need scannable information density. |

## Token system (the source of truth)

- **Color (semantic):** `bg, bg-subtle, bg-muted, border, fg, fg-muted, primary, primary-fg, accent,
  success, warning, danger, focus-ring` — defined for light + dark in `@aioi/ui/tokens.css`.
- **Score bands:** `high=success`, `medium=warning`, `low=fg-muted` — always paired with a value +
  label (never color alone). Inverted dims (competition/risk/difficulty) show a "↓ high=worse" cue.
- **Spacing:** 4px base (`2=8 3=12 4=16 6=24 …`). **Radii:** `md 8 / lg 12`. **Type:** Inter/Geist +
  mono for scores/ids; tabular-nums for numbers. **Motion:** `fast 120 / base 180 / slow 240ms`.

## Quick reference — the rules

### 1. Accessibility & contrast (CRITICAL)
- Text contrast ≥ 4.5:1 (≥ 3:1 large/UI). Visible 2px focus ring (never remove outline). Keyboard
  reachable; ARIA where needed; chart has a data-table fallback. Never encode meaning with color alone.

### 2. Token discipline (CRITICAL)
- Components use semantic tokens/utilities only — no hex/px literals. Both themes must be styled;
  respect `prefers-color-scheme` + the theme toggle. Chart colors come from `dataviz`, not literals.

### 3. Data-viz clarity (HIGH)
- Bands + confidence surfaced; inverted dims explicitly labeled. Avoid misleading axes; label units;
  choose chart type by the `dataviz` form heuristic. Prefer clarity over decoration.

### 4. Spacing & type (HIGH)
- Use the spacing scale (8/12/16/24 gutters); consistent card padding (16–24). One type scale; 1.5
  body / 1.2 heading line-height; 500 weight for UI, 600 headings.

### 5. Required states (HIGH)
- Every data component ships default · loading (skeleton) · empty (instructive) · error (retry) ·
  partial/stale (badge). Empty states teach the next action.

### 6. Motion (MEDIUM)
- Motion encodes state change / spatial continuity, not decoration. Reduced-motion → opacity/instant.
  Score bars animate once on load, not on every render.

### 7. Density & hierarchy (MEDIUM)
- Clear visual hierarchy (size/weight/space); scannable dashboards; a compact mode for dense tables.

## Component inventory (`@aioi/ui`)

Primitives: Button, IconButton, Input, Select, Combobox, Checkbox, Switch, Tabs, Tooltip, Popover,
Dialog, Sheet, DropdownMenu, Toast, Badge, Avatar, Skeleton, Spinner, Progress, Card, Kbd.
Composite: AppShell, TopBar, SideNav, CommandPalette (⌘K), GlobalSearch, WorkspaceSwitcher,
NotificationCenter, DataTable (TanStack), Chart wrappers (Recharts + dataviz), **ScoreBar, Scorecard,
TrendCard**, EntityChip, EvidenceLink, FilterBar, EmptyState, ErrorState, StatTile/KPI, Paywall.

## Patterns — good vs bad

**Token-driven, not color-only (score):**
```tsx
// ❌ BAD — hardcoded color, meaning by color alone, no label
<span style={{ color: score > 70 ? "#16a34a" : "#dc2626" }}>{score}</span>

// ✅ GOOD — token band + value + label; a11y-safe
<ScoreBar score={s} /> {/* renders label + value + band-colored bar; inverted dims show ↓ */}
```

**Both themes via tokens:**
```css
/* ✅ GOOD — semantic tokens; dark handled centrally */
.aioi-card { background: var(--bg-subtle); border: 1px solid var(--border); color: var(--fg); }
```

## Step-by-step: design a dashboard/component

1. Start from the wireframe + IA; define KPIs, filters, and drill-downs.
2. Use `theme-factory`/tokens for any new color; keep to the spacing + type scales.
3. Build from `@aioi/ui`; add the four required states.
4. Data viz via `dataviz` (form heuristic + palette); label inverted dims + units.
5. A11y pass (contrast, focus, keyboard, chart fallback); motion with reduced-motion.
6. Review against the pre-delivery checklist and `ui-ux-pro-max`/`web-design-guidelines`.

## Decision guide

| Need | Do | Don't |
|---|---|---|
| New color | add a semantic token (theme-factory) | inline a hex |
| Show a score | band + value + label (ScoreBar) | color-only indicator |
| Pick a chart | `dataviz` form heuristic | default to a pie |
| Dense table | compact density + virtualization | shrink font below scale |
| Emphasis/motion | meaningful transition | decorative animation |

## Failure modes → fixes

| Symptom | Cause | Fix |
|---|---|---|
| Broken/ugly dark mode | hardcoded colors | semantic tokens; test both themes |
| Fails contrast/a11y | color-only, low contrast, no focus | tokens + labels + 4.5:1 + focus ring |
| Misleading chart | wrong type / axis / no units | `dataviz` heuristic; label; honest axes |
| Inconsistent spacing/type | off-scale values | use spacing + type scales |
| "Template" feel | no hierarchy/density | craft hierarchy; calm density; polish |

## Pre-delivery checklist

- [ ] Semantic tokens only (no hex/px); light + dark both styled
- [ ] WCAG 2.2 AA: contrast ≥4.5:1, focus ring, keyboard, ARIA; chart data-table fallback
- [ ] Score bands paired with value + label; inverted dims labeled; no color-only meaning
- [ ] Spacing + type follow the scale; consistent card padding + hierarchy
- [ ] loading/empty/error/stale states present; empty states teach
- [ ] Charts via `dataviz` (form + palette); units labeled; honest axes
- [ ] Motion meaningful + reduced-motion aware
- [ ] Reviewed with `ui-ux-pro-max` / `web-design-guidelines`; CHANGELOG + changeset

## References
[DESIGN_SYSTEM](../../../docs/03-design/DESIGN_SYSTEM.md) · [WIREFRAMES](../../../docs/03-design/WIREFRAMES.md) ·
skills: `frontend`, `accessibility`, installed `ui-ux-pro-max`, `theme-factory`, `frontend-design`, `dataviz`, `brandkit`.
