# Testes de banco (Postgres local)

Rodam as **rotas reais** do jogo (`src/app/api/...`) contra um Postgres local com **todas as migrações**,
usando um cliente Supabase falso (`fakeSupabase.ts`) que fala direto com o banco.

```bash
# 1) Postgres 16 ouvindo em /tmp:5433 (usuário postgres, sem senha), depois:
npm run test:db:setup   # recria o banco aeth_test e aplica supabase/migrations/*.sql
npm run test:db:items   # catálogo (items.ts) × tabela items × recompensas do jogo
npm run test:db:ch11    # reproduz a luta da Rainha das Harpias (capítulo 11)
npm run sim:act2        # capítulos 11–15, masmorras Santuário/Abismo e inimigos do Ato II
```

Variáveis: `PGHOST` (padrão `/tmp`), `PGPORT` (`5433`), `PGUSER` (`postgres`), `N` (lutas por raça).
