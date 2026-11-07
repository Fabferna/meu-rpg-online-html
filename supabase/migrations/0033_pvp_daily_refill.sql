-- 0033: Arena com limite diário de 15 duelos e renovação com gemas (+15 duelos, 1 vez por dia).
-- O limite e o preço vêm do servidor (DAILY_DUELS / DUEL_REFILL em src/lib/game/rules.ts).
-- Gemas e contador numa transação só: sem gemas → nada muda; 2ª compra no dia → daily_limit.
create or replace function public.buy_pvp_refill(p_user uuid, p_limit int, p_price int) returns int
language plpgsql security definer set search_path = '' as $$
declare v_n int;
begin
  v_n := public.bump_counter(p_user, 'pvp_refill');          -- compras ANTES desta, hoje
  if v_n >= p_limit then raise exception 'daily_limit'; end if;
  perform public.charge(p_user, 'gems', p_price, 'pvp_refill', 'pvp_refill:' || p_user || ':' || current_date || ':' || v_n);
  return v_n + 1;
end;
$$;
revoke execute on function public.buy_pvp_refill(uuid, int, int) from public, anon, authenticated;
grant execute on function public.buy_pvp_refill(uuid, int, int) to service_role;
