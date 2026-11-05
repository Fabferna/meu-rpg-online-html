-- =====================================================================
-- Aethelgard Online — TODAS as migrações em um arquivo
-- Gerado por scripts/build-all-migrations.sh. Rode UMA vez num projeto Supabase NOVO.
-- =====================================================================

-- >>> 0001_init.sql
-- =====================================================================
-- Aethelgard Online — Fase 1: esquema base + segurança
-- =====================================================================
-- Princípio: o NAVEGADOR SÓ LÊ os próprios dados (RLS).
-- Toda escrita passa pelo backend (Next.js, com a chave service_role),
-- através de funções SQL atômicas. Nenhuma tabela aceita INSERT/UPDATE/
-- DELETE vindos das roles `anon` ou `authenticated`.
-- =====================================================================

create extension if not exists citext;

-- ---------------------------------------------------------------------
-- PROFILES (1:1 com auth.users)
-- ---------------------------------------------------------------------
create table public.profiles (
  id          uuid primary key references auth.users (id) on delete cascade,
  is_banned   boolean     not null default false,
  created_at  timestamptz not null default now()
);

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id) values (new.id) on conflict do nothing;
  insert into public.wallets (user_id) values (new.id) on conflict do nothing;
  return new;
end;
$$;

-- ---------------------------------------------------------------------
-- WALLETS — moeda grátis (gold) e premium (gems)
-- ---------------------------------------------------------------------
create table public.wallets (
  user_id     uuid primary key references auth.users (id) on delete cascade,
  gold        bigint      not null default 0 check (gold >= 0),
  gems        bigint      not null default 0 check (gems >= 0),
  updated_at  timestamptz not null default now()
);

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------------------------------------------------------------------
-- LEDGER — registro imutável de TODA movimentação de moeda
-- `ref` único garante idempotência (ex.: id do pagamento no Stripe).
-- ---------------------------------------------------------------------
create table public.ledger (
  id             bigint generated always as identity primary key,
  user_id        uuid        not null references auth.users (id) on delete cascade,
  currency       text        not null check (currency in ('gold', 'gems')),
  delta          bigint      not null check (delta <> 0),
  balance_after  bigint      not null check (balance_after >= 0),
  reason         text        not null,
  ref            text,
  created_at     timestamptz not null default now()
);
create index ledger_user_idx on public.ledger (user_id, created_at desc);
create unique index ledger_ref_uniq on public.ledger (ref) where ref is not null;

-- ---------------------------------------------------------------------
-- CHARACTERS — 1 personagem por conta (por enquanto)
-- energy: valor armazenado em `energy_updated_at`; a regeneração é
-- calculada pelo servidor a partir do tempo decorrido (anti-cheat).
-- ---------------------------------------------------------------------
create table public.characters (
  id                 uuid primary key default gen_random_uuid(),
  user_id            uuid        not null unique references auth.users (id) on delete cascade,
  name               citext      not null unique
                       check (char_length(name) between 3 and 16 and name ~ '^[A-Za-zÀ-ÿ0-9_]+$'),
  race               text        not null check (race in ('humano','elfo','anao','gronar','aetheliano')),
  region             text        not null check (region in ('sylvandell','agulhas_congeladas','deserto_ambar')),
  gender             text        not null check (gender in ('male','female')),
  level              int         not null default 1 check (level between 1 and 200),
  xp                 bigint      not null default 0 check (xp >= 0),
  attribute_points   int         not null default 0 check (attribute_points >= 0),
  str                smallint    not null check (str > 0),
  dex                smallint    not null check (dex > 0),
  con                smallint    not null check (con > 0),
  intel              smallint    not null check (intel > 0),
  wis                smallint    not null check (wis > 0),
  cha                smallint    not null check (cha > 0),
  hp                 int         not null check (hp >= 0),
  energy             int         not null check (energy >= 0),
  energy_updated_at  timestamptz not null default now(),
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now()
);

-- ---------------------------------------------------------------------
-- ITEMS (catálogo) + INVENTORY
-- ---------------------------------------------------------------------
create table public.items (
  id        text primary key,
  name      text   not null,
  kind      text   not null check (kind in ('weapon','armor','accessory','consumable','cosmetic')),
  rarity    text   not null default 'common' check (rarity in ('common','rare','epic','legendary')),
  data      jsonb  not null default '{}'::jsonb
);

create table public.inventory (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid        not null references auth.users (id) on delete cascade,
  item_id      text        not null references public.items (id),
  qty          int         not null default 1 check (qty > 0),
  equipped     boolean     not null default false,
  acquired_at  timestamptz not null default now()
);
create index inventory_user_idx on public.inventory (user_id);

-- ---------------------------------------------------------------------
-- QUEST RUNS — missões com timer validado no servidor
-- ---------------------------------------------------------------------
create table public.quest_runs (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid        not null references auth.users (id) on delete cascade,
  quest_id    text        not null,
  started_at  timestamptz not null default now(),
  ends_at     timestamptz not null,
  status      text        not null default 'running' check (status in ('running','claimed','cancelled')),
  rewards     jsonb       not null default '{}'::jsonb
);
-- No máximo UMA missão ativa por jogador.
create unique index quest_runs_one_active on public.quest_runs (user_id) where status = 'running';

-- =====================================================================
-- RLS: leitura apenas dos próprios dados; nenhuma escrita pelo cliente
-- =====================================================================
alter table public.profiles   enable row level security;
alter table public.wallets    enable row level security;
alter table public.ledger     enable row level security;
alter table public.characters enable row level security;
alter table public.items      enable row level security;
alter table public.inventory  enable row level security;
alter table public.quest_runs enable row level security;

create policy "own profile"    on public.profiles   for select to authenticated using (id = auth.uid());
create policy "own wallet"     on public.wallets    for select to authenticated using (user_id = auth.uid());
create policy "own ledger"     on public.ledger     for select to authenticated using (user_id = auth.uid());
create policy "own character"  on public.characters for select to authenticated using (user_id = auth.uid());
create policy "item catalog"   on public.items      for select to authenticated using (true);
create policy "own inventory"  on public.inventory  for select to authenticated using (user_id = auth.uid());
create policy "own quests"     on public.quest_runs for select to authenticated using (user_id = auth.uid());

-- Defesa em profundidade: mesmo que alguém crie uma policy errada no
-- futuro, as roles do cliente não têm privilégio de escrita.
revoke insert, update, delete, truncate on all tables in schema public from anon, authenticated;
revoke all on all tables in schema public from anon;
grant select on all tables in schema public to authenticated;
alter default privileges in schema public revoke insert, update, delete, truncate on tables from anon, authenticated;

-- =====================================================================
-- FUNÇÕES ATÔMICAS (somente service_role = backend)
-- =====================================================================

-- Aplica um crédito/débito com lock de linha, valida saldo e grava ledger.
create or replace function public.wallet_apply(
  p_user uuid, p_currency text, p_delta bigint, p_reason text, p_ref text default null
) returns bigint
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_balance bigint;
begin
  if p_currency not in ('gold', 'gems') then
    raise exception 'invalid currency';
  end if;
  if p_delta = 0 then
    raise exception 'zero delta';
  end if;

  -- Idempotência: mesma ref => não aplica duas vezes.
  if p_ref is not null and exists (select 1 from public.ledger where ref = p_ref) then
    select case when p_currency = 'gold' then gold else gems end into v_balance
      from public.wallets where user_id = p_user;
    return v_balance;
  end if;

  if p_currency = 'gold' then
    update public.wallets set gold = gold + p_delta, updated_at = now()
      where user_id = p_user returning gold into v_balance;
  else
    update public.wallets set gems = gems + p_delta, updated_at = now()
      where user_id = p_user returning gems into v_balance;
  end if;

  if v_balance is null then
    raise exception 'wallet not found';
  end if;
  -- (o CHECK >= 0 da tabela já aborta saldo negativo)

  insert into public.ledger (user_id, currency, delta, balance_after, reason, ref)
    values (p_user, p_currency, p_delta, v_balance, p_reason, p_ref);

  return v_balance;
end;
$$;

-- Cria o personagem + ouro inicial numa única transação.
-- Atributos/HP/energia são calculados no backend (src/lib/game/rules.ts).
create or replace function public.create_character(
  p_user uuid, p_name text, p_race text, p_region text, p_gender text,
  p_str int, p_dex int, p_con int, p_int int, p_wis int, p_cha int,
  p_hp int, p_energy int, p_starting_gold int
) returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_id uuid;
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

  return v_id;
end;
$$;

revoke execute on function public.wallet_apply(uuid, text, bigint, text, text) from public, anon, authenticated;
revoke execute on function public.create_character(uuid, text, text, text, text, int, int, int, int, int, int, int, int, int) from public, anon, authenticated;
revoke execute on function public.handle_new_user() from public, anon, authenticated;
grant execute on function public.wallet_apply(uuid, text, bigint, text, text) to service_role;
grant execute on function public.create_character(uuid, text, text, text, text, int, int, int, int, int, int, int, int, int) to service_role;

