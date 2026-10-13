#!/bin/bash
# Version bump script for Optinus Resource Management
# Usage: bash scripts/version-bump.sh <patch|minor|major> "<commit message>"
# Example: bash scripts/version-bump.sh minor "Add email notifications + weekly aging digest"

set -e

cd /home/z/my-project

BUMP_TYPE="${1:-patch}"
COMMIT_MSG="${2:-"Version bump"}"

# Get current version from latest tag
CURRENT=$(git describe --tags --abbrev=0 2>/dev/null || echo "v0.0.0")
CURRENT=${CURRENT#v}  # strip 'v' prefix

# Parse version parts
IFS='.' read -r MAJOR MINOR PATCH <<< "$CURRENT"

# Bump version
case "$BUMP_TYPE" in
  major)
    MAJOR=$((MAJOR + 1))
    MINOR=0
    PATCH=0
    ;;
  minor)
    MINOR=$((MINOR + 1))
    PATCH=0
    ;;
  patch)
    PATCH=$((PATCH + 1))
    ;;
  *)
    echo "Usage: bash scripts/version-bump.sh <patch|minor|major> \"<commit message>\""
    exit 1
    ;;
esac

NEW_VERSION="v${MAJOR}.${MINOR}.${PATCH}"
TODAY=$(date +"%b %Y")

echo "╔══════════════════════════════════════════════════════╗"
echo "║  Optinus Resource Management — Version Bump          ║"
echo "╠══════════════════════════════════════════════════════╣"
echo "║  Current:  v${CURRENT}                                     ║"
echo "║  New:      ${NEW_VERSION}                                     ║"
echo "║  Type:     ${BUMP_TYPE}                                 ║"
echo "║  Date:     ${TODAY}                                 ║"
echo "╚══════════════════════════════════════════════════════╝"
echo ""

# Stage all changes
git add -A

# Commit
git commit -m "${NEW_VERSION} — ${COMMIT_MSG}

Date: ${TODAY}
Type: ${BUMP_TYPE} release" 2>&1 || echo "(nothing to commit — working tree clean)"

# Create annotated tag
git tag -a "${NEW_VERSION}" -m "Optinus Resource Management ${NEW_VERSION} — ${COMMIT_MSG}"

echo ""
echo "✓ Committed and tagged as ${NEW_VERSION}"
echo ""
echo "To push to GitHub:"
echo "  git push origin main"
echo "  git push origin ${NEW_VERSION}"
echo ""
echo "Current tags:"
git tag -l
