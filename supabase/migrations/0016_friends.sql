-- 0016: amigos, chat privado (DM) entre amigos.
-- Amizade é da CONTA (user_id); o nome exibido é o do herói ativo.

create table if not exists public.friendships (
  id           uuid primary key default gen_random_uuid(),
  user_a       uuid        not null references auth.users (id) on delete cascade,
  user_b       uuid        not null references auth.users (id) on delete cascade,
  requested_by uuid        not null references auth.users (id) on delete cascade,
  status       text        not null default 'pending' check (status in ('pending', 'accepted')),
  created_at   timestamptz not null default now(),
  check (user_a < user_b),
  unique (user_a, user_b)
);
create index if not exists friendships_b_idx on public.friendships (user_b);
alter table public.friendships enable row level security;
create policy "own friendships" on public.friendships for select to authenticated
  using (auth.uid() = user_a or auth.uid() = user_b);

-- Canal de DM: 'dm:<id da amizade>'.
alter table public.chat_messages drop constraint if exists chat_messages_channel_check;
alter table public.chat_messages add constraint chat_messages_channel_check
  check (channel = 'global' or channel like 'guild:%' or channel like 'dm:%');

drop policy if exists "read chat" on public.chat_messages;
create policy "read chat" on public.chat_messages for select to authenticated using (
  (not hidden or user_id = auth.uid())
  and (channel = 'global'
       or channel = 'guild:' || (select m.guild_id::text from public.guild_members m where m.user_id = auth.uid())
       or (channel like 'dm:%' and exists (
             select 1 from public.friendships f
             where 'dm:' || f.id::text = channel and f.status = 'accepted' and auth.uid() in (f.user_a, f.user_b))))
);

-- Pedido de amizade (se o outro já tinha pedido, aceita direto). Limite de 100 amigos.
create or replace function public.friend_request(p_user uuid, p_target uuid) returns text
language plpgsql security definer set search_path = '' as $$
declare a uuid := least(p_user, p_target); b uuid := greatest(p_user, p_target); f public.friendships;
begin
  if p_user = p_target then raise exception 'invalid_target'; end if;
  if (select count(*) from public.friendships where (user_a = p_user or user_b = p_user)) >= 100 then raise exception 'friend_limit'; end if;
  select * into f from public.friendships where user_a = a and user_b = b for update;
  if found then
    if f.status = 'accepted' then raise exception 'already_friends'; end if;
    if f.requested_by = p_user then raise exception 'already_requested'; end if;
    update public.friendships set status = 'accepted' where id = f.id;
    return 'accepted';
  end if;
  insert into public.friendships (user_a, user_b, requested_by) values (a, b, p_user);
  return 'requested';
end;
$$;

-- Aceitar / recusar / remover (recusar e remover apagam a ligação).
create or replace function public.friend_respond(p_user uuid, p_other uuid, p_accept boolean) returns void
language plpgsql security definer set search_path = '' as $$
declare a uuid := least(p_user, p_other); b uuid := greatest(p_user, p_other); f public.friendships;
begin
  select * into f from public.friendships where user_a = a and user_b = b for update;
  if not found then raise exception 'invalid_target'; end if;
  if p_accept then
    if f.status <> 'pending' or f.requested_by = p_user then raise exception 'invalid_action'; end if;
    update public.friendships set status = 'accepted' where id = f.id;
  else
    delete from public.chat_messages where channel = 'dm:' || f.id::text;
    delete from public.friendships where id = f.id;
  end if;
end;
$$;

-- post_chat com suporte a DM entre amigos.
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
  elsif p_channel like 'dm:%' then
    if not exists (select 1 from public.friendships f where 'dm:' || f.id::text = p_channel and f.status = 'accepted' and p_user in (f.user_a, f.user_b)) then
      raise exception 'no_permission';
    end if;
  elsif p_channel <> 'global' then
    raise exception 'invalid_action';
  end if;
  insert into public.chat_messages (channel, user_id, name, tag, title, frame, body)
    values (p_channel, p_user, c.name, v_tag, c.equipped_title, c.equipped_frame, p_body)
    returning id into v_id;
  if random() < 0.02 then
    delete from public.chat_messages where created_at < now() - interval '3 days' and channel not like 'dm:%';
    delete from public.chat_messages where created_at < now() - interval '30 days';
  end if;
  return v_id;
end;
$$;

revoke execute on function public.friend_request(uuid, uuid) from public, anon, authenticated;
revoke execute on function public.friend_respond(uuid, uuid, boolean) from public, anon, authenticated;
revoke execute on function public.post_chat(uuid, text, text) from public, anon, authenticated;
grant execute on function public.friend_request(uuid, uuid) to service_role;
grant execute on function public.friend_respond(uuid, uuid, boolean) to service_role;
grant execute on function public.post_chat(uuid, text, text) to service_role;