-- >>> 0002_core_loop.sql
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
  ('espada_curta',      'Espada Curta Funcional',      'weapon',    'common',    '{"slot":"weapon","atk":4,"image":"/assets/espada_curta_funcional.webp","price":120}'),
  ('arco_elfico',       'Arco Élfico Elegante',        'weapon',    'rare',      '{"slot":"weapon","atk":7,"dex":2,"image":"/assets/arco_elfico_elegante.webp","price":420}'),
  ('cajado_luminoso',   'Cajado Mágico Luminoso',      'weapon',    'rare',      '{"slot":"weapon","atk":3,"intel":4,"image":"/assets/cajado_magico_luminoso.webp","price":420}'),
  ('peitoral_anao',     'Peitoral de Placas Anão',     'armor',     'epic',      '{"slot":"armor","def":8,"con":2,"image":"/assets/peitoral_de_placas_anao.webp","price":900}'),
  ('amuleto_serpente',  'Amuleto da Serpente Sinistra','accessory', 'legendary', '{"slot":"accessory","atk":4,"def":3,"intel":3,"image":"/assets/amuleto_da_serpente_sinistra.webp","price":2500}'),
  ('pocao_vida',        'Poção de Vida',               'consumable','common',    '{"heal":60,"image":"/assets/loader.webp","price":25}')
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

-- >>> 0003_economy.sql
-- =====================================================================
-- Aethelgard Online — Fase 3: economia, loja e pagamentos
-- =====================================================================
-- Gemas (premium) SÓ entram na carteira por:
--   1) fulfill_payment()  — chamado pelo webhook assinado do gateway
--   2) recompensas do jogo (login diário)
-- Nunca por pedido do navegador.
-- =====================================================================

-- ---------------------------------------------------------------------
-- Cosméticos
-- ---------------------------------------------------------------------
alter table public.characters
  add column equipped_frame text,
  add column equipped_title text,
  add column equipped_skin  text,
  add column xp_boost_until timestamptz;

create table public.owned_cosmetics (
  user_id      uuid not null references auth.users (id) on delete cascade,
  cosmetic_id  text not null,
  acquired_at  timestamptz not null default now(),
  primary key (user_id, cosmetic_id)
);

-- ---------------------------------------------------------------------
-- Contadores por jogador (recargas do dia, ofertas diárias, login)
-- ---------------------------------------------------------------------
create table public.user_counters (
  user_id  uuid not null references auth.users (id) on delete cascade,
  key      text not null,
  day      date not null default (now() at time zone 'utc')::date,
  value    int  not null default 0,
  primary key (user_id, key, day)
);

-- ---------------------------------------------------------------------
-- Ofertas de estoque limitado GLOBAL (escassez real, compartilhada)
-- ---------------------------------------------------------------------
create table public.limited_offers (
  id            text primary key,
  cosmetic_id   text,
  item_id       text references public.items (id),
  item_qty      int  not null default 1,
  price_gems    int  not null check (price_gems > 0),
  stock_total   int  not null check (stock_total > 0),
  sold          int  not null default 0,
  per_user      int  not null default 1,
  starts_at     timestamptz not null default now(),
  ends_at       timestamptz not null,
  check (sold <= stock_total),
  check ((cosmetic_id is null) <> (item_id is null))
);

create table public.offer_purchases (
  user_id    uuid not null references auth.users (id) on delete cascade,
  offer_id   text not null references public.limited_offers (id),
  bought_at  timestamptz not null default now()
);
create index offer_purchases_idx on public.offer_purchases (user_id, offer_id);

-- ---------------------------------------------------------------------
-- Pagamentos com dinheiro real
-- ---------------------------------------------------------------------
create table public.payments (
  id                   uuid primary key default gen_random_uuid(),
  user_id              uuid        not null references auth.users (id) on delete cascade,
  provider             text        not null check (provider in ('stripe', 'mercadopago', 'dev')),
  product_id           text        not null,
  currency             text        not null check (currency in ('BRL', 'USD')),
  amount_cents         int         not null check (amount_cents > 0),
  gems                 int         not null check (gems >= 0),
  status               text        not null default 'pending' check (status in ('pending', 'paid', 'refunded', 'failed')),
  checkout_ref         text unique,           -- id da sessão/preferência
  provider_payment_id  text unique,           -- id do pagamento confirmado
  bonus_gems           int         not null default 0,
  created_at           timestamptz not null default now(),
  paid_at              timestamptz,
  refunded_at          timestamptz
);
create index payments_user_idx on public.payments (user_id, created_at desc);

-- RLS
alter table public.owned_cosmetics  enable row level security;
alter table public.user_counters    enable row level security;
alter table public.limited_offers   enable row level security;
alter table public.offer_purchases  enable row level security;
alter table public.payments         enable row level security;

create policy "own cosmetics"   on public.owned_cosmetics for select to authenticated using (user_id = auth.uid());
create policy "own counters"    on public.user_counters   for select to authenticated using (user_id = auth.uid());
create policy "offers public"   on public.limited_offers  for select to authenticated using (true);
create policy "own offer buys"  on public.offer_purchases for select to authenticated using (user_id = auth.uid());
create policy "own payments"    on public.payments        for select to authenticated using (user_id = auth.uid());

revoke insert, update, delete, truncate on public.owned_cosmetics, public.user_counters, public.limited_offers,
  public.offer_purchases, public.payments from anon, authenticated;
revoke all on public.owned_cosmetics, public.user_counters, public.limited_offers, public.offer_purchases, public.payments from anon;
grant select on public.owned_cosmetics, public.user_counters, public.limited_offers, public.offer_purchases, public.payments to authenticated;

-- =====================================================================
-- FUNÇÕES
-- =====================================================================

-- Débito com mensagem amigável quando falta saldo.
create or replace function public.charge(p_user uuid, p_currency text, p_cost int, p_reason text, p_ref text default null)
returns bigint
language plpgsql security definer set search_path = '' as $$
begin
  if p_cost <= 0 then raise exception 'invalid_cost'; end if;
  return public.wallet_apply(p_user, p_currency, -p_cost, p_reason, p_ref);
exception when check_violation then
  raise exception 'insufficient_funds';
end;
$$;

-- Incrementa contador diário e retorna o valor ANTES do incremento.
create or replace function public.bump_counter(p_user uuid, p_key text) returns int
language plpgsql security definer set search_path = '' as $$
declare v int;
begin
  insert into public.user_counters (user_id, key, value) values (p_user, p_key, 1)
    on conflict (user_id, key, day) do update set value = public.user_counters.value + 1
    returning value - 1 into v;
  return v;
end;
$$;

-- Recarga de energia: preço sobe a cada uso no mesmo dia (10, 20, 30... máx 50).
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
  if public.f_regen(c.energy, c.energy_updated_at, v_max, 180) >= v_max then raise exception 'energy_full'; end if;

  v_used := public.bump_counter(p_user, 'energy_refill');
  v_price := least(50, 10 * (v_used + 1));
  perform public.charge(p_user, 'gems', v_price, 'energy_refill');

  update public.characters set energy = v_max, energy_updated_at = now(), updated_at = now() where user_id = p_user;
  return jsonb_build_object('price', v_price, 'energy', v_max);
end;
$$;

-- Terminar missão agora: 1 gema a cada 5 min restantes (mín. 1).
create or replace function public.rush_quest(p_user uuid) returns int
language plpgsql security definer set search_path = '' as $$
declare r public.quest_runs; v_price int;
begin
  select * into r from public.quest_runs where user_id = p_user and status = 'running' for update;
  if not found then raise exception 'no_quest'; end if;
  if r.ends_at <= now() then raise exception 'quest_already_done'; end if;
  v_price := greatest(1, ceil(extract(epoch from (r.ends_at - now())) / 300.0)::int);
  perform public.charge(p_user, 'gems', v_price, 'quest_rush', 'rush:' || r.id);
  update public.quest_runs set ends_at = now() where id = r.id;
  return v_price;
end;
$$;

-- Compra de cosmético do catálogo (preço vem do catálogo do servidor).
create or replace function public.buy_cosmetic(p_user uuid, p_cosmetic text, p_currency text, p_price int) returns void
language plpgsql security definer set search_path = '' as $$
begin
  if exists (select 1 from public.owned_cosmetics where user_id = p_user and cosmetic_id = p_cosmetic) then
    raise exception 'already_owned';
  end if;
  perform public.charge(p_user, p_currency, p_price, 'cosmetic:' || p_cosmetic);
  insert into public.owned_cosmetics (user_id, cosmetic_id) values (p_user, p_cosmetic);
end;
$$;

create or replace function public.equip_cosmetic(p_user uuid, p_kind text, p_cosmetic text) returns void
language plpgsql security definer set search_path = '' as $$
begin
  if p_cosmetic is not null and not exists (
    select 1 from public.owned_cosmetics where user_id = p_user and cosmetic_id = p_cosmetic
  ) then raise exception 'not_owner'; end if;
  if p_kind = 'frame' then update public.characters set equipped_frame = p_cosmetic where user_id = p_user;
  elsif p_kind = 'title' then update public.characters set equipped_title = p_cosmetic where user_id = p_user;
  elsif p_kind = 'skin' then update public.characters set equipped_skin = p_cosmetic where user_id = p_user;
  else raise exception 'invalid_kind'; end if;
