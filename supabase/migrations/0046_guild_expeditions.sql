-- 0046: Expedições da Guilda — o ouro do tesouro da guilda finalmente tem uso.
--   • Capitão, Vice-Capitão ou Líder de Esquadrão organiza uma caçada, missão ou incursão pagando com o TESOURO.
--   • Saguão de alguns minutos para os membros entrarem (ou parte sozinho); depois o grupo viaja (15 min a 2 h).
--   • Na volta, o resultado (triunfo, sucesso ou fracasso) é sorteado no servidor e cada um resgata a sua parte.
-- Catálogo, custos e chances ficam em src/lib/game/expeditions.ts; aqui o banco garante dinheiro, tempo e "uma vez só".
-- Pode rodar mais de uma vez sem problema.

-- Relíquias lendárias de expedição (uma por raça).
insert into public.items (id, name, kind, rarity, data) values
  ('gladio_esquadrao',      'Gládio do Esquadrão',      'weapon', 'legendary', '{"slot":"weapon","atk":23,"str":4,"dex":3,"image":"/assets/items/expedition/gladio_esquadrao.webp"}'),
  ('arco_batedor_mor',      'Arco do Batedor-Mor',      'weapon', 'legendary', '{"slot":"weapon","atk":22,"dex":7,"image":"/assets/items/expedition/arco_batedor_mor.webp"}'),
  ('martelo_vanguarda',     'Martelo da Vanguarda',     'weapon', 'legendary', '{"slot":"weapon","atk":24,"str":4,"con":3,"image":"/assets/items/expedition/martelo_vanguarda.webp"}'),
  ('machado_incursor',      'Machado do Incursor',      'weapon', 'legendary', '{"slot":"weapon","atk":26,"str":5,"image":"/assets/items/expedition/machado_incursor.webp"}'),
  ('cajado_expedicionario', 'Cajado do Expedicionário', 'weapon', 'legendary', '{"slot":"weapon","atk":10,"intel":15,"image":"/assets/items/expedition/cajado_expedicionario.webp"}')
on conflict (id) do update set name = excluded.name, kind = excluded.kind, rarity = excluded.rarity, data = excluded.data;

create table if not exists public.guild_expeditions (
  id           uuid primary key default gen_random_uuid(),
  guild_id     uuid        not null references public.guilds (id) on delete cascade,
  expedition   text        not null,                       -- id do catálogo (expeditions.ts)
  strategy     text        not null default 'balanced' check (strategy in ('cautious', 'balanced', 'bold')),
  created_by   uuid        references auth.users (id) on delete set null,
  cost         int         not null check (cost >= 0),
  minutes      int         not null check (minutes between 1 and 1440),
  max_party    int         not null check (max_party between 1 and 50),
  status       text        not null default 'active' check (status in ('active', 'done', 'cancelled')),
  created_at   timestamptz not null default now(),
  departs_at   timestamptz not null,                       -- fim do saguão
  ends_at      timestamptz not null,                       -- volta do grupo
  outcome      text        check (outcome in ('triumph', 'success', 'fail')),
  power        int,                                        -- poder do grupo usado no sorteio
  report       jsonb       not null default '[]'::jsonb,   -- relato da viagem
  settled_at   timestamptz
);
create index if not exists guild_expeditions_guild_idx on public.guild_expeditions (guild_id, created_at desc);

create table if not exists public.guild_expedition_members (
  expedition_id  uuid        not null references public.guild_expeditions (id) on delete cascade,
  user_id        uuid        not null references auth.users (id) on delete cascade,
  name           text        not null,
  race           text        not null,
  level          int         not null default 1,
  power          int         not null check (power >= 0),
  joined_at      timestamptz not null default now(),
  claimed_at     timestamptz,
  reward         jsonb,
  primary key (expedition_id, user_id)
);
create index if not exists guild_expedition_members_user_idx on public.guild_expedition_members (user_id);

