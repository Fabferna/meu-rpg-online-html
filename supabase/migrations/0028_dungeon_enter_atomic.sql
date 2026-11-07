-- 0028: entrar na masmorra de forma ATÔMICA.
-- Antes: a rota gastava a energia e a entrada do dia (enter_dungeon) e SÓ DEPOIS criava a luta.
-- Se a criação falhasse (ex.: dois pedidos no mesmo segundo, uma caçada começando junto),
-- o jogador perdia a energia e a entrada sem lutar. Agora tudo acontece numa transação só.
create or replace function public.enter_dungeon_battle(
  p_user uuid, p_dungeon text, p_daily_limit int, p_energy int, p_state jsonb
) returns uuid
language plpgsql security definer set search_path = '' as $$
declare v_id uuid;
begin
  perform public.enter_dungeon(p_user, p_dungeon, p_daily_limit, p_energy);
  begin
    insert into public.battles (user_id, kind, state) values (p_user, 'pve', p_state) returning id into v_id;
  exception when unique_violation then
    -- Já existe uma luta ativa: desfaz energia e entrada (a transação inteira volta).
    raise exception 'in_battle';
  end;
  return v_id;
end;
$$;

revoke execute on function public.enter_dungeon_battle(uuid, text, int, int, jsonb) from public, anon, authenticated;
grant execute on function public.enter_dungeon_battle(uuid, text, int, int, jsonb) to service_role;
