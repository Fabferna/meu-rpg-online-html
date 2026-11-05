-- =====================================================================
-- Passe de temporada, pets e masmorras
-- =====================================================================

-- ---------------------------------------------------------------------
-- PASSE DE TEMPORADA (temporada = mês UTC)
-- Os pontos do passe são calculados a partir dos contadores diários
-- já existentes (missões, caçadas, chefes, Arena, logins).
-- ---------------------------------------------------------------------
create table public.season_passes (
  user_id    uuid not null references auth.users (id) on delete cascade,
  season     text not null check (season ~ '^\d{4}-\d{2}$'),
  bought_at  timestamptz not null default now(),
  primary key (user_id, season)
);
alter table public.season_passes enable row level security;
create policy "own pass" on public.season_passes for select to authenticated using (user_id = auth.uid());
revoke insert, update, delete, truncate on public.season_passes from anon, authenticated;
revoke all on public.season_passes from anon;
grant select on public.season_passes to authenticated;

-- Pontos do passe no mês (espelho de PASS_POINTS em seasonPass.ts).
create or replace function public.season_points(p_user uuid, p_start date, p_end date) returns bigint
language sql stable security definer set search_path = '' as $$
  select coalesce(sum(case key
    when 'ev:quest'    then 40 * value
    when 'ev:pve_win'  then 10 * value
    when 'ev:boss_win' then 40 * value
    when 'ev:pvp'      then 20 * value
    when 'login'       then 30
    else 0 end), 0)::bigint
  from public.user_counters
  where user_id = p_user and day between p_start and p_end
    and key in ('ev:quest', 'ev:pve_win', 'ev:boss_win', 'ev:pvp', 'login');
$$;

create or replace function public.buy_season_pass(p_user uuid, p_season text, p_price int) returns void
language plpgsql security definer set search_path = '' as $$
begin
  if exists (select 1 from public.season_passes where user_id = p_user and season = p_season) then raise exception 'already_owned'; end if;
  perform public.charge(p_user, 'gems', p_price, 'season_pass:' || p_season);
  insert into public.season_passes (user_id, season) values (p_user, p_season);
end;
$$;

-- ---------------------------------------------------------------------
-- PETS
-- ---------------------------------------------------------------------
create table public.owned_pets (
  user_id     uuid not null references auth.users (id) on delete cascade,
  pet_id      text not null,
  level       int  not null default 1 check (level between 1 and 5),
  active      boolean not null default false,
  acquired_at timestamptz not null default now(),
  primary key (user_id, pet_id)
);
create unique index owned_pets_one_active on public.owned_pets (user_id) where active;
alter table public.owned_pets enable row level security;
create policy "own pets" on public.owned_pets for select to authenticated using (user_id = auth.uid());
revoke insert, update, delete, truncate on public.owned_pets from anon, authenticated;
revoke all on public.owned_pets from anon;
grant select on public.owned_pets to authenticated;

create or replace function public.give_pet(p_user uuid, p_pet text) returns void
language plpgsql security definer set search_path = '' as $$
begin
  insert into public.owned_pets (user_id, pet_id, active)
    values (p_user, p_pet, not exists (select 1 from public.owned_pets where user_id = p_user))
    on conflict do nothing;
end;
$$;

create or replace function public.buy_pet(p_user uuid, p_pet text, p_currency text, p_price int) returns void
language plpgsql security definer set search_path = '' as $$
begin
  if exists (select 1 from public.owned_pets where user_id = p_user and pet_id = p_pet) then raise exception 'already_owned'; end if;
  perform public.charge(p_user, p_currency, p_price, 'pet:' || p_pet);
  perform public.give_pet(p_user, p_pet);
end;
$$;

-- Treinar (subir de nível) com ouro. Custo vem do backend.
create or replace function public.train_pet(p_user uuid, p_pet text, p_cost int) returns int
language plpgsql security definer set search_path = '' as $$
declare v_level int;
begin
  select level into v_level from public.owned_pets where user_id = p_user and pet_id = p_pet for update;
  if v_level is null then raise exception 'not_owner'; end if;
  if v_level >= 5 then raise exception 'max_upgrade'; end if;
  perform public.charge(p_user, 'gold', p_cost, 'pet_train:' || p_pet);
  update public.owned_pets set level = level + 1 where user_id = p_user and pet_id = p_pet;
  return v_level + 1;
end;
$$;

create or replace function public.set_active_pet(p_user uuid, p_pet text) returns void
language plpgsql security definer set search_path = '' as $$
begin
  if p_pet is not null and not exists (select 1 from public.owned_pets where user_id = p_user and pet_id = p_pet) then
    raise exception 'not_owner';
  end if;
  update public.owned_pets set active = false where user_id = p_user and active;
  if p_pet is not null then update public.owned_pets set active = true where user_id = p_user and pet_id = p_pet; end if;
end;
$$;

-- ---------------------------------------------------------------------
-- Resgate genérico (passe, masmorras): ouro, gemas, cosmético, item,
-- elixir de XP e pet, tudo numa transação e uma única vez por chave.
-- ---------------------------------------------------------------------
create or replace function public.claim_bundle(
  p_user uuid, p_key text, p_gold int, p_gems int, p_cosmetic text, p_item text, p_qty int, p_boost_min int, p_pet text
) returns void
language plpgsql security definer set search_path = '' as $$
begin
  perform public.claim_reward(p_user, p_key, p_gold, p_gems, 0, p_cosmetic);
  if p_item is not null and p_qty > 0 then perform public.give_item(p_user, p_item, p_qty); end if;
  if p_boost_min > 0 then
    update public.characters
      set xp_boost_until = greatest(coalesce(xp_boost_until, now()), now()) + make_interval(mins => p_boost_min)
      where user_id = p_user;
  end if;
  if p_pet is not null then perform public.give_pet(p_user, p_pet); end if;
end;
$$;

-- ---------------------------------------------------------------------
-- MASMORRAS: entrada diária atômica (limite + energia)
-- ---------------------------------------------------------------------
create or replace function public.enter_dungeon(p_user uuid, p_dungeon text, p_daily_limit int, p_energy int) returns void
language plpgsql security definer set search_path = '' as $$
begin
  if exists (select 1 from public.battles where user_id = p_user and status = 'active') then raise exception 'in_battle'; end if;
  if exists (select 1 from public.quest_runs where user_id = p_user and status = 'running') then raise exception 'quest_already_running'; end if;
  if public.bump_counter(p_user, 'dungeon:' || p_dungeon) >= p_daily_limit then raise exception 'daily_limit'; end if;
  perform public.spend_energy(p_user, p_energy);
end;
$$;

do $$
declare f text;
begin
  foreach f in array array[
    'season_points(uuid,date,date)', 'buy_season_pass(uuid,text,int)', 'give_pet(uuid,text)', 'buy_pet(uuid,text,text,int)',
    'train_pet(uuid,text,int)', 'set_active_pet(uuid,text)', 'claim_bundle(uuid,text,int,int,text,text,int,int,text)',
    'enter_dungeon(uuid,text,int,int)'
  ] loop
    execute format('revoke execute on function public.%s from public, anon, authenticated', f);
    execute format('grant execute on function public.%s to service_role', f);
  end loop;
end $$;
