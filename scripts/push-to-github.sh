#!/bin/bash
# Push specific files (or all changed files) to GitHub via the Contents API.
# Usage:  bash scripts/push-to-github.sh "commit message" file1 file2 ...
# Example: bash scripts/push-to-github.sh "feat: new command" guruh/converter.js

set -e

REPO="blacktech254/ULTRA-MD-"
BRANCH="main"
API="https://api.github.com/repos/${REPO}/contents"

if [ -z "${GITHUB_PERSONAL_ACCESS_TOKEN}" ]; then
  echo "❌ GITHUB_PERSONAL_ACCESS_TOKEN is not set"
  exit 1
fi

MESSAGE="${1}"
shift
FILES=("$@")

if [ -z "${MESSAGE}" ] || [ ${#FILES[@]} -eq 0 ]; then
  echo "Usage: bash scripts/push-to-github.sh \"commit message\" file1 file2 ..."
  exit 1
fi

WORKSPACE="/home/runner/workspace"

for FILE in "${FILES[@]}"; do
  LOCAL="${WORKSPACE}/${FILE}"

  if [ ! -f "${LOCAL}" ]; then
    echo "⚠️  Skipping ${FILE} — not found locally"
    continue
  fi

  # Get current SHA from GitHub (required for updates)
  SHA=$(curl -s -H "Authorization: token ${GITHUB_PERSONAL_ACCESS_TOKEN}" \
    "${API}/${FILE}?ref=${BRANCH}" | jq -r '.sha // empty')

  B64=$(base64 -w 0 "${LOCAL}")

  BODY=$(jq -n \
    --arg msg "${MESSAGE}" \
    --arg content "${B64}" \
    --arg sha "${SHA}" \
    --arg branch "${BRANCH}" \
    '{message: $msg, content: $content, sha: $sha, branch: $branch}')

  RESULT=$(curl -s -X PUT \
    -H "Authorization: token ${GITHUB_PERSONAL_ACCESS_TOKEN}" \
    -H "Content-Type: application/json" \
    "${API}/${FILE}" \
    -d "${BODY}")

  COMMIT=$(echo "${RESULT}" | jq -r '.commit.sha // empty')

  if [ -n "${COMMIT}" ]; then
    echo "✅ ${FILE} → ${COMMIT:0:7}"
  else
    ERR=$(echo "${RESULT}" | jq -r '.message // "unknown error"')
    echo "❌ ${FILE} → ${ERR}"
    exit 1
  fi
done

echo ""
echo "🚀 All files pushed to github.com/${REPO} (${BRANCH})"
