#!/usr/bin/env bash
# Junta todas as migrações em supabase/todas_as_migracoes.sql (para colar de uma vez no SQL Editor).
set -euo pipefail
cd "$(dirname "$0")/.."
{
  echo "-- ====================================================================="
  echo "-- Aethelgard Online — TODAS as migrações em um arquivo"
  echo "-- Gerado por scripts/build-all-migrations.sh. Rode UMA vez num projeto Supabase NOVO."
  echo "-- ====================================================================="
  for f in supabase/migrations/*.sql; do echo; echo "-- >>> $(basename "$f")"; cat "$f"; done
} > supabase/todas_as_migracoes.sql
echo "OK: supabase/todas_as_migracoes.sql"
