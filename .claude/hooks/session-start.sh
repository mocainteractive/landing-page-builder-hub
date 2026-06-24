#!/bin/bash
# SessionStart hook for Claude Code on the web.
# Installs project dependencies so the agent can build, lint and run the app
# immediately. Runs only in the remote (web) environment; no-op locally.
set -euo pipefail

# Only run in Claude Code on the web; do nothing in local sessions.
if [ "${CLAUDE_CODE_REMOTE:-}" != "true" ]; then
  exit 0
fi

cd "${CLAUDE_PROJECT_DIR:-.}"

# `npm install` (not `ci`) so the cached container layer can be reused and the
# step stays idempotent across resumes.
npm install --no-audit --no-fund

echo "✓ Dependencies installed — ready to build/lint/dev."
