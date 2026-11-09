-- 0043: Guildas no estilo "esquadrão".
--   • Hierarquia de 4 cargos: Capitão (leader), Vice-Capitão (officer), Líder de Esquadrão (squad_leader) e Membro (member).
--     Os valores antigos 'leader' e 'officer' continuam os mesmos no banco: só ganharam nome novo na tela.
--   • Nível da guilda vai até 20 e libera: bônus de ataque/defesa, mais vagas e mais espaços no cofre.
--   • Cofre de itens compartilhado (guild_inventory) com taxa de retirada em ouro e histórico (guild_vault_log).
-- Pode rodar mais de uma vez sem problema.

-- ---------------------------------------------------------------------
-- CARGOS
-- ---------------------------------------------------------------------
alter table public.guild_members drop constraint if exists guild_members_role_check;
alter table public.guild_members add constraint guild_members_role_check
  check (role in ('leader', 'officer', 'squad_leader', 'member'));

-- Peso do cargo: quem tem peso maior manda em quem tem peso menor.
create or replace function public.f_guild_rank(p_role text) returns int
language sql immutable as $$
  select case p_role when 'leader' then 3 when 'officer' then 2 when 'squad_leader' then 1 else 0 end
$$;

-- ---------------------------------------------------------------------
-- PROGRESSÃO (espelho de src/lib/game/guilds.ts)
-- ---------------------------------------------------------------------
alter table public.guilds drop constraint if exists guilds_level_check;
alter table public.guilds add constraint guilds_level_check check (level between 1 and 20);

-- XP para o próximo nível: igual a antes até o 10; do 10 em diante fica mais caro.
create or replace function public.f_guild_xp_next(p_level int) returns bigint
language sql immutable as $$
  select (case when p_level < 10 then 1000 * p_level else 5000 * (p_level - 8) end)::bigint
$$;
-- Vagas: 20 no nível 1, +2 por nível (58 no nível 20).
create or replace function public.f_guild_member_limit(p_level int) returns int
language sql immutable as $$ select 20 + 2 * (p_level - 1) $$;
-- Espaços do cofre: 10 no nível 1, +4 por nível (86 no nível 20).
create or replace function public.f_guild_vault_slots(p_level int) returns int
language sql immutable as $$ select 10 + 4 * (p_level - 1) $$;

-- Guildas que já existem ganham as vagas do nível atual.
update public.guilds set member_limit = public.f_guild_member_limit(level)
  where member_limit < public.f_guild_member_limit(level);

-- Soma XP na guilda do jogador e sobe de nível (agora até 20, e as vagas crescem junto).
create or replace function public.guild_add_xp(p_user uuid, p_xp int) returns void
language plpgsql security definer set search_path = '' as $$
declare g public.guilds;
begin
  select gu.* into g from public.guilds gu join public.guild_members m on m.guild_id = gu.id
    where m.user_id = p_user for update of gu;
  if not found or g.level >= 20 then return; end if;
  g.xp := g.xp + p_xp;
  while g.level < 20 and g.xp >= public.f_guild_xp_next(g.level) loop
    g.xp := g.xp - public.f_guild_xp_next(g.level);
    g.level := g.level + 1;
  end loop;
  if g.level >= 20 then g.xp := 0; end if;
  update public.guilds set xp = g.xp, level = g.level,
    member_limit = greatest(member_limit, public.f_guild_member_limit(g.level))
    where id = g.id;
end;
$$;

-- ---------------------------------------------------------------------
-- PERMISSÕES
-- ---------------------------------------------------------------------
-- Sair. Se for o Capitão, o comando passa para o cargo mais alto (e mais antigo); sem ninguém, a guilda é desfeita.
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
      order by public.f_guild_rank(role) desc, joined_at limit 1;
    if v_next is null then
      delete from public.guilds where id = m.guild_id;
    else
      update public.guild_members set role = 'leader' where user_id = v_next;
    end if;
  end if;
end;
$$;

