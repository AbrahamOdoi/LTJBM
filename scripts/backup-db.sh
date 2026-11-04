#!/usr/bin/env bash
# Logical Postgres backup for LTJBM CDMS (Docker Compose service: postgres).
# Usage:
#   ./scripts/backup-db.sh              # custom-format dump → ./backups/
#   ./scripts/backup-db.sh --sql        # plain SQL as well
#   ./scripts/backup-db.sh --with-uploads
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

COMPOSE_SERVICE="${COMPOSE_SERVICE:-postgres}"
POSTGRES_USER="${POSTGRES_USER:-cdms}"
POSTGRES_DB="${POSTGRES_DB:-cdms}"
STAMP="$(date +%Y%m%d-%H%M%S)"
BACKUP_DIR="${BACKUP_DIR:-$ROOT_DIR/backups}"
mkdir -p "$BACKUP_DIR"

DUMP_PATH="$BACKUP_DIR/cdms-$STAMP.dump"
SQL_PATH="$BACKUP_DIR/cdms-$STAMP.sql"
UPLOADS_PATH="$BACKUP_DIR/uploads-$STAMP.tgz"

WITH_SQL=0
WITH_UPLOADS=0
for arg in "$@"; do
  case "$arg" in
    --sql) WITH_SQL=1 ;;
    --with-uploads) WITH_UPLOADS=1 ;;
    -h|--help)
      sed -n '2,8p' "$0"
      exit 0
      ;;
    *)
      echo "Unknown option: $arg" >&2
      exit 1
      ;;
  esac
done

if ! docker compose ps --status running --services 2>/dev/null | grep -qx "$COMPOSE_SERVICE"; then
  echo "Compose service '$COMPOSE_SERVICE' is not running. Start with: docker compose up -d postgres" >&2
  exit 1
fi

echo "Writing custom-format dump → $DUMP_PATH"
docker compose exec -T "$COMPOSE_SERVICE" \
  pg_dump -U "$POSTGRES_USER" -d "$POSTGRES_DB" -Fc > "$DUMP_PATH"

if [[ "$WITH_SQL" -eq 1 ]]; then
  echo "Writing plain SQL → $SQL_PATH"
  docker compose exec -T "$COMPOSE_SERVICE" \
    pg_dump -U "$POSTGRES_USER" -d "$POSTGRES_DB" > "$SQL_PATH"
fi

if [[ "$WITH_UPLOADS" -eq 1 ]]; then
  if [[ -d public/uploads/members ]]; then
    echo "Archiving member photos → $UPLOADS_PATH"
    tar -czf "$UPLOADS_PATH" -C public/uploads members
  else
    echo "Skip uploads: public/uploads/members not found" >&2
  fi
fi

echo "Done."
ls -lh "$DUMP_PATH" ${WITH_SQL:+"$SQL_PATH"} ${WITH_UPLOADS:+"$UPLOADS_PATH"} 2>/dev/null || true
