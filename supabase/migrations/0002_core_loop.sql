-- =====================================================================
-- Aethelgard Online — Fase 2: core loop (missões, combate, PVP, itens)
-- =====================================================================
-- Todas as mutações são funções SECURITY DEFINER executáveis apenas
-- pela service_role (backend). Elas travam a linha do personagem
-- (SELECT ... FOR UPDATE), então dois cliques simultâneos não conseguem
-- gastar a mesma energia duas vezes nem resgatar a mesma missão 2x.
--
-- As fórmulas de energia/HP/XP abaixo ESPELHAM src/lib/game/rules.ts.
-- Se mudar uma, mude a outra.
-- =====================================================================

alter table public.characters
  add column hp_updated_at timestamptz not null default now(),
  add column pvp_rating    int         not null default 1000 check (pvp_rating >= 0),
  add column pvp_wins      int         not null default 0,
  add column pvp_losses    int         not null default 0,
  add column pve_wins      int         not null default 0;

create index characters_rating_idx on public.characters (pvp_rating desc);

-- ---------------------------------------------------------------------
-- Fórmulas (espelho de rules.ts)
-- ---------------------------------------------------------------------
create or replace function public.f_max_energy(p_dex int, p_level int) returns int
language sql immutable as $$ select 50 + p_dex * 2 + ((p_level - 1) / 5) * 5 $$;

create or replace function public.f_max_hp(p_con int, p_level int) returns int
language sql immutable as $$ select 50 + p_con * 8 + (p_level - 1) * 10 $$;

create or replace function public.f_xp_next(p_level int) returns int
language sql immutable as $$ select 50 + (p_level - 1) * 25 $$;

-- Regeneração: 1 energia / 180s ; 1 HP / 10s
create or replace function public.f_regen(p_stored int, p_at timestamptz, p_max int, p_every int) returns int
language sql stable as $$
  select least(p_max, p_stored + floor(extract(epoch from (now() - p_at)) / p_every)::int)
$$;

