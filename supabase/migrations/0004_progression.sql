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
