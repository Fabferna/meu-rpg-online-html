-- 0023: renovar as missões do dia com gemas (+30 missões, 1 vez por dia).
-- Igual à renovação de caçadas (0022). Preço e limite vêm do servidor (QUEST_REFILL em rules.ts).
create or replace function public.buy_quest_refill(p_user uuid, p_limit int, p_price int) returns int
language plpgsql security definer set search_path = '' as $$
declare v_n int;
begin
  v_n := public.bump_counter(p_user, 'quest_refill');          -- compras ANTES desta, hoje
  if v_n >= p_limit then raise exception 'daily_limit'; end if;
  perform public.charge(p_user, 'gems', p_price, 'quest_refill', 'quest_refill:' || p_user || ':' || current_date || ':' || v_n);
  return v_n + 1;
end;
$$;
revoke execute on function public.buy_quest_refill(uuid, int, int) from public, anon, authenticated;
grant execute on function public.buy_quest_refill(uuid, int, int) to service_role;