-- ---------------------------------------------------------------------
-- BATTLES — estado do combate guardado no servidor
-- ---------------------------------------------------------------------
create table public.battles (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid        not null references auth.users (id) on delete cascade,
  kind        text        not null check (kind in ('pve', 'pvp')),
  status      text        not null default 'active' check (status in ('active', 'won', 'lost', 'fled')),
  state       jsonb       not null,
  version     int         not null default 0,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create unique index battles_one_active on public.battles (user_id) where status = 'active';
create index battles_user_idx on public.battles (user_id, created_at desc);

alter table public.battles enable row level security;
create policy "own battles" on public.battles for select to authenticated using (user_id = auth.uid());
revoke insert, update, delete, truncate on public.battles from anon, authenticated;
revoke all on public.battles from anon;
grant select on public.battles to authenticated;

-- Um item equipado por slot.
alter table public.inventory add column slot text;
create unique index inventory_one_per_slot on public.inventory (user_id, slot) where equipped;

-- ---------------------------------------------------------------------
-- Catálogo inicial de itens
-- ---------------------------------------------------------------------
insert into public.items (id, name, kind, rarity, data) values
  ('espada_curta',      'Espada Curta Funcional',      'weapon',    'common',    '{"slot":"weapon","atk":4,"image":"/assets/espada_curta_funcional.png","price":120}'),
  ('arco_elfico',       'Arco Élfico Elegante',        'weapon',    'rare',      '{"slot":"weapon","atk":7,"dex":2,"image":"/assets/arco_elfico_elegante.png","price":420}'),
  ('cajado_luminoso',   'Cajado Mágico Luminoso',      'weapon',    'rare',      '{"slot":"weapon","atk":3,"intel":4,"image":"/assets/cajado_magico_luminoso.png","price":420}'),
  ('peitoral_anao',     'Peitoral de Placas Anão',     'armor',     'epic',      '{"slot":"armor","def":8,"con":2,"image":"/assets/peitoral_de_placas_anao.png","price":900}'),
  ('amuleto_serpente',  'Amuleto da Serpente Sinistra','accessory', 'legendary', '{"slot":"accessory","atk":4,"def":3,"intel":3,"image":"/assets/amuleto_da_serpente_sinistra.png","price":2500}'),
  ('pocao_vida',        'Poção de Vida',               'consumable','common',    '{"heal":60,"image":"/assets/loader.png","price":25}')
on conflict (id) do update set name = excluded.name, kind = excluded.kind, rarity = excluded.rarity, data = excluded.data;

-- =====================================================================
-- FUNÇÕES
-- =====================================================================

-- Gasta energia (com regeneração aplicada) de forma atômica.
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
  v_now_energy := public.f_regen(c.energy, c.energy_updated_at, v_max, 180);
  if v_now_energy < p_amount then raise exception 'not_enough_energy'; end if;

  -- Preserva o "progresso" do próximo ponto: avança o carimbo só pelos
  -- pontos inteiros já regenerados.
  update public.characters set
    energy = v_now_energy - p_amount,
    energy_updated_at = case
      when v_now_energy >= v_max then now()
      else c.energy_updated_at + make_interval(secs => (v_now_energy - c.energy) * 180)
    end,
    updated_at = now()
  where user_id = p_user;

  return v_now_energy - p_amount;
end;
$$;

-- Define o HP atual (após combate / poção).
create or replace function public.set_hp(p_user uuid, p_hp int) returns void
language plpgsql security definer set search_path = '' as $$
declare c public.characters;
begin
  select * into c from public.characters where user_id = p_user for update;
  update public.characters
    set hp = greatest(0, least(p_hp, public.f_max_hp(c.con, c.level))), hp_updated_at = now(), updated_at = now()
    where user_id = p_user;
end;
$$;

-- Concede XP (com level up), ouro e item. Retorna o nº de níveis ganhos.
create or replace function public.grant_rewards(
  p_user uuid, p_xp int, p_gold int, p_item text, p_reason text, p_ref text
) returns int
language plpgsql security definer set search_path = '' as $$
declare
  c public.characters;
  v_xp bigint;
  v_level int;
  v_ups int := 0;
begin
  if p_xp < 0 or p_gold < 0 then raise exception 'negative_reward'; end if;

  select * into c from public.characters where user_id = p_user for update;
  v_xp := c.xp + p_xp;
  v_level := c.level;
  while v_level < 200 and v_xp >= public.f_xp_next(v_level) loop
    v_xp := v_xp - public.f_xp_next(v_level);
    v_level := v_level + 1;
    v_ups := v_ups + 1;
  end loop;

  update public.characters set
    xp = v_xp,
    level = v_level,
    attribute_points = attribute_points + v_ups * 3,
    -- Level up enche a vida.
    hp = case when v_ups > 0 then public.f_max_hp(c.con, v_level) else hp end,
    hp_updated_at = case when v_ups > 0 then now() else hp_updated_at end,
    updated_at = now()
  where user_id = p_user;

  if p_gold > 0 then
    perform public.wallet_apply(p_user, 'gold', p_gold, p_reason, p_ref);
  end if;

  if p_item is not null then
    perform public.give_item(p_user, p_item, 1);
  end if;

  return v_ups;
end;
$$;

-- Adiciona item ao inventário (consumíveis empilham).
create or replace function public.give_item(p_user uuid, p_item text, p_qty int) returns void
language plpgsql security definer set search_path = '' as $$
declare v_kind text; v_slot text;
begin
  select kind, data->>'slot' into v_kind, v_slot from public.items where id = p_item;
  if v_kind is null then raise exception 'unknown_item'; end if;

  if v_kind = 'consumable' then
    update public.inventory set qty = qty + p_qty where user_id = p_user and item_id = p_item;
    if found then return; end if;
    insert into public.inventory (user_id, item_id, qty) values (p_user, p_item, p_qty);
  else
    insert into public.inventory (user_id, item_id, qty, slot) select p_user, p_item, 1, v_slot from generate_series(1, p_qty);
  end if;
end;
$$;

-- Consome 1 unidade de um consumível. Retorna false se não tiver.
create or replace function public.consume_item(p_user uuid, p_item text) returns boolean
language plpgsql security definer set search_path = '' as $$
declare v_id uuid; v_qty int;
begin
  select id, qty into v_id, v_qty from public.inventory where user_id = p_user and item_id = p_item for update;
  if v_id is null then return false; end if;
  if v_qty > 1 then update public.inventory set qty = qty - 1 where id = v_id;
  else delete from public.inventory where id = v_id; end if;
  return true;
end;
$$;

-- Equipa / desequipa.
create or replace function public.toggle_equip(p_user uuid, p_inventory_id uuid) returns boolean
language plpgsql security definer set search_path = '' as $$
declare inv public.inventory;
begin
  select * into inv from public.inventory where id = p_inventory_id and user_id = p_user for update;
  if not found then raise exception 'not_owner'; end if;
  if inv.slot is null then raise exception 'not_equippable'; end if;

  if inv.equipped then
    update public.inventory set equipped = false where id = inv.id;
    return false;
  end if;
  update public.inventory set equipped = false where user_id = p_user and slot = inv.slot and equipped;
  update public.inventory set equipped = true where id = inv.id;
  return true;
end;
$$;

-- Distribui pontos de atributo.
create or replace function public.spend_attribute_points(
  p_user uuid, p_str int, p_dex int, p_con int, p_intel int, p_wis int, p_cha int
) returns void
language plpgsql security definer set search_path = '' as $$
declare
  c public.characters;
  v_total int := p_str + p_dex + p_con + p_intel + p_wis + p_cha;
begin
  if least(p_str, p_dex, p_con, p_intel, p_wis, p_cha) < 0 or v_total <= 0 then raise exception 'invalid_points'; end if;
  select * into c from public.characters where user_id = p_user for update;
  if c.attribute_points < v_total then raise exception 'not_enough_points'; end if;
  update public.characters set
    str = str + p_str, dex = dex + p_dex, con = con + p_con,
    intel = intel + p_intel, wis = wis + p_wis, cha = cha + p_cha,
    attribute_points = attribute_points - v_total, updated_at = now()
  where user_id = p_user;
end;
$$;

-- Inicia missão: gasta energia + cria a run com recompensa já sorteada.
create or replace function public.start_quest(
  p_user uuid, p_quest text, p_energy int, p_duration_sec int, p_rewards jsonb
) returns uuid
language plpgsql security definer set search_path = '' as $$
declare v_id uuid;
begin
  if exists (select 1 from public.quest_runs where user_id = p_user and status = 'running') then
    raise exception 'quest_already_running';
  end if;
  if exists (select 1 from public.battles where user_id = p_user and status = 'active') then
    raise exception 'in_battle';
  end if;
  perform public.spend_energy(p_user, p_energy);
  insert into public.quest_runs (user_id, quest_id, ends_at, rewards)
    values (p_user, p_quest, now() + make_interval(secs => p_duration_sec), p_rewards)
    returning id into v_id;
  return v_id;
end;
$$;

-- Resgata missão concluída (só depois de ends_at, pelo relógio do banco).
create or replace function public.claim_quest(p_user uuid) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  r public.quest_runs;
  v_ups int;
begin
  select * into r from public.quest_runs where user_id = p_user and status = 'running' for update;
  if not found then raise exception 'no_quest'; end if;
  if now() < r.ends_at then raise exception 'quest_not_finished'; end if;

  update public.quest_runs set status = 'claimed' where id = r.id;
  v_ups := public.grant_rewards(
    p_user, (r.rewards->>'xp')::int, (r.rewards->>'gold')::int, r.rewards->>'item', 'quest:' || r.quest_id, 'quest:' || r.id
  );
  return r.rewards || jsonb_build_object('levelUps', v_ups);
end;
$$;

-- Atualiza ranking PVP dos dois lados.
create or replace function public.apply_pvp_result(p_winner uuid, p_loser uuid, p_delta int) returns void
language plpgsql security definer set search_path = '' as $$
begin
  -- Ordem fixa de lock evita deadlock entre duas lutas cruzadas.
  perform 1 from public.characters where user_id in (p_winner, p_loser) order by user_id for update;
  update public.characters set pvp_rating = pvp_rating + p_delta, pvp_wins = pvp_wins + 1 where user_id = p_winner;
  update public.characters set pvp_rating = greatest(0, pvp_rating - p_delta), pvp_losses = pvp_losses + 1 where user_id = p_loser;
end;
$$;

-- Ranking público (apenas colunas seguras).
create or replace view public.ranking as
  select name, race, level, pvp_rating, pvp_wins, pvp_losses
  from public.characters order by pvp_rating desc, level desc;
revoke all on public.ranking from anon, authenticated;
grant select on public.ranking to service_role;

do $$
declare f text;
begin
  foreach f in array array[
    'spend_energy(uuid,int)', 'set_hp(uuid,int)', 'grant_rewards(uuid,int,int,text,text,text)',
    'give_item(uuid,text,int)', 'consume_item(uuid,text)', 'toggle_equip(uuid,uuid)',
    'spend_attribute_points(uuid,int,int,int,int,int,int)', 'start_quest(uuid,text,int,int,jsonb)',
    'claim_quest(uuid)', 'apply_pvp_result(uuid,uuid,int)'
  ] loop
    execute format('revoke execute on function public.%s from public, anon, authenticated', f);
    execute format('grant execute on function public.%s to service_role', f);
  end loop;
end $$;

-- Starter kit: espada + 3 poções para quem cria personagem a partir de agora.
create or replace function public.create_character(
  p_user uuid, p_name text, p_race text, p_region text, p_gender text,
  p_str int, p_dex int, p_con int, p_int int, p_wis int, p_cha int,
  p_hp int, p_energy int, p_starting_gold int
) returns uuid
language plpgsql security definer set search_path = '' as $$
declare v_id uuid;
begin
  insert into public.wallets (user_id) values (p_user) on conflict do nothing;
  insert into public.characters
    (user_id, name, race, region, gender, str, dex, con, intel, wis, cha, hp, energy)
  values
    (p_user, p_name, p_race, p_region, p_gender, p_str, p_dex, p_con, p_int, p_wis, p_cha, p_hp, p_energy)
  returning id into v_id;
  if p_starting_gold > 0 then
    perform public.wallet_apply(p_user, 'gold', p_starting_gold, 'starting_gold', 'start:' || p_user::text);
  end if;
  perform public.give_item(p_user, 'espada_curta', 1);
  perform public.give_item(p_user, 'pocao_vida', 3);
  return v_id;
end;
$$;
