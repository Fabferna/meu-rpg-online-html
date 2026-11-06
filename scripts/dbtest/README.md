# Testes de banco (Postgres local)

Rodam as **rotas reais** do jogo (`src/app/api/...`) contra um Postgres local com **todas as migrações**,
usando um cliente Supabase falso (`fakeSupabase.ts`) que fala direto com o banco.

```bash
# 1) Postgres 16 ouvindo em /tmp:5433 (usuário postgres, sem senha), depois:
npm run test:db:setup   # recria o banco aeth_test e aplica supabase/migrations/*.sql
npm run test:db:items   # catálogo (items.ts) × tabela items × recompensas do jogo
npm run test:db:ch11    # reproduz a luta da Rainha das Harpias (capítulo 11)
npm run sim:act2        # capítulos 11–15, masmorras Santuário/Abismo e inimigos do Ato II
npm run test:db:loot    # tabela de saque: entrega, bolsa cheia → ouro, proteção contra azar, anti-farm, clique duplo
npm run test:db:shop    # venda em lote, Ferreiro (nível/bolsa cheia), Loja (limites, extrato, preço só do servidor)
npm run test:db:flows   # ponta a ponta: caçada, masmorra, história, missão, PvP, forja, venda, pets, passe, guilda, troca de herói
# test-reset.ts roda o reset global (0021): deixe por último.
```

Variáveis: `PGHOST` (padrão `/tmp`), `PGPORT` (`5433`), `PGUSER` (`postgres`), `N` (lutas por raça).
