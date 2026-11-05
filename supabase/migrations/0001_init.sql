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
