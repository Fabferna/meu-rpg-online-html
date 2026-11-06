#!/usr/bin/env bash
# Recria o banco de teste local e aplica TODAS as migrações (uso: PGPORT=5433 scripts/dbtest/setup.sh).
set -euo pipefail
cd "$(dirname "$0")/../.."
export PGHOST=${PGHOST:-/tmp} PGPORT=${PGPORT:-5433} PGUSER=${PGUSER:-postgres}
dropdb --if-exists aeth_test >/dev/null && createdb aeth_test
psql -q -v ON_ERROR_STOP=1 -d aeth_test -f scripts/dbtest/bootstrap.sql
for f in supabase/migrations/*.sql; do psql -q -v ON_ERROR_STOP=1 -d aeth_test -f "$f" >/dev/null || { echo "FALHOU: $f"; exit 1; }; done
echo "OK: banco aeth_test com $(ls supabase/migrations/*.sql | wc -l) migrações"
