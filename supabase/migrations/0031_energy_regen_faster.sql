-- 0031: energia volta 3× mais rápido — 1 ponto a cada 60 s (antes 180 s).
-- Espelho de ENERGY_REGEN_SECONDS em src/lib/game/rules.ts. Os custos (caçada 3, arena 6) ficam no código.
-- Só troca o 180 por 60 nas duas funções que calculam a energia atual.

create or replace function public.spend_energy(p_user uuid, p_amount int) returns int
language plpgsql security definer set search_path = '' as $$
declare
  c public.characters;
  v_now_energy int;
  v_max int;
begin
  select * into c from public.characters where user_id = p_user for update;
  if not found then raise exception 'no_character'; end if;
  v_max := public.f_max_energy(c.dex, c.level);
  v_now_energy := public.f_regen(c.energy, c.energy_updated_at, v_max, 60);
  if v_now_energy < p_amount then raise exception 'not_enough_energy'; end if;
  update public.characters set
    energy = v_now_energy - p_amount,
    energy_updated_at = case
      when v_now_energy >= v_max then now()
      else c.energy_updated_at + make_interval(secs => (v_now_energy - c.energy) * 60)
    end,
    updated_at = now()
  where user_id = p_user;
  perform public.add_counter(p_user, 'ev:energy', p_amount);
  return v_now_energy - p_amount;
end;
$$;

create or replace function public.refill_energy(p_user uuid) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  c public.characters;
  v_used int;
  v_price int;
  v_max int;
begin
  select * into c from public.characters where user_id = p_user for update;
  v_max := public.f_max_energy(c.dex, c.level);
  if public.f_regen(c.energy, c.energy_updated_at, v_max, 60) >= v_max then raise exception 'energy_full'; end if;

  v_used := public.bump_counter(p_user, 'energy_refill');
  v_price := least(50, 10 * (v_used + 1));
  perform public.charge(p_user, 'gems', v_price, 'energy_refill');

  update public.characters set energy = v_max, energy_updated_at = now(), updated_at = now() where user_id = p_user;
  return jsonb_build_object('price', v_price, 'energy', v_max);
end;
$$;