-- Expulsar: Capitão e Vice-Capitão, só quem está abaixo deles. Passar o comando: só o Capitão.
-- 'promote'/'demote' são os botões da versão antiga do jogo (Membro <-> Vice) e continuam funcionando.
create or replace function public.guild_manage(p_actor uuid, p_target uuid, p_action text) returns void
language plpgsql security definer set search_path = '' as $$
declare a public.guild_members; t public.guild_members;
begin
  if p_actor = p_target then raise exception 'invalid_target'; end if;
  select * into a from public.guild_members where user_id = p_actor;
  if not found then raise exception 'not_in_guild'; end if;
  perform 1 from public.guilds where id = a.guild_id for update;
  select * into a from public.guild_members where user_id = p_actor;
  select * into t from public.guild_members where user_id = p_target for update;
  if a.guild_id is null or t.guild_id is null or a.guild_id <> t.guild_id then raise exception 'not_owner'; end if;

  if p_action = 'kick' then
    if public.f_guild_rank(a.role) < 2 or public.f_guild_rank(a.role) <= public.f_guild_rank(t.role) then
      raise exception 'no_permission';
    end if;
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

-- Definir o cargo de alguém.
--   Capitão: escolhe Vice-Capitão, Líder de Esquadrão ou Membro para qualquer um.
--   Vice-Capitão: escolhe Líder de Esquadrão ou Membro, só para quem está abaixo dele.
-- p_max_vice / p_max_squad: quantos cabem em cada cargo (vêm do backend).
create or replace function public.guild_set_role(p_actor uuid, p_target uuid, p_role text, p_max_vice int, p_max_squad int) returns void
language plpgsql security definer set search_path = '' as $$
declare a public.guild_members; t public.guild_members; v_count int;
begin
  if p_actor = p_target then raise exception 'invalid_target'; end if;
  if p_role not in ('officer', 'squad_leader', 'member') then raise exception 'invalid_action'; end if;
  select * into a from public.guild_members where user_id = p_actor;
  if not found then raise exception 'not_in_guild'; end if;
  perform 1 from public.guilds where id = a.guild_id for update;
  select * into a from public.guild_members where user_id = p_actor;
  select * into t from public.guild_members where user_id = p_target for update;
  if a.guild_id is null or t.guild_id is null or a.guild_id <> t.guild_id then raise exception 'not_owner'; end if;

  if public.f_guild_rank(a.role) < 2
     or public.f_guild_rank(a.role) <= public.f_guild_rank(t.role)
     or public.f_guild_rank(a.role) <= public.f_guild_rank(p_role) then
    raise exception 'no_permission';
  end if;
  if t.role = p_role then return; end if;

  if p_role <> 'member' then
    select count(*) into v_count from public.guild_members where guild_id = a.guild_id and role = p_role;
    if v_count >= (case when p_role = 'officer' then p_max_vice else p_max_squad end) then raise exception 'role_full'; end if;
  end if;
  update public.guild_members set role = p_role where user_id = p_target;
end;
$$;

-- Aceitar/recusar pedidos: Capitão, Vice-Capitão e Líder de Esquadrão.
create or replace function public.guild_request_decide(p_actor uuid, p_target uuid, p_accept boolean) returns void
language plpgsql security definer set search_path = '' as $$
declare a public.guild_members; g public.guilds; v_count int;
begin
  select * into a from public.guild_members where user_id = p_actor;
  if not found or public.f_guild_rank(a.role) < 1 then raise exception 'no_permission'; end if;
  select * into g from public.guilds where id = a.guild_id for update;
  perform 1 from public.guild_requests where user_id = p_target and guild_id = a.guild_id for update;
  if not found then raise exception 'no_request'; end if;

  if not p_accept then
    delete from public.guild_requests where user_id = p_target and guild_id = a.guild_id;
    return;
  end if;
  if exists (select 1 from public.guild_members where user_id = p_target) then
    delete from public.guild_requests where user_id = p_target;
    raise exception 'already_in_guild';
  end if;
  select count(*) into v_count from public.guild_members where guild_id = a.guild_id;
  if v_count >= g.member_limit then raise exception 'guild_full'; end if;
  insert into public.guild_members (user_id, guild_id) values (p_target, a.guild_id);
  delete from public.guild_requests where user_id = p_target;
end;
$$;

-- Configurações (aberta/privada e descrição): Capitão e Vice-Capitão.
create or replace function public.guild_set_privacy(p_actor uuid, p_privacy text) returns void
language plpgsql security definer set search_path = '' as $$
declare a public.guild_members;
begin
  if p_privacy not in ('open', 'private') then raise exception 'invalid_action'; end if;
  select * into a from public.guild_members where user_id = p_actor;
  if not found or public.f_guild_rank(a.role) < 2 then raise exception 'no_permission'; end if;
  update public.guilds set privacy = p_privacy where id = a.guild_id;
