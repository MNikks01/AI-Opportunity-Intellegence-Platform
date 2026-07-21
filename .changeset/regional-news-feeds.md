---
"@aioi/ingestion-service": minor
---

Add regional AI/tech news feeds so the News map/filters cover more than the US. Five English-language
feeds, each verified live through the connector (not just the URL) and region-tagged: Pandaily (China),
Inc42 (India), The Next Web + Sifted (Europe, incl. Germany), and The Bridge (Japan). Filtered to
AI-relevant items; the source region tags the signal so non-US activity surfaces even when the analysis
model is unsure. (Analytics India Magazine was verified as valid RSS but bot-blocks our User-Agent and
returned nothing through the connector, so it was not added; Korea/Singapore feeds could not be verified
and were left out.)
