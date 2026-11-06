-- 0026: Encomendas do Colecionador (entrega atômica de itens por recompensa).
--
-- As encomendas do dia são calculadas no servidor (src/lib/game/collector.ts) a partir do dia (UTC)
-- e da faixa de nível; a rota confere se os itens escolhidos servem e manda para cá:
--  • p_take = [{id, qty}]: linhas do inventário e quantas unidades tirar de cada uma.
--  • Tudo numa transação: marca a encomenda como entregue (reward_claims, não repete), consome os
--    itens (não equipados, do próprio jogador) e paga ouro/gemas/XP com registro no extrato.
-- Os conjuntos de equipamento (sets.ts) não precisam de banco: o bônus é calculado no servidor
-- a partir das peças equipadas, como o bônus do pet.

create or replace function public.collector_deliver(
  p_user uuid, p_key text, p_take jsonb, p_gold int, p_gems int, p_xp int
) returns int
language plpgsql security definer set search_path = '' as $$
declare e jsonb; inv public.inventory; v_qty int; v_ups int;
begin
  if p_key not like 'collector:%' then raise exception 'invalid_action'; end if;
  if p_take is null or jsonb_typeof(p_take) <> 'array' or jsonb_array_length(p_take) = 0 or jsonb_array_length(p_take) > 10 then
    raise exception 'invalid_action';
  end if;
  if p_gold < 0 or p_gems < 0 or p_xp < 0 or p_gems > 10 then raise exception 'invalid_action'; end if;

  -- Primeiro marca como entregue: dois cliques → o segundo cai em already_claimed e nada é consumido.
  v_ups := public.claim_reward(p_user, p_key, p_gold, p_gems, p_xp, null);

  for e in select * from jsonb_array_elements(p_take) loop
    v_qty := (e->>'qty')::int;
    if v_qty is null or v_qty < 1 then raise exception 'invalid_action'; end if;
    select * into inv from public.inventory where id = (e->>'id')::uuid and user_id = p_user for update;
    if not found then raise exception 'not_owner'; end if;
    if inv.equipped then raise exception 'item_equipped'; end if;
    if inv.qty < v_qty then raise exception 'not_enough_items'; end if;
    if inv.qty > v_qty then update public.inventory set qty = qty - v_qty where id = inv.id;
    else delete from public.inventory where id = inv.id; end if;
  end loop;
  perform public.record_event(p_user, 'collector', 1);
  return v_ups;
end;
$$;

revoke execute on function public.collector_deliver(uuid, text, jsonb, int, int, int) from public, anon, authenticated;
grant execute on function public.collector_deliver(uuid, text, jsonb, int, int, int) to service_role;
