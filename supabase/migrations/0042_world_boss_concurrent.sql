-- 0042: Chefe do Mundo — vários jogadores atacando AO MESMO TEMPO sem esperar uns pelos outros.
-- Antes, cada ataque travava a linha do chefe do começo ao fim (energia, limite, contadores...),
-- então os ataques entravam em fila. Agora tudo que é do próprio jogador vem primeiro e a vida do
-- chefe é descontada numa única instrução atômica no final (a trava dura milissegundos).

create or replace function public.world_boss_attack(
  p_user uuid, p_day date, p_boss_id text, p_max_hp bigint, p_starts timestamptz, p_ends timestamptz,
  p_damage bigint, p_limit int, p_energy int
) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare v_used int; v_hp bigint; v_before bigint; v_dealt bigint;
begin
  if now() < p_starts or now() >= p_ends then raise exception 'world_boss_closed'; end if;
  insert into public.world_bosses (day, boss_id, hp, max_hp, starts_at, ends_at)
    values (p_day, p_boss_id, p_max_hp, p_max_hp, p_starts, p_ends) on conflict do nothing;
  if exists (select 1 from public.world_bosses where day = p_day and hp <= 0) then raise exception 'boss_defeated'; end if;

  -- Só o jogador: limite de ataques (trava apenas a linha DELE) e energia.
  insert into public.world_boss_hits (day, user_id, damage, attacks) values (p_day, p_user, 0, 0)
    on conflict (day, user_id) do nothing;
  select attacks into v_used from public.world_boss_hits where day = p_day and user_id = p_user for update;
  if v_used >= p_limit then raise exception 'daily_limit'; end if;
  perform public.spend_energy(p_user, p_energy);

  -- Vida compartilhada: desconto atômico. "for no key update" (e não "for update"): não briga com a
  -- trava leve que o registro do golpe (chave estrangeira) põe no chefe; com "for update" dava deadlock.
  update public.world_bosses w
     set hp = greatest(0, w.hp - greatest(0, p_damage)),
         defeated_at = case when w.hp - greatest(0, p_damage) <= 0 then now() else w.defeated_at end
    from (select hp from public.world_bosses where day = p_day for no key update) o
   where w.day = p_day and w.hp > 0
   returning w.hp, o.hp into v_hp, v_before;
  if not found then raise exception 'boss_defeated'; end if;
  v_dealt := v_before - v_hp; -- o golpe final não passa da vida que restava

  update public.world_boss_hits set damage = damage + v_dealt, attacks = attacks + 1 where day = p_day and user_id = p_user;
  perform public.record_event(p_user, 'world_boss', 1);
  return jsonb_build_object('dealt', v_dealt, 'hp', v_hp, 'defeated', v_hp <= 0);
end;
$$;
revoke execute on function public.world_boss_attack(uuid, date, text, bigint, timestamptz, timestamptz, bigint, int, int) from public, anon, authenticated;
grant execute on function public.world_boss_attack(uuid, date, text, bigint, timestamptz, timestamptz, bigint, int, int) to service_role;
