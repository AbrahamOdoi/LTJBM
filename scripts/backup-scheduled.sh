#!/usr/bin/env bash
# Scheduled backup wrapper: dump + optional uploads/SQL + retention prune.
# Intended for host cron / systemd. See docs/backup-restore.md.
#
# Env:
#   BACKUP_DIR              default ./backups
#   BACKUP_RETENTION_DAYS   default 14
#   BACKUP_WITH_UPLOADS     default 1 (local photos archive)
#   BACKUP_WITH_SQL         default 0
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

BACKUP_DIR="${BACKUP_DIR:-$ROOT_DIR/backups}"
RETENTION_DAYS="${BACKUP_RETENTION_DAYS:-14}"
WITH_UPLOADS="${BACKUP_WITH_UPLOADS:-1}"
WITH_SQL="${BACKUP_WITH_SQL:-0}"

ARGS=()
if [[ "$WITH_SQL" == "1" || "$WITH_SQL" == "true" ]]; then
  ARGS+=(--sql)
fi
if [[ "$WITH_UPLOADS" == "1" || "$WITH_UPLOADS" == "true" ]]; then
  ARGS+=(--with-uploads)
fi

echo "[backup-scheduled] $(date -Is) starting → $BACKUP_DIR"
bash "$ROOT_DIR/scripts/backup-db.sh" "${ARGS[@]+"${ARGS[@]}"}"

# Prune old dumps / archives (custom-format, sql, uploads tarballs).
if [[ "$RETENTION_DAYS" =~ ^[0-9]+$ ]] && [[ "$RETENTION_DAYS" -gt 0 ]]; then
  echo "[backup-scheduled] pruning files older than ${RETENTION_DAYS} days in $BACKUP_DIR"
  find "$BACKUP_DIR" -maxdepth 1 -type f \( \
      -name 'cdms-*.dump' -o -name 'cdms-*.sql' -o -name 'uploads-*.tgz' \
    \) -mtime "+$RETENTION_DAYS" -print -delete || true
fi

echo "[backup-scheduled] $(date -Is) done"
