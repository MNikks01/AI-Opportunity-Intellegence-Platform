---
"@aioi/ingestion-service": minor
"@aioi/web": patch
---

PyPI source — a 9th connector. Reads the official, keyless PyPI newest-packages RSS feed and keeps
the AI-relevant packages (a brand-new AI package is a leading indicator). New pypi connector +
runPypiIngestion, wired into the refresh pipeline; appears in the source filter automatically.
