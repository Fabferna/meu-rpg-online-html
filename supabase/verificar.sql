-- =====================================================================
-- Verificação pós-instalação. Cole no SQL Editor e rode.
-- Todas as linhas devem mostrar  ok = true.
-- =====================================================================
with checks(item, ok, detalhe) as (
  select 'Tabelas do jogo criadas',
         count(*) = 23, count(*)::text || ' de 23'
    from information_schema.tables
   where table_schema = 'public' and table_type = 'BASE TABLE'
     and table_name in ('profiles','wallets','ledger','characters','items','inventory','quest_runs','battles',
       'owned_cosmetics','user_counters','limited_offers','offer_purchases','payments','reward_claims',
       'guilds','guild_members','chat_messages','guild_bosses','guild_boss_hits','chat_reports','game_events',
       'season_passes','owned_pets','ledger','items','profiles')
  union all
  select 'RLS ligado em todas as tabelas públicas',
         bool_and(c.relrowsecurity), coalesce(string_agg(c.relname, ', ') filter (where not c.relrowsecurity), 'todas protegidas')
    from pg_class c join pg_namespace n on n.oid = c.relnamespace
   where n.nspname = 'public' and c.relkind = 'r'
  union all
  select 'Jogadores NÃO podem gravar direto nas tabelas',
         not exists (select 1 from information_schema.role_table_grants
                      where table_schema = 'public' and grantee in ('anon','authenticated')
                        and privilege_type in ('INSERT','UPDATE','DELETE')),
         'sem INSERT/UPDATE/DELETE para anon/authenticated'
  union all
  select 'Funções de dinheiro só para o servidor',
         not has_function_privilege('authenticated', 'public.wallet_apply(uuid,text,bigint,text,text)', 'execute')
         and not has_function_privilege('authenticated', 'public.fulfill_payment(uuid,text,int,text)', 'execute')
         and not has_function_privilege('anon', 'public.grant_rewards(uuid,int,int,text,text,text)', 'execute'),
         'wallet_apply / fulfill_payment / grant_rewards'
  union all
  select 'Catálogo de itens', (select count(*) from public.items) >= 9, (select count(*) from public.items)::text || ' itens'
  union all
  select 'Evento de fim de semana', exists (select 1 from public.game_events where id = 'fim_de_semana_xp'), 'XP ×2 sábado/domingo'
  union all
  select 'Ofertas limitadas iniciais', (select count(*) from public.limited_offers) >= 2, (select count(*) from public.limited_offers)::text || ' ofertas'
  union all
  select 'Chat em tempo real (Realtime)',
         exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and tablename = 'chat_messages'),
         'se false: Database → Publications → supabase_realtime → marque chat_messages (o chat funciona mesmo assim, só mais lento)'
  union all
  select 'Gatilho de novos usuários',
         exists (select 1 from pg_trigger where tgname = 'on_auth_user_created'), 'cria perfil e carteira no cadastro'
  union all
  select 'Pelo menos um administrador',
         exists (select 1 from public.profiles where is_admin),
         'se false: crie seu herói e rode o comando de admin do DEPLOY.md'
)
select item, ok, detalhe from checks;
