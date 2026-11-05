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
