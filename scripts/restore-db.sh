#!/usr/bin/env bash
# Restore a custom-format dump produced by scripts/backup-db.sh.
# Usage:
#   ./scripts/restore-db.sh backups/cdms-YYYYMMDD-HHMMSS.dump
#   ./scripts/restore-db.sh backups/cdms-....dump --with-uploads backups/uploads-....tgz
#
# WARNING: --clean --if-exists replaces objects in the target database.
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

COMPOSE_SERVICE="${COMPOSE_SERVICE:-postgres}"
POSTGRES_USER="${POSTGRES_USER:-cdms}"
POSTGRES_DB="${POSTGRES_DB:-cdms}"

DUMP_PATH=""
UPLOADS_ARCHIVE=""

while [[ $# -gt 0 ]]; do
  case "$1" in
    --with-uploads)
      UPLOADS_ARCHIVE="${2:-}"
      shift 2
      ;;
    -h|--help)
      sed -n '2,8p' "$0"
      exit 0
      ;;
    *)
      if [[ -z "$DUMP_PATH" ]]; then
        DUMP_PATH="$1"
        shift
      else
        echo "Unexpected argument: $1" >&2
        exit 1
      fi
      ;;
  esac
done

if [[ -z "$DUMP_PATH" || ! -f "$DUMP_PATH" ]]; then
  echo "Usage: $0 <path-to.dump> [--with-uploads <uploads.tgz>]" >&2
  exit 1
fi

if ! docker compose ps --status running --services 2>/dev/null | grep -qx "$COMPOSE_SERVICE"; then
  echo "Compose service '$COMPOSE_SERVICE' is not running. Start with: docker compose up -d postgres" >&2
  exit 1
fi

echo "Restoring $DUMP_PATH into $POSTGRES_DB (clean/if-exists)…"
docker compose exec -T "$COMPOSE_SERVICE" \
  pg_restore -U "$POSTGRES_USER" -d "$POSTGRES_DB" --clean --if-exists < "$DUMP_PATH"

if [[ -n "$UPLOADS_ARCHIVE" ]]; then
  if [[ ! -f "$UPLOADS_ARCHIVE" ]]; then
    echo "Uploads archive not found: $UPLOADS_ARCHIVE" >&2
    exit 1
  fi
  echo "Restoring member photos from $UPLOADS_ARCHIVE"
  mkdir -p public/uploads
  tar -xzf "$UPLOADS_ARCHIVE" -C public/uploads
fi

echo "Restore complete. Restart the app, then verify Admin/Clerk login and member count."
echo "Optional: npx prisma migrate status"
