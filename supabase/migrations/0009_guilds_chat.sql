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