end;
$$;

-- Itens / conveniência com limite diário por jogador.
create or replace function public.buy_daily(
  p_user uuid, p_key text, p_limit int, p_currency text, p_price int, p_item text, p_qty int, p_boost_minutes int
) returns void
language plpgsql security definer set search_path = '' as $$
begin
  if public.bump_counter(p_user, 'deal:' || p_key) >= p_limit then raise exception 'daily_limit'; end if;
  perform public.charge(p_user, p_currency, p_price, 'shop:' || p_key);
  if p_item is not null then perform public.give_item(p_user, p_item, p_qty); end if;
  if p_boost_minutes > 0 then
    update public.characters
      set xp_boost_until = greatest(coalesce(xp_boost_until, now()), now()) + make_interval(mins => p_boost_minutes)
      where user_id = p_user;
  end if;
end;
$$;

-- Oferta de estoque limitado: trava a linha da oferta (sem overselling).
create or replace function public.buy_limited_offer(p_user uuid, p_offer text) returns void
language plpgsql security definer set search_path = '' as $$
declare o public.limited_offers; v_mine int;
begin
  select * into o from public.limited_offers where id = p_offer for update;
  if not found then raise exception 'unknown_offer'; end if;
  if now() < o.starts_at or now() > o.ends_at then raise exception 'offer_expired'; end if;
  if o.sold >= o.stock_total then raise exception 'sold_out'; end if;
  select count(*) into v_mine from public.offer_purchases where user_id = p_user and offer_id = p_offer;
  if v_mine >= o.per_user then raise exception 'daily_limit'; end if;
  if o.cosmetic_id is not null and exists (select 1 from public.owned_cosmetics where user_id = p_user and cosmetic_id = o.cosmetic_id) then
    raise exception 'already_owned';
  end if;

  perform public.charge(p_user, 'gems', o.price_gems, 'offer:' || o.id);
  update public.limited_offers set sold = sold + 1 where id = o.id;
  insert into public.offer_purchases (user_id, offer_id) values (p_user, o.id);
  if o.cosmetic_id is not null then
    insert into public.owned_cosmetics (user_id, cosmetic_id) values (p_user, o.cosmetic_id);
  else
    perform public.give_item(p_user, o.item_id, o.item_qty);
  end if;
end;
$$;

-- Login diário em sequência (ciclo de 7 dias).
create or replace function public.claim_daily_login(p_user uuid) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  v_today date := (now() at time zone 'utc')::date;
  v_yesterday_streak int;
  v_streak int;
  v_day int;
  v_gold int;
  v_gems int;
begin
  if exists (select 1 from public.user_counters where user_id = p_user and key = 'login' and day = v_today) then
    raise exception 'already_claimed';
  end if;
  select value into v_yesterday_streak from public.user_counters where user_id = p_user and key = 'login' and day = v_today - 1;
  v_streak := coalesce(v_yesterday_streak, 0) + 1;
  insert into public.user_counters (user_id, key, day, value) values (p_user, 'login', v_today, v_streak);

  v_day := ((v_streak - 1) % 7) + 1;
  v_gold := (array[50, 75, 100, 125, 150, 200, 300])[v_day];
  v_gems := case v_day when 3 then 2 when 5 then 3 when 7 then 10 else 0 end;

  perform public.wallet_apply(p_user, 'gold', v_gold, 'daily_login', 'login:' || p_user || ':' || v_today);
  if v_gems > 0 then
    perform public.wallet_apply(p_user, 'gems', v_gems, 'daily_login', 'login-gems:' || p_user || ':' || v_today);
  end if;
  if v_day = 4 then perform public.give_item(p_user, 'pocao_vida', 2); end if;

  return jsonb_build_object('streak', v_streak, 'day', v_day, 'gold', v_gold, 'gems', v_gems);
end;
$$;

-- Confirmação de pagamento (chamada SÓ pelo webhook verificado).
-- Idempotente: o mesmo webhook pode chegar várias vezes.
create or replace function public.fulfill_payment(
  p_payment uuid, p_provider_payment_id text, p_amount_cents int, p_currency text
) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  p public.payments;
  v_bonus int := 0;
  v_first boolean;
begin
  select * into p from public.payments where id = p_payment for update;
  if not found then raise exception 'unknown_payment'; end if;
  if p.status = 'paid' then return jsonb_build_object('already', true); end if;
  if p.status <> 'pending' then raise exception 'payment_not_pending'; end if;

  -- O valor pago TEM que bater com o que foi cobrado.
  if p_amount_cents <> p.amount_cents or upper(p_currency) <> p.currency then
    raise exception 'amount_mismatch';
  end if;

  -- Bônus de primeira compra: dobra as gemas (não vale para o pacote inicial).
  select not exists (select 1 from public.payments where user_id = p.user_id and status in ('paid', 'refunded')) into v_first;
  if v_first and p.product_id <> 'starter' then v_bonus := p.gems; end if;

  update public.payments
    set status = 'paid', provider_payment_id = p_provider_payment_id, paid_at = now(), bonus_gems = v_bonus
    where id = p.id;

  perform public.wallet_apply(p.user_id, 'gems', p.gems + v_bonus, 'purchase:' || p.product_id, 'pay:' || p.id);

  if p.product_id = 'starter' then
    perform public.give_item(p.user_id, 'peitoral_anao', 1);
    perform public.give_item(p.user_id, 'pocao_vida', 5);
    insert into public.owned_cosmetics (user_id, cosmetic_id) values (p.user_id, 'title_pioneiro') on conflict do nothing;
  end if;

  return jsonb_build_object('gems', p.gems + v_bonus, 'bonus', v_bonus);
end;
$$;

-- Estorno/chargeback: remove as gemas (até o saldo disponível).
create or replace function public.refund_payment(p_provider_payment_id text) returns void
language plpgsql security definer set search_path = '' as $$
declare p public.payments; v_bal bigint; v_take bigint;
begin
  select * into p from public.payments where provider_payment_id = p_provider_payment_id for update;
  if not found or p.status <> 'paid' then return; end if;
  update public.payments set status = 'refunded', refunded_at = now() where id = p.id;
  select gems into v_bal from public.wallets where user_id = p.user_id for update;
  v_take := least(v_bal, p.gems + p.bonus_gems);
  if v_take > 0 then
    perform public.wallet_apply(p.user_id, 'gems', -v_take, 'refund', 'refund:' || p.id);
  end if;
  -- Gastou as gemas e pediu estorno? Marca a conta para revisão.
  if v_take < p.gems + p.bonus_gems then
    update public.profiles set is_banned = true where id = p.user_id;
  end if;
end;
$$;

-- Bônus de XP (poção de sabedoria) aplicado nas recompensas.
create or replace function public.grant_rewards(
  p_user uuid, p_xp int, p_gold int, p_item text, p_reason text, p_ref text
) returns int
language plpgsql security definer set search_path = '' as $$
declare
  c public.characters;
  v_xp bigint;
  v_level int;
  v_ups int := 0;
  v_gain int := p_xp;
begin
  if p_xp < 0 or p_gold < 0 then raise exception 'negative_reward'; end if;
  select * into c from public.characters where user_id = p_user for update;
  if c.xp_boost_until is not null and c.xp_boost_until > now() then v_gain := round(p_xp * 1.5); end if;

  v_xp := c.xp + v_gain;
  v_level := c.level;
  while v_level < 200 and v_xp >= public.f_xp_next(v_level) loop
    v_xp := v_xp - public.f_xp_next(v_level);
    v_level := v_level + 1;
    v_ups := v_ups + 1;
  end loop;

  update public.characters set
    xp = v_xp, level = v_level,
    attribute_points = attribute_points + v_ups * 3,
    hp = case when v_ups > 0 then public.f_max_hp(c.con, v_level) else hp end,
    hp_updated_at = case when v_ups > 0 then now() else hp_updated_at end,
    updated_at = now()
  where user_id = p_user;

  if p_gold > 0 then perform public.wallet_apply(p_user, 'gold', p_gold, p_reason, p_ref); end if;
  if p_item is not null then perform public.give_item(p_user, p_item, 1); end if;
  return v_ups;
end;
$$;

-- Ranking agora mostra título e moldura.
drop view if exists public.ranking;
create view public.ranking as
  select name, race, gender, level, pvp_rating, pvp_wins, pvp_losses, equipped_title, equipped_frame, equipped_skin
  from public.characters order by pvp_rating desc, level desc;
revoke all on public.ranking from anon, authenticated;
grant select on public.ranking to service_role;

-- Ofertas limitadas iniciais (edite/rotacione pelo SQL Editor).
insert into public.limited_offers (id, cosmetic_id, price_gems, stock_total, per_user, ends_at) values
  ('lancamento_moldura_dragao', 'frame_dragao', 400, 500, 1, now() + interval '14 days'),
  ('lancamento_skin_vorlag',    'skin_vorlag',  900, 200, 1, now() + interval '14 days')
