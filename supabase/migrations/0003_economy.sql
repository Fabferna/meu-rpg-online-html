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