-- Só o servidor lê e escreve (as telas recebem tudo pela rota /api/guild-expeditions).
alter table public.guild_expeditions        enable row level security;
alter table public.guild_expedition_members enable row level security;
revoke all on public.guild_expeditions, public.guild_expedition_members from anon, authenticated;

-- O jogador já está numa expedição que ainda não voltou?
create or replace function public.f_on_expedition(p_user uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.guild_expedition_members m join public.guild_expeditions e on e.id = m.expedition_id
     where m.user_id = p_user and e.status = 'active' and now() < e.ends_at)
$$;

-- Organizar: paga com o tesouro, abre o saguão e já coloca o organizador no grupo.
-- p_lobby_sec = 0 → parte sozinho, na hora. p_announce (opcional) vira um aviso no chat da guilda.
create or replace function public.guild_expedition_start(
  p_user uuid, p_expedition text, p_strategy text, p_cost int, p_minutes int, p_min_level int, p_max_party int,
  p_lobby_sec int, p_max_active int, p_power int, p_announce text
) returns uuid
language plpgsql security definer set search_path = '' as $$
declare m public.guild_members; g public.guilds; c public.characters; v_id uuid; v_active int;
begin
  if p_cost <= 0 or p_minutes <= 0 or p_lobby_sec < 0 or p_power < 0 then raise exception 'invalid_action'; end if;
  select * into m from public.guild_members where user_id = p_user;
  if not found then raise exception 'not_in_guild'; end if;
  if public.f_guild_rank(m.role) < 1 then raise exception 'no_permission'; end if;
  select * into g from public.guilds where id = m.guild_id for update;
  if g.level < p_min_level then raise exception 'guild_level_low'; end if;
  if g.treasury < p_cost then raise exception 'treasury_low'; end if;
  select count(*) into v_active from public.guild_expeditions where guild_id = g.id and status = 'active';
  if v_active >= p_max_active then raise exception 'expedition_limit'; end if;
  if public.f_on_expedition(p_user) then raise exception 'already_on_expedition'; end if;
  select * into c from public.characters where user_id = p_user;
  if not found then raise exception 'no_character'; end if;

  update public.guilds set treasury = treasury - p_cost where id = g.id;
  insert into public.guild_expeditions (guild_id, expedition, strategy, created_by, cost, minutes, max_party, departs_at, ends_at)
    values (g.id, p_expedition, p_strategy, p_user, p_cost, p_minutes, greatest(1, p_max_party),
            now() + make_interval(secs => p_lobby_sec), now() + make_interval(secs => p_lobby_sec, mins => p_minutes))
    returning id into v_id;
  insert into public.guild_expedition_members (expedition_id, user_id, name, race, level, power)
    values (v_id, p_user, c.name, c.race, c.level, p_power);

  if p_announce is not null and p_lobby_sec > 0 then
    insert into public.chat_messages (channel, user_id, name, tag, title, frame, body)
      values ('guild:' || g.id, p_user, c.name, g.tag, c.equipped_title, c.equipped_frame, left(p_announce, 300));
  end if;
  return v_id;
end;
$$;

-- Entrar no grupo (qualquer membro da guilda, só durante o saguão).
create or replace function public.guild_expedition_join(p_user uuid, p_id uuid, p_power int) returns void
language plpgsql security definer set search_path = '' as $$
declare m public.guild_members; e public.guild_expeditions; c public.characters; v_count int;
begin
  select * into m from public.guild_members where user_id = p_user;
  if not found then raise exception 'not_in_guild'; end if;
  select * into e from public.guild_expeditions where id = p_id and guild_id = m.guild_id for update;
  if not found then raise exception 'expedition_gone'; end if;
  if e.status <> 'active' or now() >= e.departs_at then raise exception 'expedition_departed'; end if;
  if exists (select 1 from public.guild_expedition_members where expedition_id = p_id and user_id = p_user) then return; end if;
  if public.f_on_expedition(p_user) then raise exception 'already_on_expedition'; end if;
  select count(*) into v_count from public.guild_expedition_members where expedition_id = p_id;
  if v_count >= e.max_party then raise exception 'expedition_full'; end if;
  select * into c from public.characters where user_id = p_user;
  if not found then raise exception 'no_character'; end if;
  insert into public.guild_expedition_members (expedition_id, user_id, name, race, level, power)
    values (p_id, p_user, c.name, c.race, c.level, greatest(0, p_power));
