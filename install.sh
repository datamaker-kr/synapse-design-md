#!/usr/bin/env bash
# synapse-design-md installer (curl-bash). macOS + Linux.
# This script is pinned to a single release; the matching tag is recorded in
# VERSION below. To upgrade, fetch the install.sh from a newer tag and rerun.
set -euo pipefail

VERSION="0.3.0"
REPO="datamaker-kr/synapse-design-md"
REF="${SYNAPSE_DESIGN_MD_REF:-v${VERSION}}"
RAW_BASE="https://raw.githubusercontent.com/${REPO}/${REF}"

BLOCK_START_PREFIX="<!-- synapse-design-md:start"
BLOCK_END="<!-- synapse-design-md:end -->"

err() { printf 'synapse-design-md: %s\n' "$*" >&2; exit 1; }
log() { printf '%s\n' "$*"; }

require() { command -v "$1" >/dev/null 2>&1 || err "missing dependency: $1"; }
require curl
require awk
require sed
require grep

# sha256 wrapper: prefer sha256sum (Linux), fall back to shasum -a 256 (macOS).
sha256() {
  if command -v sha256sum >/dev/null 2>&1; then
    sha256sum | awk '{print $1}'
  else
    shasum -a 256 | awk '{print $1}'
  fi
}

# 1. Refuse to run outside a git repo root.
if [ ! -d .git ]; then
  err "run this from a git repository root (no .git/ here)."
fi

FORCE="${FORCE:-0}"
case "${1:-}" in
  --force|-f) FORCE=1 ;;
esac

# 2. Fetch templates.
log "Fetching templates from ${REF}..."
DESIGN_RAW="$(curl -fsSL "${RAW_BASE}/templates/DESIGN.md")" \
  || err "could not fetch ${RAW_BASE}/templates/DESIGN.md — check the tag exists."
AGENTS_RAW="$(curl -fsSL "${RAW_BASE}/templates/AGENTS.block.md")" \
  || err "could not fetch ${RAW_BASE}/templates/AGENTS.block.md."

# 3. Substitute version placeholder.
DESIGN_CONTENT="$(printf '%s\n' "${DESIGN_RAW}" | sed "s|__PACKAGE_VERSION__|${VERSION}|g")"
AGENTS_BLOCK="$(printf '%s\n' "${AGENTS_RAW}" | sed "s|__PACKAGE_VERSION__|${VERSION}|g")"

# 4. Write DESIGN.md with hash-based safety.
NEW_DESIGN_SHA="$(printf '%s' "${DESIGN_CONTENT}" | sha256)"
if [ -f DESIGN.md ]; then
  CURRENT_SHA="$(sha256 < DESIGN.md)"
  if [ "${CURRENT_SHA}" = "${NEW_DESIGN_SHA}" ]; then
    log "DESIGN.md: already current"
  else
    MANAGED_SHA=""
    if [ -f .synapse-design-md.json ]; then
      MANAGED_SHA="$(grep -o '"designMdSha256": *"[^"]*"' .synapse-design-md.json 2>/dev/null | sed -E 's/.*"([a-f0-9]+)".*/\1/' || true)"
    fi
    if [ "${FORCE}" = "1" ] || [ "${MANAGED_SHA}" = "${CURRENT_SHA}" ]; then
      printf '%s' "${DESIGN_CONTENT}" > DESIGN.md
      log "DESIGN.md: $( [ "${FORCE}" = "1" ] && echo "replaced with --force" || echo "replaced managed file" )"
    else
      NEW_PATH="DESIGN.md.synapse-v${VERSION}.new"
      printf '%s' "${DESIGN_CONTENT}" > "${NEW_PATH}"
      log "DESIGN.md: local changes detected; wrote ${NEW_PATH} for review"
      log "          re-run with --force after diffing, or merge manually."
    fi
  fi
else
  printf '%s' "${DESIGN_CONTENT}" > DESIGN.md
  log "DESIGN.md: created"
fi

# 5. Upsert AGENTS managed block.
TMP_AGENTS="$(mktemp)"
trap 'rm -f "${TMP_AGENTS}" "${TMP_AGENTS}.new" "${TMP_AGENTS}.block" 2>/dev/null || true' EXIT

if [ -f AGENTS.md ]; then
  cp AGENTS.md "${TMP_AGENTS}"
else
  : > "${TMP_AGENTS}"
fi

# Count existing managed blocks (allow updating exactly one; refuse if there are duplicates).
BLOCK_COUNT="$(grep -c "${BLOCK_START_PREFIX}" "${TMP_AGENTS}" 2>/dev/null || true)"
if [ "${BLOCK_COUNT}" -gt 1 ] && [ "${FORCE}" != "1" ]; then
  err "AGENTS.md contains multiple synapse-design-md managed blocks. Review duplicates and re-run with --force."
fi

# Materialize the block to a temp file so awk can read it (awk's -v cannot carry multi-line values).
BLOCK_FILE="${TMP_AGENTS}.block"
printf '%s\n' "${AGENTS_BLOCK}" > "${BLOCK_FILE}"

if [ "${BLOCK_COUNT}" -ge 1 ]; then
  # Replace the first managed block (and any duplicates when --force) by emitting BLOCK_FILE
  # in its place and skipping everything up to the matching end marker.
  awk -v block_file="${BLOCK_FILE}" -v start_pfx="${BLOCK_START_PREFIX}" -v end_marker="${BLOCK_END}" '
    function emit_block(   line) {
      while ((getline line < block_file) > 0) print line
      close(block_file)
    }
    BEGIN { in_block = 0 }
    {
      if (in_block) {
        if (index($0, end_marker) > 0) { in_block = 0; next }
        next
      }
      if (index($0, start_pfx) > 0) {
        emit_block()
        in_block = 1
        next
      }
      print
    }
  ' "${TMP_AGENTS}" > "${TMP_AGENTS}.new"
  ACTION="managed block replaced"
else
  if [ -s "${TMP_AGENTS}" ]; then
    # Strip trailing blank lines, then append a blank line + the block.
    sed -e :a -e '/^$/N;/\n$/ba' "${TMP_AGENTS}" > "${TMP_AGENTS}.new"
    printf '\n\n' >> "${TMP_AGENTS}.new"
    cat "${BLOCK_FILE}" >> "${TMP_AGENTS}.new"
  else
    cat "${BLOCK_FILE}" > "${TMP_AGENTS}.new"
  fi
  ACTION="managed block inserted"
fi

if [ -f AGENTS.md ] && cmp -s "${TMP_AGENTS}.new" AGENTS.md; then
  log "AGENTS.md: managed block already current"
else
  mv "${TMP_AGENTS}.new" AGENTS.md
  log "AGENTS.md: ${ACTION}"
fi

# 6. Write manifest.
INSTALLED_AT="$(date -u +%Y-%m-%dT%H:%M:%S.000Z)"
FINAL_DESIGN_SHA="$(sha256 < DESIGN.md)"
cat > .synapse-design-md.json <<JSON
{
  "version": "${VERSION}",
  "source": "synapse-design-md",
  "designMdSha256": "${FINAL_DESIGN_SHA}",
  "agentsBlockVersion": "${VERSION}",
  "installedAt": "${INSTALLED_AT}"
}
JSON
log ".synapse-design-md.json: written"

log ""
log "Installed synapse-design-md ${VERSION}."
log "Next: review DESIGN.md and AGENTS.md, then commit the three files."