end;
$$;

create or replace function public.guild_set_description(p_actor uuid, p_description text) returns void
language plpgsql security definer set search_path = '' as $$
declare a public.guild_members;
begin
  select * into a from public.guild_members where user_id = p_actor;
  if not found or public.f_guild_rank(a.role) < 2 then raise exception 'no_permission'; end if;
  update public.guilds set description = left(coalesce(p_description, ''), 200) where id = a.guild_id;
end;
$$;

-- ---------------------------------------------------------------------
-- COFRE DE ITENS
-- ---------------------------------------------------------------------
create table if not exists public.guild_inventory (
  id            uuid primary key default gen_random_uuid(),
  guild_id      uuid        not null references public.guilds (id) on delete cascade,
  item_id       text        not null references public.items (id),
  qty           int         not null default 1 check (qty > 0),
  upgrade       int         not null default 0 check (upgrade between 0 and 10),
  deposited_by  uuid        references auth.users (id) on delete set null,
  deposited_at  timestamptz not null default now()
);
create index if not exists guild_inventory_guild_idx on public.guild_inventory (guild_id, deposited_at);

-- Histórico do cofre (quem guardou e quem retirou).
create table if not exists public.guild_vault_log (
  id          bigint generated always as identity primary key,
  guild_id    uuid        not null references public.guilds (id) on delete cascade,
  user_id     uuid        references auth.users (id) on delete set null,
  name        text        not null,
  action      text        not null check (action in ('deposit', 'withdraw')),
  item_id     text        not null,
  qty         int         not null,
  upgrade     int         not null default 0,
  fee         int         not null default 0,
  created_at  timestamptz not null default now()
);
create index if not exists guild_vault_log_guild_idx on public.guild_vault_log (guild_id, id desc);

alter table public.guild_inventory enable row level security;
alter table public.guild_vault_log enable row level security;
-- Só os membros da própria guilda enxergam o cofre e o histórico. Ninguém escreve direto.
drop policy if exists "vault visible to members" on public.guild_inventory;
create policy "vault visible to members" on public.guild_inventory for select to authenticated using (
  guild_id = (select m.guild_id from public.guild_members m where m.user_id = auth.uid())
);
drop policy if exists "vault log visible to members" on public.guild_vault_log;
create policy "vault log visible to members" on public.guild_vault_log for select to authenticated using (
  guild_id = (select m.guild_id from public.guild_members m where m.user_id = auth.uid())
);
revoke all on public.guild_inventory, public.guild_vault_log from anon, authenticated;
grant select on public.guild_inventory, public.guild_vault_log to authenticated;

-- Guardar um item da bolsa no cofre (qualquer membro, sem custo).
-- Equipamento ocupa 1 espaço por peça; consumíveis iguais empilham no mesmo espaço.
create or replace function public.guild_vault_deposit(p_user uuid, p_inventory_id uuid, p_qty int) returns uuid
language plpgsql security definer set search_path = '' as $$
declare m public.guild_members; g public.guilds; inv public.inventory; v_kind text; v_name text; v_id uuid; v_used int;
begin
  select * into m from public.guild_members where user_id = p_user;
  if not found then raise exception 'not_in_guild'; end if;
  select * into g from public.guilds where id = m.guild_id for update;
  select * into inv from public.inventory where id = p_inventory_id and user_id = p_user for update;
  if not found then raise exception 'not_owner'; end if;
  if inv.equipped then raise exception 'item_equipped'; end if;
  if p_qty is null or p_qty < 1 or p_qty > inv.qty then raise exception 'invalid_action'; end if;
  select kind into v_kind from public.items where id = inv.item_id;
  if v_kind = 'cosmetic' then raise exception 'invalid_action'; end if;

  if v_kind = 'consumable' then
    select id into v_id from public.guild_inventory where guild_id = g.id and item_id = inv.item_id limit 1 for update;
  end if;
  if v_id is not null then
    update public.guild_inventory set qty = qty + p_qty where id = v_id;
  else
    select count(*) into v_used from public.guild_inventory where guild_id = g.id;
    if v_used >= public.f_guild_vault_slots(g.level) then raise exception 'vault_full'; end if;
    insert into public.guild_inventory (guild_id, item_id, qty, upgrade, deposited_by)
      values (g.id, inv.item_id, p_qty, coalesce(inv.upgrade, 0), p_user) returning id into v_id;
  end if;

  if inv.qty > p_qty then update public.inventory set qty = qty - p_qty where id = inv.id;
  else delete from public.inventory where id = inv.id; end if;

  select name into v_name from public.characters where user_id = p_user;
  insert into public.guild_vault_log (guild_id, user_id, name, action, item_id, qty, upgrade)
    values (g.id, p_user, coalesce(v_name, '?'), 'deposit', inv.item_id, p_qty, coalesce(inv.upgrade, 0));
  -- Faxina ocasional: mantém só os últimos 30 dias de histórico.
  if random() < 0.05 then delete from public.guild_vault_log where created_at < now() - interval '30 days'; end if;
  return v_id;