end;
$$;

-- Sair do grupo durante o saguão (o organizador não sai: ele cancela).
create or replace function public.guild_expedition_leave(p_user uuid, p_id uuid) returns void
language plpgsql security definer set search_path = '' as $$
declare e public.guild_expeditions;
begin
  select * into e from public.guild_expeditions where id = p_id for update;
  if not found then raise exception 'expedition_gone'; end if;
  if e.status <> 'active' or now() >= e.departs_at then raise exception 'expedition_departed'; end if;
  if e.created_by = p_user then raise exception 'invalid_action'; end if;
  delete from public.guild_expedition_members where expedition_id = p_id and user_id = p_user;
end;
$$;

-- Cancelar durante o saguão: o ouro volta inteiro para o tesouro. Organizador, Capitão ou Vice-Capitão.
create or replace function public.guild_expedition_cancel(p_user uuid, p_id uuid) returns void
language plpgsql security definer set search_path = '' as $$
declare m public.guild_members; e public.guild_expeditions;
begin
  select * into m from public.guild_members where user_id = p_user;
  if not found then raise exception 'not_in_guild'; end if;
  perform 1 from public.guilds where id = m.guild_id for update;
  select * into e from public.guild_expeditions where id = p_id and guild_id = m.guild_id for update;
  if not found then raise exception 'expedition_gone'; end if;
  if e.status <> 'active' or now() >= e.departs_at then raise exception 'expedition_departed'; end if;
  if e.created_by is distinct from p_user and public.f_guild_rank(m.role) < 2 then raise exception 'no_permission'; end if;
  update public.guild_expeditions set status = 'cancelled', settled_at = now() where id = p_id;
  update public.guilds set treasury = treasury + e.cost where id = e.guild_id;
end;
$$;

-- Partir agora: o organizador encerra o saguão antes da hora.
create or replace function public.guild_expedition_depart(p_user uuid, p_id uuid) returns void
language plpgsql security definer set search_path = '' as $$
declare e public.guild_expeditions;
begin
  select * into e from public.guild_expeditions where id = p_id for update;
  if not found then raise exception 'expedition_gone'; end if;
  if e.created_by is distinct from p_user then raise exception 'no_permission'; end if;
  if e.status <> 'active' or now() >= e.departs_at then raise exception 'expedition_departed'; end if;
  update public.guild_expeditions set departs_at = now(), ends_at = now() + make_interval(mins => e.minutes) where id = p_id;
end;
$$;

-- Fechar a expedição quando o grupo volta: grava o resultado sorteado pelo servidor (uma vez só) e dá XP à guilda.
-- Devolve o resultado que ficou valendo (se outro pedido fechou antes, é o dele).
create or replace function public.guild_expedition_settle(p_id uuid, p_outcome text, p_power int, p_report jsonb, p_guild_xp int) returns text
language plpgsql security definer set search_path = '' as $$
declare e public.guild_expeditions; g public.guilds; v_xp bigint; v_level int;
begin
  select * into e from public.guild_expeditions where id = p_id for update;
  if not found then raise exception 'expedition_gone'; end if;
  if e.status = 'done' then return e.outcome; end if;
  if e.status <> 'active' or now() < e.ends_at then raise exception 'expedition_running'; end if;
  if p_outcome not in ('triumph', 'success', 'fail') then raise exception 'invalid_action'; end if;
  update public.guild_expeditions set status = 'done', outcome = p_outcome, power = p_power, report = coalesce(p_report, '[]'::jsonb), settled_at = now() where id = p_id;

  if p_guild_xp > 0 then
    select * into g from public.guilds where id = e.guild_id for update;
    if g.level < 20 then
      v_xp := g.xp + p_guild_xp; v_level := g.level;
      while v_level < 20 and v_xp >= public.f_guild_xp_next(v_level) loop
        v_xp := v_xp - public.f_guild_xp_next(v_level);
        v_level := v_level + 1;
      end loop;
      if v_level >= 20 then v_xp := 0; end if;
      update public.guilds set xp = v_xp, level = v_level,
        member_limit = greatest(member_limit, public.f_guild_member_limit(v_level)) where id = g.id;
    end if;
  end if;
  return p_outcome;
