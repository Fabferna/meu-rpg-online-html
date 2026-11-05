-- =====================================================================
-- Login diário: ciclo de 7 dias + marcos de sequência (14 e 30 dias)
-- =====================================================================
create or replace function public.claim_daily_login(p_user uuid) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  v_today date := (now() at time zone 'utc')::date;
  v_prev int;
  v_streak int;
  v_day int;
  v_gold int;
  v_gems int;
  v_milestone text;
begin
  if exists (select 1 from public.user_counters where user_id = p_user and key = 'login' and day = v_today) then
    raise exception 'already_claimed';
  end if;
  select value into v_prev from public.user_counters where user_id = p_user and key = 'login' and day = v_today - 1;
  v_streak := coalesce(v_prev, 0) + 1;
  insert into public.user_counters (user_id, key, day, value) values (p_user, 'login', v_today, v_streak);

  -- Recompensa do ciclo de 7 dias (espelho de DAILY_LOGIN em catalog.ts).
  v_day := ((v_streak - 1) % 7) + 1;
  v_gold := (array[50, 75, 100, 125, 150, 200, 300])[v_day];
  v_gems := case v_day when 3 then 2 when 5 then 3 when 7 then 10 else 0 end;
  if v_day = 4 then perform public.give_item(p_user, 'pocao_vida', 2); end if;

  -- Marcos de sequência (espelho de LOGIN_MILESTONES).
  if v_streak = 14 then
    v_gems := v_gems + 15; v_milestone := 'streak_14';
  elsif v_streak = 30 then
    v_gems := v_gems + 30; v_milestone := 'streak_30';
    insert into public.owned_cosmetics (user_id, cosmetic_id) values (p_user, 'title_fiel') on conflict do nothing;
  end if;

  perform public.wallet_apply(p_user, 'gold', v_gold, 'daily_login', 'login:' || p_user || ':' || v_today);
  if v_gems > 0 then
    perform public.wallet_apply(p_user, 'gems', v_gems, 'daily_login', 'login-gems:' || p_user || ':' || v_today);
  end if;

  return jsonb_build_object('streak', v_streak, 'day', v_day, 'gold', v_gold, 'gems', v_gems,
                            'potions', case when v_day = 4 then 2 else 0 end, 'milestone', v_milestone);
end;
$$;
revoke execute on function public.claim_daily_login(uuid) from public, anon, authenticated;
grant execute on function public.claim_daily_login(uuid) to service_role;