on conflict (id) do nothing;

do $$
declare f text;
begin
  foreach f in array array[
    'charge(uuid,text,int,text,text)', 'bump_counter(uuid,text)', 'refill_energy(uuid)', 'rush_quest(uuid)',
    'buy_cosmetic(uuid,text,text,int)', 'equip_cosmetic(uuid,text,text)',
    'buy_daily(uuid,text,int,text,int,text,int,int)', 'buy_limited_offer(uuid,text)', 'claim_daily_login(uuid)',
    'fulfill_payment(uuid,text,int,text)', 'refund_payment(text)', 'grant_rewards(uuid,int,int,text,text,text)'
  ] loop
    execute format('revoke execute on function public.%s from public, anon, authenticated', f);
    execute format('grant execute on function public.%s to service_role', f);
  end loop;
end $$;

-- Ícone novo da poção (gerado no Canva).
update public.items set data = jsonb_set(data, '{image}', '"/assets/shop/potion_hp.webp"') where id = 'pocao_vida';

-- >>> 0004_progression.sql
-- =====================================================================
-- Aethelgard Online — Missões diárias, conquistas e ferreiro
-- =====================================================================

alter table public.characters
  add column quests_done  int not null default 0,
  add column bosses_slain int not null default 0;

-- Recompensas já resgatadas (diárias e conquistas). A PK garante
-- que cada recompensa só pode ser resgatada uma vez.
create table public.reward_claims (
  user_id     uuid not null references auth.users (id) on delete cascade,
  claim_key   text not null,          -- ex.: 'daily:2026-11-05:quests'  /  'ach:level_10'
  claimed_at  timestamptz not null default now(),
  primary key (user_id, claim_key)
);
alter table public.reward_claims enable row level security;
create policy "own claims" on public.reward_claims for select to authenticated using (user_id = auth.uid());
revoke insert, update, delete, truncate on public.reward_claims from anon, authenticated;
revoke all on public.reward_claims from anon;
grant select on public.reward_claims to authenticated;

-- Soma N num contador diário (eventos: missões, vitórias, energia gasta…).
create or replace function public.add_counter(p_user uuid, p_key text, p_amount int) returns void
language plpgsql security definer set search_path = '' as $$
begin
  insert into public.user_counters (user_id, key, value) values (p_user, p_key, p_amount)
    on conflict (user_id, key, day) do update set value = public.user_counters.value + p_amount;
end;
$$;

-- Registra eventos de jogo (estatística vitalícia + contador do dia).
create or replace function public.record_event(p_user uuid, p_event text, p_amount int default 1) returns void
language plpgsql security definer set search_path = '' as $$
begin
  perform public.add_counter(p_user, 'ev:' || p_event, p_amount);
  if p_event = 'pve_win' then
    update public.characters set pve_wins = pve_wins + 1 where user_id = p_user;
  elsif p_event = 'boss_win' then
    update public.characters set bosses_slain = bosses_slain + 1 where user_id = p_user;
  elsif p_event = 'quest' then
    update public.characters set quests_done = quests_done + 1 where user_id = p_user;
  end if;
end;
$$;

-- Resgate único. O backend já validou a condição (meta atingida);
-- a PK de reward_claims impede resgate duplo mesmo com cliques simultâneos.
create or replace function public.claim_reward(
  p_user uuid, p_key text, p_gold int, p_gems int, p_xp int, p_cosmetic text
) returns int
language plpgsql security definer set search_path = '' as $$
declare v_ups int := 0;
begin
  begin
    insert into public.reward_claims (user_id, claim_key) values (p_user, p_key);
  exception when unique_violation then
    raise exception 'already_claimed';
  end;
  if p_gems > 0 then perform public.wallet_apply(p_user, 'gems', p_gems, 'reward:' || p_key, 'reward-gems:' || p_user || ':' || p_key); end if;
  if p_xp > 0 or p_gold > 0 then
    v_ups := public.grant_rewards(p_user, p_xp, p_gold, null, 'reward:' || p_key, 'reward-gold:' || p_user || ':' || p_key);
  end if;
  if p_cosmetic is not null then
    insert into public.owned_cosmetics (user_id, cosmetic_id) values (p_user, p_cosmetic) on conflict do nothing;
  end if;
  return v_ups;
end;
$$;

-- Gasto de energia passa a contar para as diárias.
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
  update public.characters set
    energy = v_now_energy - p_amount,
    energy_updated_at = case
      when v_now_energy >= v_max then now()
      else c.energy_updated_at + make_interval(secs => (v_now_energy - c.energy) * 180)
    end,
    updated_at = now()
  where user_id = p_user;
  perform public.add_counter(p_user, 'ev:energy', p_amount);
  return v_now_energy - p_amount;
end;
$$;

-- Missão resgatada conta para diárias/conquistas.
create or replace function public.claim_quest(p_user uuid) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare r public.quest_runs; v_ups int;
begin
  select * into r from public.quest_runs where user_id = p_user and status = 'running' for update;
  if not found then raise exception 'no_quest'; end if;
  if now() < r.ends_at then raise exception 'quest_not_finished'; end if;
  update public.quest_runs set status = 'claimed' where id = r.id;
  v_ups := public.grant_rewards(
    p_user, (r.rewards->>'xp')::int, (r.rewards->>'gold')::int, r.rewards->>'item', 'quest:' || r.quest_id, 'quest:' || r.id
  );
  perform public.record_event(p_user, 'quest');
  return r.rewards || jsonb_build_object('levelUps', v_ups);
end;
$$;

-- ---------------------------------------------------------------------
-- Ferreiro: comprar e vender equipamentos por ouro
-- ---------------------------------------------------------------------
create or replace function public.buy_item(p_user uuid, p_item text, p_price int, p_qty int) returns void
language plpgsql security definer set search_path = '' as $$
begin
  perform public.charge(p_user, 'gold', p_price, 'smith:buy:' || p_item);
  perform public.give_item(p_user, p_item, p_qty);
end;
$$;

-- Vende 1 unidade (item não equipado). Preço de venda vem do backend.
create or replace function public.sell_item(p_user uuid, p_inventory_id uuid, p_price int) returns text
language plpgsql security definer set search_path = '' as $$
declare inv public.inventory;
begin
  if p_price <= 0 then raise exception 'invalid_cost'; end if;
  select * into inv from public.inventory where id = p_inventory_id and user_id = p_user for update;
  if not found then raise exception 'not_owner'; end if;
  if inv.equipped then raise exception 'item_equipped'; end if;
  if inv.qty > 1 then update public.inventory set qty = qty - 1 where id = inv.id;
  else delete from public.inventory where id = inv.id; end if;
  perform public.wallet_apply(p_user, 'gold', p_price, 'smith:sell:' || inv.item_id);
  return inv.item_id;
end;
$$;

-- Novos equipamentos (artes já existentes no projeto).
insert into public.items (id, name, kind, rarity, data) values
  ('estandarte_inspirador', 'Estandarte Inspirador', 'accessory', 'rare', '{"slot":"accessory","atk":2,"con":2,"image":"/assets/estandarte_inspirador.webp"}'),
  ('martelo_forja',         'Martelo da Forja Ancestral', 'weapon', 'epic', '{"slot":"weapon","atk":11,"str":2,"image":"/assets/icone_forja_ancestral.webp"}'),
  ('foco_arcano',           'Foco de Canalização Arcana', 'accessory', 'epic', '{"slot":"accessory","intel":6,"def":1,"image":"/assets/canalizacao_de_magia.webp"}')
on conflict (id) do update set name = excluded.name, kind = excluded.kind, rarity = excluded.rarity, data = excluded.data;

do $$
declare f text;
begin
  foreach f in array array[
    'add_counter(uuid,text,int)', 'record_event(uuid,text,int)', 'claim_reward(uuid,text,int,int,int,text)',
    'spend_energy(uuid,int)', 'claim_quest(uuid)', 'buy_item(uuid,text,int,int)', 'sell_item(uuid,uuid,int)'
  ] loop
    execute format('revoke execute on function public.%s from public, anon, authenticated', f);
    execute format('grant execute on function public.%s to service_role', f);
  end loop;
end $$;

-- >>> 0005_webp_images.sql
-- Imagens convertidas de PNG para WebP (97 MB -> 5 MB).
-- Atualiza caminhos gravados no banco (itens e estado de batalhas antigas).
update public.items set data = jsonb_set(data, '{image}', to_jsonb(replace(data->>'image', '.png', '.webp')))
  where data->>'image' like '%.png';