end;
$$;

-- Retirar um item do cofre pagando a taxa (p_fee, calculada no backend) em ouro. A taxa vai para o tesouro da guilda.
-- p_min_hours: tempo de guilda que um Membro precisa ter para retirar (evita "entrar, esvaziar o cofre e sair").
-- p_bag_limit: tamanho da bolsa do jogador.
create or replace function public.guild_vault_withdraw(
  p_user uuid, p_vault_id uuid, p_qty int, p_fee int, p_bag_limit int, p_min_hours int
) returns text
language plpgsql security definer set search_path = '' as $$
declare m public.guild_members; v public.guild_inventory; v_kind text; v_slot text; v_name text; v_used int; v_need int := 1;
begin
  if p_fee is null or p_fee < 0 then raise exception 'invalid_cost'; end if;
  select * into m from public.guild_members where user_id = p_user;
  if not found then raise exception 'not_in_guild'; end if;
  perform 1 from public.guilds where id = m.guild_id for update;
  select * into v from public.guild_inventory where id = p_vault_id and guild_id = m.guild_id for update;
  if not found then raise exception 'vault_item_gone'; end if;
  if p_qty is null or p_qty < 1 or p_qty > v.qty then raise exception 'invalid_action'; end if;
  if m.role = 'member' and m.joined_at > now() - make_interval(hours => p_min_hours) then raise exception 'vault_locked'; end if;

  select kind, data->>'slot' into v_kind, v_slot from public.items where id = v.item_id;
  if v_kind = 'consumable' and exists (select 1 from public.inventory where user_id = p_user and item_id = v.item_id) then
    v_need := 0;
  end if;
  select count(*) into v_used from public.inventory where user_id = p_user and not equipped;
  if v_used + v_need > p_bag_limit then raise exception 'bag_full'; end if;

  if p_fee > 0 then
    perform public.charge(p_user, 'gold', p_fee, 'guild_vault_fee');
    update public.guilds set treasury = treasury + p_fee where id = m.guild_id;
  end if;

  if v_kind = 'consumable' then
    perform public.give_item(p_user, v.item_id, p_qty);
  else
    insert into public.inventory (user_id, item_id, qty, slot, upgrade) values (p_user, v.item_id, 1, v_slot, v.upgrade);
  end if;
  if v.qty > p_qty then update public.guild_inventory set qty = qty - p_qty where id = v.id;
  else delete from public.guild_inventory where id = v.id; end if;

  select name into v_name from public.characters where user_id = p_user;
  insert into public.guild_vault_log (guild_id, user_id, name, action, item_id, qty, upgrade, fee)
    values (m.guild_id, p_user, coalesce(v_name, '?'), 'withdraw', v.item_id, p_qty, v.upgrade, p_fee);
  return v.item_id;
end;
$$;

do $$
declare f text;
begin
  foreach f in array array[
    'guild_add_xp(uuid,int)', 'leave_guild(uuid)', 'guild_manage(uuid,uuid,text)',
    'guild_set_role(uuid,uuid,text,int,int)', 'guild_request_decide(uuid,uuid,boolean)',
    'guild_set_privacy(uuid,text)', 'guild_set_description(uuid,text)',
    'guild_vault_deposit(uuid,uuid,int)', 'guild_vault_withdraw(uuid,uuid,int,int,int,int)'
  ] loop
    execute format('revoke execute on function public.%s from public, anon, authenticated', f);
    execute format('grant execute on function public.%s to service_role', f);
  end loop;
end $$;
