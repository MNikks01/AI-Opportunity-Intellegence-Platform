# Scoring Rubric — v2026-07-01

Every score uses the 0–100 anchors below. Bump the version (and this heading) on any anchor
or weight change; never edit anchors silently — historical scores must stay comparable.

## Band thresholds (apply to every dimension)
- **low**: 0–39
- **medium**: 40–69
- **high**: 70–100

## Dimension anchors

Each dimension defines what 0, 50, and 100 *mean*. The model interpolates and must cite evidence.

| Dimension | 0 | 50 | 100 |
|---|---|---|---|
| **business** | No viable business; hobby only | Plausible niche business, unclear scale | Large, growing, clearly monetizable market |
| **developer** | No developer relevance | Useful dev tool, moderate demand | Must-have dev capability, broad adoption path |
| **creator** | No content angle | Some content potential | Highly shareable, evergreen content vein |
| **seo** | Saturated / no search volume | Moderate volume, beatable | High volume, low difficulty, rising queries |
| **competition** *(inverted: high = crowded)* | Greenfield, no competitors | A few established players | Saturated, well-funded incumbents |
| **monetization** | No willingness to pay | Some paid signal, low ACV | Clear WTP, strong ACV/recurring revenue |
| **risk** *(inverted: high = risky)* | Durable, low regulatory/platform risk | Some platform/model dependency | Fragile: legal, platform, or hype risk |
| **difficulty** *(inverted: high = hard)* | Weekend build | Solid MVP in weeks | Deep R&D / heavy infra / data moat needed |
| **predictedLifetime** | Days (fad) | Months (cycle) | Years (durable shift) |

> Inverted dimensions (competition, risk, difficulty): a **high value = worse** for the founder.
> The UI must label these clearly so "high competition" isn't misread as good.

## Composite: `opportunity`
Computed, not free-form. Weighted blend of sub-scores (inverted dims contribute negatively):

```
opportunity =
    0.25 * business
  + 0.15 * monetization
  + 0.15 * seo
  + 0.10 * developer
  + 0.10 * creator
  + 0.10 * (100 - competition)
  + 0.10 * (100 - risk)
  + 0.05 * (100 - difficulty)
```
`predictedLifetime` is reported alongside but not folded into `opportunity` (it's a horizon, not a quality).

## Confidence guidance
- **> 0.7** — multiple independent, recent, corroborating sources.
- **0.4–0.7** — partial signal or single strong source.
- **< 0.4** — thin/conflicting evidence; UI flags as "early signal."

## Changelog
- **2026-07-01** — Initial rubric.