update public.battles set state = jsonb_set(state, '{enemy,image}', to_jsonb(replace(state#>>'{enemy,image}', '.png', '.webp')))
  where status = 'active' and state#>>'{enemy,image}' like '%.png';

-- >>> 0006_weekly_ranking.sql
-- =====================================================================
-- Ranking semanal (temporada de segunda 00:00 UTC a domingo 23:59 UTC)
-- =====================================================================
-- Pontuação calculada a partir dos contadores diários já gravados
-- pelas funções do jogo (sem tabela extra, sem cron):
--   vitória PVP = 10 · chefe derrotado = 8 · missão concluída = 4 · caçada vencida = 2
-- As recompensas são resgatadas pelo jogador na semana seguinte
-- (claim_reward com a chave 'week:AAAA-MM-DD', que só pode ser usada 1 vez).

create or replace function public.weekly_scores(p_start date)
returns table (user_id uuid, score bigint)
language sql stable security definer set search_path = '' as $$
  select c.user_id,
         sum(case c.key
               when 'ev:pvp_win'  then 10 * c.value
               when 'ev:boss_win' then 8 * c.value
               when 'ev:quest'    then 4 * c.value
               when 'ev:pve_win'  then 2 * c.value
               else 0 end)::bigint as score
  from public.user_counters c
  where c.day between p_start and p_start + 6
    and c.key in ('ev:pvp_win', 'ev:boss_win', 'ev:quest', 'ev:pve_win')
  group by c.user_id
  having sum(c.value) > 0;
$$;

create index if not exists user_counters_day_key_idx on public.user_counters (day, key);

-- Título exclusivo do campeão (concedido pelo resgate da recompensa).
revoke execute on function public.weekly_scores(date) from public, anon, authenticated;
grant execute on function public.weekly_scores(date) to service_role;

-- >>> 0007_daily_login_streak.sql
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

-- >>> 0008_referrals.sql
-- =====================================================================
-- Indique um amigo
-- =====================================================================
-- Convidado: ganha 🪙 300 ao criar o herói pelo link.
-- Quem convidou: 💎 20 por convidado que chegar ao nível 5 (máx. 10 pagos),
-- resgatado com claim_reward (chave 'ref:<id do convidado>', uso único).
-- Exigir nível 5 dificulta contas falsas criadas só para ganhar gemas.

alter table public.characters add column referred_by uuid references auth.users (id) on delete set null;
create index characters_referred_by_idx on public.characters (referred_by);

create or replace function public.apply_referral(p_user uuid, p_referrer_name text) returns boolean
language plpgsql security definer set search_path = '' as $$
declare v_ref uuid;
begin
  select user_id into v_ref from public.characters where lower(name::text) = lower(p_referrer_name);
  if v_ref is null or v_ref = p_user then return false; end if;
  update public.characters set referred_by = v_ref
    where user_id = p_user and referred_by is null
      and created_at > now() - interval '1 hour'; -- só logo após criar o herói
  if not found then return false; end if;
  perform public.wallet_apply(p_user, 'gold', 300, 'referral_welcome', 'ref-welcome:' || p_user);
  return true;
end;
$$;

revoke execute on function public.apply_referral(uuid, text) from public, anon, authenticated;
grant execute on function public.apply_referral(uuid, text) to service_role;

-- >>> 0009_guilds_chat.sql
-- =====================================================================
-- Guildas e chat
-- =====================================================================

-- ---------------------------------------------------------------------
-- GUILDAS
-- ---------------------------------------------------------------------
create table public.guilds (
  id            uuid primary key default gen_random_uuid(),
  name          citext      not null unique check (char_length(name) between 3 and 20 and name ~ '^[A-Za-zÀ-ÿ0-9 _]+$'),
  tag           text        not null unique check (tag ~ '^[A-Z0-9]{2,4}$'),
  description   text        not null default '' check (char_length(description) <= 200),
  level         int         not null default 1 check (level between 1 and 10),
  xp            bigint      not null default 0 check (xp >= 0),
  treasury      bigint      not null default 0 check (treasury >= 0),
  member_limit  int         not null default 20,
  created_at    timestamptz not null default now()
);

create table public.guild_members (
  user_id      uuid primary key references auth.users (id) on delete cascade,  -- 1 guilda por jogador
  guild_id     uuid        not null references public.guilds (id) on delete cascade,
  role         text        not null default 'member' check (role in ('leader', 'officer', 'member')),
  contributed  bigint      not null default 0,
  joined_at    timestamptz not null default now()
);
create index guild_members_guild_idx on public.guild_members (guild_id);
create unique index guild_one_leader on public.guild_members (guild_id) where role = 'leader';

alter table public.guilds        enable row level security;
alter table public.guild_members enable row level security;
-- Informação pública dentro do jogo (lista de guildas, membros).
create policy "guilds visible"  on public.guilds        for select to authenticated using (true);
create policy "members visible" on public.guild_members for select to authenticated using (true);
revoke insert, update, delete, truncate on public.guilds, public.guild_members from anon, authenticated;
revoke all on public.guilds, public.guild_members from anon;
grant select on public.guilds, public.guild_members to authenticated;

-- XP necessário para o próximo nível da guilda (espelho de guilds.ts).
create or replace function public.f_guild_xp_next(p_level int) returns bigint
language sql immutable as $$ select (1000 * p_level)::bigint $$;

-- Soma XP na guilda do jogador (se tiver) e sobe de nível.
create or replace function public.guild_add_xp(p_user uuid, p_xp int) returns void
language plpgsql security definer set search_path = '' as $$
declare g public.guilds;
begin
  select gu.* into g from public.guilds gu join public.guild_members m on m.guild_id = gu.id
    where m.user_id = p_user for update of gu;
  if not found or g.level >= 10 then return; end if;
  g.xp := g.xp + p_xp;
  while g.level < 10 and g.xp >= public.f_guild_xp_next(g.level) loop
    g.xp := g.xp - public.f_guild_xp_next(g.level);
    g.level := g.level + 1;
  end loop;
  if g.level >= 10 then g.xp := 0; end if;
  update public.guilds set xp = g.xp, level = g.level where id = g.id;
end;
$$;

create or replace function public.create_guild(p_user uuid, p_name text, p_tag text, p_description text) returns uuid
language plpgsql security definer set search_path = '' as $$
declare v_id uuid;
begin
  if exists (select 1 from public.guild_members where user_id = p_user) then raise exception 'already_in_guild'; end if;
  perform public.charge(p_user, 'gold', 1000, 'guild_create');
  begin
    insert into public.guilds (name, tag, description) values (p_name, upper(p_tag), coalesce(p_description, '')) returning id into v_id;
  exception when unique_violation then
    raise exception 'guild_name_taken';
  end;
  insert into public.guild_members (user_id, guild_id, role) values (p_user, v_id, 'leader');
  return v_id;
end;
$$;

create or replace function public.join_guild(p_user uuid, p_guild uuid) returns void
language plpgsql security definer set search_path = '' as $$
declare g public.guilds; v_count int;
begin
  if exists (select 1 from public.guild_members where user_id = p_user) then raise exception 'already_in_guild'; end if;
  select * into g from public.guilds where id = p_guild for update;
  if not found then raise exception 'unknown_guild'; end if;
  select count(*) into v_count from public.guild_members where guild_id = p_guild;
  if v_count >= g.member_limit then raise exception 'guild_full'; end if;
  insert into public.guild_members (user_id, guild_id) values (p_user, p_guild);
end;
$$;

-- Sair. Se for o líder, a liderança passa para o oficial (ou membro) mais antigo;
-- se não houver ninguém, a guilda é desfeita.
create or replace function public.leave_guild(p_user uuid) returns void
language plpgsql security definer set search_path = '' as $$
declare m public.guild_members; v_next uuid;
begin
  select * into m from public.guild_members where user_id = p_user for update;
  if not found then raise exception 'not_in_guild'; end if;
  perform 1 from public.guilds where id = m.guild_id for update;
  delete from public.guild_members where user_id = p_user;
  if m.role = 'leader' then
    select user_id into v_next from public.guild_members where guild_id = m.guild_id
      order by (role = 'officer') desc, joined_at limit 1;
    if v_next is null then
      delete from public.guilds where id = m.guild_id;
    else
      update public.guild_members set role = 'leader' where user_id = v_next;
    end if;
  end if;
end;
$$;

-- Líder: promove/rebaixa/transfere. Líder ou oficial: expulsa membros comuns.
create or replace function public.guild_manage(p_actor uuid, p_target uuid, p_action text) returns void
language plpgsql security definer set search_path = '' as $$
declare a public.guild_members; t public.guild_members;
begin
  if p_actor = p_target then raise exception 'invalid_target'; end if;
  select * into a from public.guild_members where user_id = p_actor;
  select * into t from public.guild_members where user_id = p_target for update;
  if a.guild_id is null or t.guild_id is null or a.guild_id <> t.guild_id then raise exception 'not_owner'; end if;

  if p_action = 'kick' then
    if not (a.role = 'leader' or (a.role = 'officer' and t.role = 'member')) then raise exception 'no_permission'; end if;
    delete from public.guild_members where user_id = p_target;
  elsif p_action in ('promote', 'demote', 'transfer') then
    if a.role <> 'leader' then raise exception 'no_permission'; end if;
    if p_action = 'promote' then update public.guild_members set role = 'officer' where user_id = p_target;
    elsif p_action = 'demote' then update public.guild_members set role = 'member' where user_id = p_target;
    else
      update public.guild_members set role = 'officer' where user_id = p_actor;
      update public.guild_members set role = 'leader' where user_id = p_target;
    end if;
  else
    raise exception 'invalid_action';
  end if;
end;
$$;

-- Doação de ouro ao cofre: 1 ouro = 1 XP de guilda.
create or replace function public.guild_donate(p_user uuid, p_amount int) returns void
language plpgsql security definer set search_path = '' as $$
declare v_guild uuid;
begin
  if p_amount < 10 then raise exception 'invalid_cost'; end if;
  select guild_id into v_guild from public.guild_members where user_id = p_user for update;
  if v_guild is null then raise exception 'not_in_guild'; end if;
  perform public.charge(p_user, 'gold', p_amount, 'guild_donate');
  update public.guilds set treasury = treasury + p_amount where id = v_guild;
  update public.guild_members set contributed = contributed + p_amount where user_id = p_user;
  perform public.guild_add_xp(p_user, p_amount);
end;
$$;

-- Atividade dos membros também dá XP à guilda.
create or replace function public.record_event(p_user uuid, p_event text, p_amount int default 1) returns void
language plpgsql security definer set search_path = '' as $$
begin
  perform public.add_counter(p_user, 'ev:' || p_event, p_amount);
  if p_event = 'pve_win' then
    update public.characters set pve_wins = pve_wins + 1 where user_id = p_user;
    perform public.guild_add_xp(p_user, 5);
  elsif p_event = 'boss_win' then
    update public.characters set bosses_slain = bosses_slain + 1 where user_id = p_user;
    perform public.guild_add_xp(p_user, 30);
  elsif p_event = 'quest' then
    update public.characters set quests_done = quests_done + 1 where user_id = p_user;
    perform public.guild_add_xp(p_user, 10);
  elsif p_event = 'pvp_win' then
    perform public.guild_add_xp(p_user, 15);
  end if;
end;
$$;

-- Bônus de XP: elixir (+50%) e guilda (+1% por nível da guilda).
create or replace function public.grant_rewards(
  p_user uuid, p_xp int, p_gold int, p_item text, p_reason text, p_ref text
) returns int
language plpgsql security definer set search_path = '' as $$
declare
  c public.characters;
  v_xp bigint; v_level int; v_ups int := 0;
  v_mult numeric := 1;
  v_glevel int;
begin
  if p_xp < 0 or p_gold < 0 then raise exception 'negative_reward'; end if;
  select * into c from public.characters where user_id = p_user for update;
  if c.xp_boost_until is not null and c.xp_boost_until > now() then v_mult := v_mult + 0.5; end if;
  select g.level into v_glevel from public.guilds g join public.guild_members m on m.guild_id = g.id where m.user_id = p_user;
  if v_glevel is not null then v_mult := v_mult + v_glevel * 0.01; end if;

  v_xp := c.xp + round(p_xp * v_mult);
  v_level := c.level;
  while v_level < 200 and v_xp >= public.f_xp_next(v_level) loop
    v_xp := v_xp - public.f_xp_next(v_level);
    v_level := v_level + 1;
    v_ups := v_ups + 1;
  end loop;

  update public.characters set
    xp = v_xp, level = v_level,
    attribute_points = attribute_points + v_ups * 3,
    hp = case when v_ups > 0 then public.f_max_hp(c.con, v_level) else hp end,
    hp_updated_at = case when v_ups > 0 then now() else hp_updated_at end,
    updated_at = now()
  where user_id = p_user;

  if p_gold > 0 then perform public.wallet_apply(p_user, 'gold', p_gold, p_reason, p_ref); end if;
  if p_item is not null then perform public.give_item(p_user, p_item, 1); end if;
  return v_ups;
end;
$$;

-- ---------------------------------------------------------------------
-- CHAT
-- ---------------------------------------------------------------------
create table public.chat_messages (
  id          bigint generated always as identity primary key,
  channel     text        not null check (channel = 'global' or channel like 'guild:%'),
  user_id     uuid        not null references auth.users (id) on delete cascade,
  name        text        not null,
  tag         text,
  title       text,
  frame       text,
  body        text        not null check (char_length(body) between 1 and 300),
  created_at  timestamptz not null default now()
);
create index chat_channel_idx on public.chat_messages (channel, id desc);

alter table public.chat_messages enable row level security;
-- Global: todos os jogadores logados. Guilda: só membros daquela guilda.
create policy "read chat" on public.chat_messages for select to authenticated using (
  channel = 'global'
  or channel = 'guild:' || (select m.guild_id::text from public.guild_members m where m.user_id = auth.uid())
);
revoke insert, update, delete, truncate on public.chat_messages from anon, authenticated;
revoke all on public.chat_messages from anon;
grant select on public.chat_messages to authenticated;

-- Envia mensagem (o backend já filtrou o texto e aplicou rate limit).
create or replace function public.post_chat(p_user uuid, p_channel text, p_body text) returns bigint
language plpgsql security definer set search_path = '' as $$
declare c public.characters; v_tag text; v_guild uuid; v_id bigint;
begin
  if exists (select 1 from public.profiles where id = p_user and is_banned) then raise exception 'no_permission'; end if;
  select * into c from public.characters where user_id = p_user;
  if not found then raise exception 'no_character'; end if;
  select m.guild_id, g.tag into v_guild, v_tag from public.guild_members m join public.guilds g on g.id = m.guild_id where m.user_id = p_user;
  if p_channel = 'guild' then
    if v_guild is null then raise exception 'not_in_guild'; end if;
    p_channel := 'guild:' || v_guild;
  elsif p_channel <> 'global' then
    raise exception 'invalid_action';
  end if;
  insert into public.chat_messages (channel, user_id, name, tag, title, frame, body)
    values (p_channel, p_user, c.name, v_tag, c.equipped_title, c.equipped_frame, p_body)
    returning id into v_id;
  -- Faxina ocasional: mantém só os últimos 3 dias.
  if random() < 0.02 then delete from public.chat_messages where created_at < now() - interval '3 days'; end if;
  return v_id;
end;
$$;

-- Tempo real (Supabase Realtime). Ignorado fora do Supabase.
do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    execute 'alter publication supabase_realtime add table public.chat_messages';
  end if;
end $$;

do $$
declare f text;
begin
  foreach f in array array[
    'guild_add_xp(uuid,int)', 'create_guild(uuid,text,text,text)', 'join_guild(uuid,uuid)', 'leave_guild(uuid)',
    'guild_manage(uuid,uuid,text)', 'guild_donate(uuid,int)', 'record_event(uuid,text,int)',
    'grant_rewards(uuid,int,int,text,text,text)', 'post_chat(uuid,text,text)'
  ] loop
    execute format('revoke execute on function public.%s from public, anon, authenticated', f);
    execute format('grant execute on function public.%s to service_role', f);
  end loop;
end $$;

-- >>> 0010_guild_boss_war_moderation.sql
-- =====================================================================
-- Chefe de guilda, guerra de guildas e moderação do chat
-- =====================================================================

-- ---------------------------------------------------------------------
-- CHEFE DE GUILDA (um por guilda por semana; vida compartilhada)
-- ---------------------------------------------------------------------
create table public.guild_bosses (
  guild_id     uuid        not null references public.guilds (id) on delete cascade,
  week         date        not null,
  boss_id      text        not null,
  hp           bigint      not null check (hp >= 0),
  max_hp       bigint      not null check (max_hp > 0),
  defeated_at  timestamptz,
  primary key (guild_id, week)
);

create table public.guild_boss_hits (
  guild_id  uuid   not null references public.guilds (id) on delete cascade,
  week      date   not null,
  user_id   uuid   not null references auth.users (id) on delete cascade,
  damage    bigint not null default 0,
  attacks   int    not null default 0,
  primary key (guild_id, week, user_id)
);

alter table public.guild_bosses    enable row level security;
alter table public.guild_boss_hits enable row level security;
create policy "boss visible" on public.guild_bosses    for select to authenticated using (true);
create policy "hits visible" on public.guild_boss_hits for select to authenticated using (true);
revoke insert, update, delete, truncate on public.guild_bosses, public.guild_boss_hits from anon, authenticated;
revoke all on public.guild_bosses, public.guild_boss_hits from anon;
grant select on public.guild_bosses, public.guild_boss_hits to authenticated;

-- Registra um ataque. O dano é calculado no backend (combat.ts).
-- p_max_hp/p_boss_id só são usados se o chefe da semana ainda não existir.
create or replace function public.guild_boss_attack(
  p_user uuid, p_week date, p_boss_id text, p_max_hp bigint, p_damage bigint, p_daily_limit int, p_energy int
) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare v_guild uuid; b public.guild_bosses; v_dealt bigint; v_used int;
begin
  select guild_id into v_guild from public.guild_members where user_id = p_user;
  if v_guild is null then raise exception 'not_in_guild'; end if;

  insert into public.guild_bosses (guild_id, week, boss_id, hp, max_hp)
    values (v_guild, p_week, p_boss_id, p_max_hp, p_max_hp) on conflict do nothing;
  select * into b from public.guild_bosses where guild_id = v_guild and week = p_week for update;
  if b.hp <= 0 then raise exception 'boss_defeated'; end if;

  if public.bump_counter(p_user, 'gboss') >= p_daily_limit then raise exception 'daily_limit'; end if;
  perform public.spend_energy(p_user, p_energy);

  v_dealt := least(b.hp, greatest(0, p_damage));
  update public.guild_bosses set hp = hp - v_dealt,
    defeated_at = case when hp - v_dealt <= 0 then now() else null end
    where guild_id = v_guild and week = p_week;
  insert into public.guild_boss_hits (guild_id, week, user_id, damage, attacks) values (v_guild, p_week, p_user, v_dealt, 1)
    on conflict (guild_id, week, user_id) do update set damage = public.guild_boss_hits.damage + v_dealt, attacks = public.guild_boss_hits.attacks + 1;

  perform public.guild_add_xp(p_user, 5);
  if b.hp - v_dealt <= 0 then
    perform public.guild_add_xp(p_user, 500); -- bônus para a guilda pela vitória
  end if;
  return jsonb_build_object('dealt', v_dealt, 'hp', b.hp - v_dealt, 'defeated', b.hp - v_dealt <= 0);
end;
$$;

-- ---------------------------------------------------------------------
-- GUERRA DE GUILDAS (pontuação semanal da guilda)
-- = soma dos pontos semanais dos membros atuais + 200 se derrotou o chefe
-- ---------------------------------------------------------------------
create or replace function public.guild_weekly_scores(p_start date)
returns table (guild_id uuid, score bigint)
language sql stable security definer set search_path = '' as $$
  with member_scores as (
    select m.guild_id, coalesce(sum(ws.score), 0) as s
    from public.guild_members m
    left join public.weekly_scores(p_start) ws on ws.user_id = m.user_id
    group by m.guild_id
  )
  select g.id,
         (coalesce(ms.s, 0) + case when gb.defeated_at is not null then 200 else 0 end)::bigint
  from public.guilds g
  left join member_scores ms on ms.guild_id = g.id
  left join public.guild_bosses gb on gb.guild_id = g.id and gb.week = p_start
  where coalesce(ms.s, 0) > 0 or gb.defeated_at is not null;
$$;

-- ---------------------------------------------------------------------
-- MODERAÇÃO
-- ---------------------------------------------------------------------
alter table public.profiles
  add column is_admin    boolean not null default false,
  add column muted_until timestamptz;

alter table public.chat_messages add column hidden boolean not null default false;

create table public.chat_reports (
  message_id  bigint      not null references public.chat_messages (id) on delete cascade,
  reporter    uuid        not null references auth.users (id) on delete cascade,
  reason      text        not null check (reason in ('ofensa', 'spam', 'golpe', 'outro')),
  created_at  timestamptz not null default now(),
  resolved    boolean     not null default false,
  primary key (message_id, reporter)
);
alter table public.chat_reports enable row level security;
revoke all on public.chat_reports from anon, authenticated;

-- Mensagens ocultas não aparecem para os outros (o autor ainda vê a própria).
drop policy "read chat" on public.chat_messages;
create policy "read chat" on public.chat_messages for select to authenticated using (
  (not hidden or user_id = auth.uid())
  and (channel = 'global'
       or channel = 'guild:' || (select m.guild_id::text from public.guild_members m where m.user_id = auth.uid()))
);

-- Denúncia: 3 denúncias de jogadores diferentes ocultam a mensagem automaticamente.
create or replace function public.report_message(p_user uuid, p_message bigint, p_reason text) returns boolean
language plpgsql security definer set search_path = '' as $$
declare v_author uuid; v_count int;
begin
  select user_id into v_author from public.chat_messages where id = p_message;
  if v_author is null then raise exception 'not_owner'; end if;
  if v_author = p_user then raise exception 'invalid_target'; end if;
  insert into public.chat_reports (message_id, reporter, reason) values (p_message, p_user, p_reason) on conflict do nothing;
  select count(*) into v_count from public.chat_reports where message_id = p_message;
  if v_count >= 3 then update public.chat_messages set hidden = true where id = p_message; end if;
  return v_count >= 3;
end;
$$;

-- Ações de administrador.
create or replace function public.admin_moderate(p_admin uuid, p_target uuid, p_action text, p_minutes int, p_message bigint)
returns void
language plpgsql security definer set search_path = '' as $$
begin
  if not exists (select 1 from public.profiles where id = p_admin and is_admin) then raise exception 'no_permission'; end if;
  if p_action = 'mute' then
    update public.profiles set muted_until = now() + make_interval(mins => greatest(1, p_minutes)) where id = p_target;
  elsif p_action = 'unmute' then
    update public.profiles set muted_until = null where id = p_target;
  elsif p_action = 'ban' then
    update public.profiles set is_banned = true where id = p_target;
    update public.chat_messages set hidden = true where user_id = p_target and created_at > now() - interval '3 days';
  elsif p_action = 'unban' then
    update public.profiles set is_banned = false where id = p_target;
  elsif p_action = 'hide' then
    update public.chat_messages set hidden = true where id = p_message;
  elsif p_action = 'restore' then
    update public.chat_messages set hidden = false where id = p_message;
  elsif p_action <> 'dismiss' then
    raise exception 'invalid_action';
  end if;
  if p_message is not null then update public.chat_reports set resolved = true where message_id = p_message; end if;
end;
$$;

-- post_chat passa a respeitar o silenciamento.
create or replace function public.post_chat(p_user uuid, p_channel text, p_body text) returns bigint
language plpgsql security definer set search_path = '' as $$
declare c public.characters; v_tag text; v_guild uuid; v_id bigint; p public.profiles;
begin
  select * into p from public.profiles where id = p_user;
  if p.is_banned then raise exception 'no_permission'; end if;
  if p.muted_until is not null and p.muted_until > now() then raise exception 'muted'; end if;
  select * into c from public.characters where user_id = p_user;
  if not found then raise exception 'no_character'; end if;
  select m.guild_id, g.tag into v_guild, v_tag from public.guild_members m join public.guilds g on g.id = m.guild_id where m.user_id = p_user;
  if p_channel = 'guild' then
    if v_guild is null then raise exception 'not_in_guild'; end if;
    p_channel := 'guild:' || v_guild;
  elsif p_channel <> 'global' then
    raise exception 'invalid_action';
  end if;
  insert into public.chat_messages (channel, user_id, name, tag, title, frame, body)
    values (p_channel, p_user, c.name, v_tag, c.equipped_title, c.equipped_frame, p_body)
    returning id into v_id;
  if random() < 0.02 then delete from public.chat_messages where created_at < now() - interval '3 days'; end if;
  return v_id;
end;
$$;

do $$
declare f text;
begin
  foreach f in array array[
    'guild_boss_attack(uuid,date,text,bigint,bigint,int,int)', 'guild_weekly_scores(date)',
    'report_message(uuid,bigint,text)', 'admin_moderate(uuid,uuid,text,int,bigint)', 'post_chat(uuid,text,text)'
  ] loop
    execute format('revoke execute on function public.%s from public, anon, authenticated', f);
    execute format('grant execute on function public.%s to service_role', f);
  end loop;
end $$;

-- Para tornar alguém administrador (rode no SQL Editor):
--   update public.profiles set is_admin = true
--   where id = (select user_id from public.characters where name = 'SeuHeroi');

-- >>> 0011_events_upgrades_stats.sql
-- =====================================================================
-- Eventos temporários, aprimoramento de equipamentos e estatísticas
-- =====================================================================

-- ---------------------------------------------------------------------
-- EVENTOS: multiplicadores de XP / ouro por período (ou todo fim de semana)
-- ---------------------------------------------------------------------
create table public.game_events (
  id                 text primary key,
  name               text        not null,
  description        text        not null default '',
  kind               text        not null check (kind in ('xp', 'gold')),
  multiplier         numeric     not null check (multiplier between 1 and 5),
  starts_at          timestamptz,
  ends_at            timestamptz,
  recurring_weekend  boolean     not null default false,  -- sábado e domingo (UTC), toda semana
  enabled            boolean     not null default true
);
alter table public.game_events enable row level security;
create policy "events visible" on public.game_events for select to authenticated using (true);
revoke insert, update, delete, truncate on public.game_events from anon, authenticated;
revoke all on public.game_events from anon;
grant select on public.game_events to authenticated;
-- Também visível na página inicial (sem login).
grant select on public.game_events to anon;
create policy "events public" on public.game_events for select to anon using (true);

create or replace function public.event_multiplier(p_kind text) returns numeric
language sql stable security definer set search_path = '' as $$
  select coalesce(max(multiplier), 1) from public.game_events
  where enabled and kind = p_kind and (
    (starts_at is not null and now() between starts_at and ends_at)
    or (recurring_weekend and extract(isodow from (now() at time zone 'utc')) in (6, 7))
  );
$$;

insert into public.game_events (id, name, description, kind, multiplier, recurring_weekend) values
  ('fim_de_semana_xp', 'Fim de Semana Heroico', 'XP em dobro todo sábado e domingo!', 'xp', 2, true)
on conflict (id) do nothing;

-- grant_rewards: elixir + guilda + eventos.
create or replace function public.grant_rewards(
  p_user uuid, p_xp int, p_gold int, p_item text, p_reason text, p_ref text
) returns int
language plpgsql security definer set search_path = '' as $$
declare
  c public.characters;
  v_xp bigint; v_level int; v_ups int := 0;
  v_mult numeric := 1; v_glevel int; v_gold int;
begin
  if p_xp < 0 or p_gold < 0 then raise exception 'negative_reward'; end if;
  select * into c from public.characters where user_id = p_user for update;
  if c.xp_boost_until is not null and c.xp_boost_until > now() then v_mult := v_mult + 0.5; end if;
  select g.level into v_glevel from public.guilds g join public.guild_members m on m.guild_id = g.id where m.user_id = p_user;
  if v_glevel is not null then v_mult := v_mult + v_glevel * 0.01; end if;
  v_mult := v_mult * public.event_multiplier('xp');
  v_gold := round(p_gold * public.event_multiplier('gold'));

  v_xp := c.xp + round(p_xp * v_mult);
  v_level := c.level;
  while v_level < 200 and v_xp >= public.f_xp_next(v_level) loop
    v_xp := v_xp - public.f_xp_next(v_level);
    v_level := v_level + 1;
    v_ups := v_ups + 1;
  end loop;

  update public.characters set
    xp = v_xp, level = v_level,
    attribute_points = attribute_points + v_ups * 3,
    hp = case when v_ups > 0 then public.f_max_hp(c.con, v_level) else hp end,
    hp_updated_at = case when v_ups > 0 then now() else hp_updated_at end,
    updated_at = now()
  where user_id = p_user;

  if v_gold > 0 then perform public.wallet_apply(p_user, 'gold', v_gold, p_reason, p_ref); end if;
  if p_item is not null then perform public.give_item(p_user, p_item, 1); end if;
  return v_ups;
end;
$$;

-- ---------------------------------------------------------------------
-- APRIMORAMENTO (+0 a +10). Custo e chance vêm do backend (items.ts).
-- Falhar não destrói nem rebaixa o item: só gasta o ouro.
-- ---------------------------------------------------------------------
alter table public.inventory add column upgrade int not null default 0 check (upgrade between 0 and 10);

create or replace function public.upgrade_item(p_user uuid, p_inventory_id uuid, p_cost int, p_chance int)
returns jsonb
language plpgsql security definer set search_path = '' as $$
declare inv public.inventory; v_ok boolean;
begin
  select * into inv from public.inventory where id = p_inventory_id and user_id = p_user for update;
  if not found then raise exception 'not_owner'; end if;
  if inv.slot is null then raise exception 'not_equippable'; end if;
  if inv.upgrade >= 10 then raise exception 'max_upgrade'; end if;
  perform public.charge(p_user, 'gold', p_cost, 'upgrade:' || inv.item_id || ':' || (inv.upgrade + 1));
  v_ok := random() * 100 < p_chance;
  if v_ok then update public.inventory set upgrade = upgrade + 1 where id = inv.id; end if;
  return jsonb_build_object('success', v_ok, 'upgrade', inv.upgrade + case when v_ok then 1 else 0 end);
end;
$$;

-- ---------------------------------------------------------------------
-- ESTATÍSTICAS para o painel de administração
-- ---------------------------------------------------------------------
create or replace function public.admin_stats() returns jsonb
language sql stable security definer set search_path = '' as $$
  select jsonb_build_object(
    'players',       (select count(*) from public.characters),
    'new_24h',       (select count(*) from public.characters where created_at > now() - interval '1 day'),
    'new_7d',        (select count(*) from public.characters where created_at > now() - interval '7 days'),
    'active_24h',    (select count(*) from public.characters where updated_at > now() - interval '1 day'),
    'active_7d',     (select count(*) from public.characters where updated_at > now() - interval '7 days'),
    'guilds',        (select count(*) from public.guilds),
    'messages_24h',  (select count(*) from public.chat_messages where created_at > now() - interval '1 day'),
    'open_reports',  (select count(distinct message_id) from public.chat_reports where not resolved),
    'avg_level',     (select round(avg(level), 1) from public.characters),
    'revenue_30d',   (select coalesce(jsonb_object_agg(currency, total), '{}'::jsonb) from (
                        select currency, sum(amount_cents) as total from public.payments
                        where status = 'paid' and paid_at > now() - interval '30 days' group by currency) r),
    'refunds_30d',   (select count(*) from public.payments where status = 'refunded' and refunded_at > now() - interval '30 days'),
    'payers_total',  (select count(distinct user_id) from public.payments where status = 'paid'),
    'gems_in_7d',    (select coalesce(sum(delta), 0) from public.ledger where currency = 'gems' and delta > 0 and created_at > now() - interval '7 days'),
    'gems_out_7d',   (select coalesce(-sum(delta), 0) from public.ledger where currency = 'gems' and delta < 0 and created_at > now() - interval '7 days'),
    'gold_in_7d',    (select coalesce(sum(delta), 0) from public.ledger where currency = 'gold' and delta > 0 and created_at > now() - interval '7 days'),
    'gold_out_7d',   (select coalesce(-sum(delta), 0) from public.ledger where currency = 'gold' and delta < 0 and created_at > now() - interval '7 days'),
    'signups_14d',   (select coalesce(jsonb_agg(jsonb_build_object('day', d::date, 'n', n) order by d), '[]'::jsonb) from (
                        select gs.d, count(c.user_id) as n
                        from generate_series((now() at time zone 'utc')::date - 13, (now() at time zone 'utc')::date, interval '1 day') gs(d)
                        left join public.characters c on (c.created_at at time zone 'utc')::date = gs.d::date
                        group by gs.d) s),
    'levels',        (select coalesce(jsonb_agg(jsonb_build_object('band', band, 'n', n) order by band), '[]'::jsonb) from (
                        select least(level / 5, 6) * 5 as band, count(*) as n from public.characters group by 1) l),
    'top_spend',     (select coalesce(jsonb_agg(jsonb_build_object('reason', reason, 'gems', gems) order by gems desc), '[]'::jsonb) from (
                        select split_part(reason, ':', 1) as reason, -sum(delta) as gems from public.ledger
                        where currency = 'gems' and delta < 0 and created_at > now() - interval '30 days'
                        group by 1 order by 2 desc limit 6) t)
  );
$$;

do $$
declare f text;
begin
  foreach f in array array['event_multiplier(text)', 'grant_rewards(uuid,int,int,text,text,text)', 'upgrade_item(uuid,uuid,int,int)', 'admin_stats()'] loop
    execute format('revoke execute on function public.%s from public, anon, authenticated', f);
    execute format('grant execute on function public.%s to service_role', f);
  end loop;
end $$;

-- >>> 0012_pass_pets_dungeons.sql
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

-- >>> 0013_story_regions.sql
-- =====================================================================
-- História principal (capítulos) e regiões
-- =====================================================================
alter table public.characters add column story_chapter int not null default 0 check (story_chapter between 0 and 100);

-- Heróis criados antes desta versão: libera os capítulos compatíveis com o
-- nível (sem recompensa), para ninguém perder acesso a regiões que já usava.
-- Níveis exigidos por capítulo = espelho de story.ts.
update public.characters c set story_chapter = (
  select count(*) from unnest(array[1, 3, 5, 7, 10, 13, 16, 19, 22, 25]) as req where req <= c.level
) where story_chapter = 0 and level > 1;

-- Avança a história em ordem e entrega a recompensa do capítulo (uma vez).
create or replace function public.complete_chapter(
  p_user uuid, p_chapter int, p_xp int, p_gold int, p_gems int, p_item text, p_cosmetic text
) returns int
language plpgsql security definer set search_path = '' as $$
declare v_cur int; v_ups int;
begin
  select story_chapter into v_cur from public.characters where user_id = p_user for update;
  if v_cur is null then raise exception 'no_character'; end if;
  if p_chapter <> v_cur + 1 then raise exception 'invalid_action'; end if;
  update public.characters set story_chapter = p_chapter where user_id = p_user;
  perform public.claim_bundle(p_user, 'story:' || p_chapter, 0, p_gems, p_cosmetic, p_item, case when p_item is null then 0 else 1 end, 0, null);
  v_ups := public.grant_rewards(p_user, p_xp, p_gold, null, 'story:' || p_chapter, 'story-gold:' || p_user || ':' || p_chapter);
  return v_ups;
end;
$$;

revoke execute on function public.complete_chapter(uuid, int, int, int, int, text, text) from public, anon, authenticated;
grant execute on function public.complete_chapter(uuid, int, int, int, int, text, text) to service_role;
