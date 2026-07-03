#!/usr/bin/env bash
#
# install-skills.sh — Claude Skills for the AI Opportunity Intelligence Platform
# Installs all ESSENTIAL + RECOMMENDED skills verified in SKILLS_ADOPTION_REPORT.md.
#
# Verified sources (2026-07-03):
#   - anthropics/skills        (official)
#   - vercel-labs/agent-skills (Vercel)
#   - trailofbits/skills       (Trail of Bits security firm)
#
# Skills are installed GLOBALLY (-g) for the claude-code agent, non-interactively (-y).
# Requires: Node.js (for npx) and network access to GitHub.
#
# NOTE: Official Anthropic skills install most cleanly via Claude Code's plugin
# marketplace. Run these INSIDE Claude Code if the CLI path gives you trouble:
#   /plugin marketplace add anthropics/skills
#   /plugin install document-skills@anthropic-agent-skills
#   /plugin install example-skills@anthropic-agent-skills
#   /plugin marketplace add trailofbits/skills
#
set -euo pipefail

echo "==> Installing Claude Skills for AI Opportunity Intelligence Platform"

run() { echo; echo ">> $*"; "$@"; }

# --- Vercel: React/Next + UI + docs quality (ESSENTIAL + RECOMMENDED) -----------
run npx --yes skills add vercel-labs/agent-skills \
  --skill react-best-practices \
  --skill web-design-guidelines \
  --skill composition-patterns \
  --skill writing-guidelines \
  -g -a claude-code -y

# --- Anthropic official: authoring, testing, MCP, design, docs, exports ---------
run npx --yes skills add anthropics/skills \
  --skill skill-creator \
  --skill webapp-testing \
  --skill mcp-builder \
  --skill theme-factory \
  --skill frontend-design \
  --skill doc-coauthoring \
  --skill docx \
  --skill pdf \
  -g -a claude-code -y

# --- Trail of Bits: security + supply chain + CI + test quality -----------------
run npx --yes skills add trailofbits/skills \
  --skill static-analysis \
  --skill insecure-defaults \
  --skill differential-review \
  --skill supply-chain-risk-auditor \
  --skill agentic-actions-auditor \
  --skill property-based-testing \
  -g -a claude-code -y

echo
echo "==> Done. Verify with:  npx skills list"
echo "==> Already built-in (do NOT reinstall): /code-review, /security-review, verify, dataviz, artifact-design, claude-api"
echo "==> Next: author custom skills with skill-creator —"
echo "    data-source-integration, opportunity-scoring-engine, llm-eval-harness (see Phase 5)."
