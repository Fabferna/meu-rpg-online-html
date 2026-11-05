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
