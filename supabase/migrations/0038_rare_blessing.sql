-- 0038: Encontros raros (Errantes) e Bênção dos Ancestrais. Regras em src/lib/game/encounters.ts.
-- Tudo em user_counters:
--   'rare_pending' (dia)        = índice do Errante esperando + 1 (some na virada do dia)
--   'rare_fight'   (dia)        = lutas contra Errantes hoje
--   'bless_roll'   (dia)        = já sorteou a Bênção hoje
--   'bless_points' (2000-01-01) = dias seguidos sem ganhar a Bênção (aumenta a chance)
--   'blessing_until' (2000-01-01) = fim da Bênção em minutos desde 1970

-- Um Errante aparece (depois de uma vitória na Caçada). Não substitui um que já esteja esperando.
create or replace function public.rare_spawn(p_user uuid, p_idx int, p_limit int) returns boolean
language plpgsql security definer set search_path = '' as $$
declare v_today date := (now() at time zone 'utc')::date; v_used int;
begin
  if p_idx < 0 or p_idx > 200 then raise exception 'invalid_action'; end if;
  select value into v_used from public.user_counters where user_id = p_user and key = 'rare_fight' and day = v_today;
  if coalesce(v_used, 0) >= p_limit then return false; end if;
  insert into public.user_counters (user_id, key, day, value) values (p_user, 'rare_pending', v_today, p_idx + 1)
    on conflict (user_id, key, day) do nothing;
  return found;
end;
$$;

-- Começar a luta contra o Errante: consome o encontro e conta no limite do dia (tudo ou nada).
create or replace function public.rare_start(p_user uuid, p_limit int) returns int
language plpgsql security definer set search_path = '' as $$
declare v_today date := (now() at time zone 'utc')::date; v_idx int;
begin
  delete from public.user_counters where user_id = p_user and key = 'rare_pending' and day = v_today returning value - 1 into v_idx;
  if v_idx is null then raise exception 'no_encounter'; end if;
  if public.bump_counter(p_user, 'rare_fight') >= p_limit then raise exception 'daily_limit'; end if;
  return v_idx;
end;
$$;

-- Sorteio da Bênção (1 vez por dia, depois de resgatar a recompensa diária).
-- p_roll = número aleatório 0..999999 gerado no servidor (RNG criptográfico); a chance vem dos pontos.
create or replace function public.bless_roll(p_user uuid, p_roll int, p_base_ppm int, p_per_point_ppm int, p_max_ppm int, p_minutes int)
returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  v_today date := (now() at time zone 'utc')::date;
  v_pts int; v_chance int; v_won boolean; v_until int;
begin
  if not exists (select 1 from public.user_counters where user_id = p_user and key = 'login' and day = v_today) then
    raise exception 'goal_incomplete';
  end if;
  insert into public.user_counters (user_id, key, day, value) values (p_user, 'bless_roll', v_today, 1)
    on conflict (user_id, key, day) do nothing;
  if not found then raise exception 'already_claimed'; end if;

  select value into v_pts from public.user_counters where user_id = p_user and key = 'bless_points' and day = date '2000-01-01';
  v_pts := coalesce(v_pts, 0);
  v_chance := least(p_max_ppm, p_base_ppm + p_per_point_ppm * v_pts);
  v_won := p_roll < v_chance;

  if v_won then
    v_until := floor(extract(epoch from now()) / 60)::int + p_minutes;
    insert into public.user_counters (user_id, key, day, value) values (p_user, 'blessing_until', date '2000-01-01', v_until)
      on conflict (user_id, key, day) do update set value = excluded.value;
    insert into public.user_counters (user_id, key, day, value) values (p_user, 'bless_points', date '2000-01-01', 0)
      on conflict (user_id, key, day) do update set value = 0;
  else
    insert into public.user_counters (user_id, key, day, value) values (p_user, 'bless_points', date '2000-01-01', v_pts + 1)
      on conflict (user_id, key, day) do update set value = v_pts + 1;
  end if;
  return jsonb_build_object('won', v_won, 'chance_ppm', v_chance, 'until', v_until, 'points', case when v_won then 0 else v_pts + 1 end);
end;
$$;

revoke execute on function public.rare_spawn(uuid, int, int) from public, anon, authenticated;
revoke execute on function public.rare_start(uuid, int) from public, anon, authenticated;
revoke execute on function public.bless_roll(uuid, int, int, int, int, int) from public, anon, authenticated;
grant execute on function public.rare_spawn(uuid, int, int) to service_role;
grant execute on function public.rare_start(uuid, int) to service_role;
grant execute on function public.bless_roll(uuid, int, int, int, int, int) to service_role;