end;
$$;

-- Resgatar a parte de um participante (valores e itens sorteados pelo servidor). Uma vez só.
-- p_items: [{"item":"pocao_vida","qty":2}, …]. Equipamento sem espaço na bolsa vira ouro (p_fallback_gold de cada um).
create or replace function public.guild_expedition_claim(p_user uuid, p_id uuid, p_xp int, p_gold int, p_items jsonb, p_bag_limit int) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare e public.guild_expeditions; pm public.guild_expedition_members; it jsonb; v_kind text; v_used int; v_need int;
  v_extra int := 0; v_given jsonb := '[]'::jsonb; v_ups int; v_reward jsonb;
begin
  if p_xp < 0 or p_gold < 0 then raise exception 'negative_reward'; end if;
  select * into e from public.guild_expeditions where id = p_id;
  if not found then raise exception 'expedition_gone'; end if;
  if e.status <> 'done' then raise exception 'expedition_running'; end if;
  select * into pm from public.guild_expedition_members where expedition_id = p_id and user_id = p_user for update;
  if not found then raise exception 'not_on_expedition'; end if;
  if pm.claimed_at is not null then raise exception 'already_claimed'; end if;

  for it in select * from jsonb_array_elements(coalesce(p_items, '[]'::jsonb)) loop
    select kind into v_kind from public.items where id = it->>'item';
    if v_kind is null then continue; end if;
    select count(*) into v_used from public.inventory where user_id = p_user and not equipped;
    v_need := case when v_kind = 'consumable' and exists (select 1 from public.inventory where user_id = p_user and item_id = it->>'item') then 0 else 1 end;
    if v_used + v_need > p_bag_limit then
      v_extra := v_extra + coalesce((it->>'gold')::int, 0);
      v_given := v_given || jsonb_build_object('item', it->>'item', 'qty', coalesce((it->>'qty')::int, 1), 'sold', coalesce((it->>'gold')::int, 0));
    else
      perform public.give_item(p_user, it->>'item', coalesce((it->>'qty')::int, 1));
      v_given := v_given || jsonb_build_object('item', it->>'item', 'qty', coalesce((it->>'qty')::int, 1));
    end if;
  end loop;

  v_ups := public.grant_rewards(p_user, p_xp, p_gold + v_extra, null, 'guild_expedition', 'gexp:' || p_id || ':' || p_user);
  v_reward := jsonb_build_object('xp', p_xp, 'gold', p_gold + v_extra, 'items', v_given, 'levelUps', v_ups);
  update public.guild_expedition_members set claimed_at = now(), reward = v_reward where expedition_id = p_id and user_id = p_user;
  return v_reward;
end;
$$;

do $$
declare f text;
begin
  foreach f in array array[
    'f_on_expedition(uuid)',
    'guild_expedition_start(uuid,text,text,int,int,int,int,int,int,int,text)',
    'guild_expedition_join(uuid,uuid,int)', 'guild_expedition_leave(uuid,uuid)', 'guild_expedition_cancel(uuid,uuid)',
    'guild_expedition_depart(uuid,uuid)', 'guild_expedition_settle(uuid,text,int,jsonb,int)',
    'guild_expedition_claim(uuid,uuid,int,int,jsonb,int)'
  ] loop
    execute format('revoke execute on function public.%s from public, anon, authenticated', f);
    execute format('grant execute on function public.%s to service_role', f);
  end loop;
end $$;
