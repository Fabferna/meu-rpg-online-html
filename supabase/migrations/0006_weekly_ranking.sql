-- =====================================================================
-- Ranking semanal (temporada de segunda 00:00 UTC a domingo 23:59 UTC)
-- =====================================================================
-- Pontuação calculada a partir dos contadores diários já gravados
-- pelas funções do jogo (sem tabela extra, sem cron):
--   vitória PVP = 10 · chefe derrotado = 8 · missão concluída = 4 · caçada vencida = 2
-- As recompensas são resgatadas pelo jogador na semana seguinte
-- (claim_reward com a chave 'week:AAAA-MM-DD', que só pode ser usada 1 vez).

create or replace function public.weekly_scores(p_start date)
returns table (user_id uuid, score bigint)
language sql stable security definer set search_path = '' as $$
  select c.user_id,
         sum(case c.key
               when 'ev:pvp_win'  then 10 * c.value
               when 'ev:boss_win' then 8 * c.value
               when 'ev:quest'    then 4 * c.value
               when 'ev:pve_win'  then 2 * c.value
               else 0 end)::bigint as score
  from public.user_counters c
  where c.day between p_start and p_start + 6
    and c.key in ('ev:pvp_win', 'ev:boss_win', 'ev:quest', 'ev:pve_win')
  group by c.user_id
  having sum(c.value) > 0;
$$;

create index if not exists user_counters_day_key_idx on public.user_counters (day, key);

-- Título exclusivo do campeão (concedido pelo resgate da recompensa).
revoke execute on function public.weekly_scores(date) from public, anon, authenticated;
grant execute on function public.weekly_scores(date) to service_role;
