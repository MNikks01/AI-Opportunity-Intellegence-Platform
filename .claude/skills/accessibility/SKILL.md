---
name: accessibility
description: >-
  Deep accessibility guidance for the AI Opportunity Intelligence Platform, targeting WCAG 2.2 AA. Use
  when building or reviewing any UI in apps/web or @aioi/ui — keyboard nav, focus, ARIA, contrast,
  forms, charts/tables, the command palette, modals, and motion. Accessibility here is a functional
  requirement, not a nice-to-have; it is checked on every UI change.
---

# Accessibility (WCAG 2.2 AA)

Accessibility is a functional requirement in the PRD/Design System. Enterprise users include keyboard-
and screen-reader-first workflows. The rules below are the ones that actually break in dashboards:
keyboard traps in modals/palette, color-only score indicators, missing chart alternatives, and
unlabeled icon buttons. Verify with the installed `web-design-guidelines` skill + axe. See
[DESIGN_SYSTEM §Accessibility](../../../docs/03-design/DESIGN_SYSTEM.md).

## When to apply

- Building/reviewing any component or page (especially interactive: modals, ⌘K palette, tables, charts).
- Forms, error messaging, notifications, and dynamic content updates.
- Any use of color to convey meaning (scores, statuses, bands).

## Rule categories by priority

| Priority | Category | Why |
|---|---|---|
| **CRITICAL** | Keyboard operability | Everything must work without a mouse; no traps. |
| **CRITICAL** | Perceivable info (not color-only) | Score bands/statuses must not rely on color alone. |
| **CRITICAL** | Names, roles, values | Screen readers need labeled, semantic controls. |
| **HIGH** | Focus management | Modals/palette must trap-then-restore focus correctly. |
| **HIGH** | Contrast | ≥4.5:1 text, ≥3:1 large/UI — in both themes. |
| **HIGH** | Data alternatives | Charts need a table/text equivalent. |
| **MEDIUM** | Motion & timing | Respect reduced-motion; no essential info on hover-only. |
| **MEDIUM** | Forms & errors | Labels, descriptions, error association. |

## Quick reference — the rules

### 1. Keyboard (CRITICAL)
- Every interactive element is reachable + operable by keyboard in a logical tab order. Provide
  skip-to-content. No keyboard traps — Esc closes overlays; focus never gets stuck.

### 2. Not color-only (CRITICAL)
- Score bands, statuses, and trends pair color with a value/label/icon. Inverted dims (competition/
  risk/difficulty) carry a "↓ high=worse" text cue, not just a hue.

### 3. Names/roles/values (CRITICAL)
- Use semantic HTML (`button`, `nav`, `main`, `table`, `label`). Icon-only buttons have `aria-label`.
  Live regions (`aria-live`) announce async updates (toasts, "scoring…"). Custom widgets get correct roles.

### 4. Focus management (HIGH)
- Dialogs/Sheets/⌘K: move focus in on open, trap within, restore to the trigger on close. Visible 2px
  focus ring (never `outline: none` without a replacement). `aria-modal` + labelled by a heading.

### 5. Contrast (HIGH)
- Text ≥ 4.5:1, large/UI ≥ 3:1 — verified in light **and** dark via tokens. Don't rely on faint borders alone.

### 6. Data alternatives (HIGH)
- Every chart has a data-table or text equivalent (the Scorecard already provides values). Charts are
  not the sole carrier of information.

### 7. Motion/timing (MEDIUM)
- Respect `prefers-reduced-motion` (opacity/instant). No essential content only on hover; ensure
  tooltips are dismissible + hoverable (WCAG 2.2 1.4.13). Avoid timeouts that lose work.

### 8. Forms (MEDIUM)
- Every field has a `<label>`; help + error text linked via `aria-describedby`; errors are announced
  and not color-only. Required state conveyed in text, not just an asterisk color.

## WCAG 2.2 additions to watch
Focus Appearance (2.4.11) · Focus Not Obscured (2.4.11/12) — sticky headers must not hide the focused
element · Dragging Alternatives (2.5.7) — provide non-drag ways for any drag interaction · Target Size
(2.5.8) ≥ 24×24px · Consistent Help (3.2.6) · Accessible Authentication (3.3.8).

## Patterns — good vs bad

**Icon button + live region:**
```tsx
// ❌ BAD — icon-only, no label; async change not announced
<button onClick={save}><SaveIcon/></button>

// ✅ GOOD — labelled; status announced
<button aria-label="Save to watchlist" onClick={save}><SaveIcon aria-hidden/></button>
<div aria-live="polite" className="sr-only">{status}</div>
```

**Score not color-only:**
```tsx
// ✅ GOOD — value + label + band (color is redundant, not required)
<Badge band={s.band}>{humanize(s.dimension)} {s.value}{inverted ? " ↓" : ""}</Badge>
```

**Accessible dialog (focus trap + restore):**
```tsx
// ✅ GOOD — @aioi/ui Dialog handles aria-modal, focus trap, Esc, restore
<Dialog title="Create watchlist" onClose={restoreFocusToTrigger}> … </Dialog>
```

## Step-by-step: a11y-review a component

1. Tab through it: everything reachable, logical order, visible focus, no trap, Esc works.
2. Screen-reader pass: names/roles/values correct; async updates announced.
3. Contrast check both themes (tokens). Remove any color-only meaning.
4. Charts: confirm a table/text equivalent. Forms: labels + linked errors.
5. Reduced-motion + target-size (≥24px) + tooltip dismissible.
6. Run axe (`web-design-guidelines`); add an a11y assertion to the component test.

## Failure modes → fixes

| Symptom | Cause | Fix |
|---|---|---|
| Can't operate by keyboard | non-semantic/`div` handlers | use `button`/semantic + key handlers |
| Focus lost/stuck in modal | no trap/restore | Dialog focus management; restore on close |
| SR user misses updates | no live region | `aria-live` for toasts/status |
| Colorblind users can't read scores | color-only band | add value/label/icon |
| Fails contrast in dark mode | hardcoded/faint colors | tokens; verify both themes |
| Chart unusable by SR | no alternative | data-table/text equivalent |

## Pre-delivery checklist

- [ ] Fully keyboard operable; logical order; skip-to-content; no traps; Esc closes overlays
- [ ] No color-only meaning (score bands have value/label; inverted dims labeled)
- [ ] Semantic HTML; icon buttons labelled; `aria-live` for async; correct roles
- [ ] Dialog/Sheet/⌘K trap + restore focus; visible focus ring; `aria-modal`
- [ ] Contrast ≥4.5:1 text / ≥3:1 UI in light **and** dark
- [ ] Charts have a data-table/text equivalent
- [ ] Reduced-motion honored; targets ≥24px; tooltips dismissible/hoverable
- [ ] Forms: labels + `aria-describedby` errors, announced, not color-only
- [ ] axe/`web-design-guidelines` clean; a11y test added

## References
[DESIGN_SYSTEM](../../../docs/03-design/DESIGN_SYSTEM.md) · skills: `frontend`, `ui-ux`, `testing`; installed `web-design-guidelines`.
