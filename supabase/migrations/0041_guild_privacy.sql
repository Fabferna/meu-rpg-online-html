-- 0041: Guilda aberta ou privada. Na privada, o jogador manda um pedido (com mensagem) e o líder
-- ou um oficial aceita ou recusa. Na aberta, qualquer um entra direto (como antes).

alter table public.guilds add column if not exists privacy text not null default 'open';
alter table public.guilds drop constraint if exists guilds_privacy_check;
alter table public.guilds add constraint guilds_privacy_check check (privacy in ('open', 'private'));

create table if not exists public.guild_requests (
  user_id     uuid        not null references auth.users (id) on delete cascade,
  guild_id    uuid        not null references public.guilds (id) on delete cascade,
  message     text        not null default '' check (char_length(message) <= 200),
  created_at  timestamptz not null default now(),
  primary key (user_id, guild_id)
);
create index if not exists guild_requests_guild_idx on public.guild_requests (guild_id, created_at);
alter table public.guild_requests enable row level security;
revoke all on public.guild_requests from anon, authenticated;

-- Fundar escolhendo aberta/privada (a versão antiga, sem privacidade, continua funcionando como "aberta").
create or replace function public.create_guild(p_user uuid, p_name text, p_tag text, p_description text, p_privacy text) returns uuid
language plpgsql security definer set search_path = '' as $$
declare v_id uuid;
begin
  if p_privacy not in ('open', 'private') then raise exception 'invalid_action'; end if;
  v_id := public.create_guild(p_user, p_name, p_tag, p_description);
  update public.guilds set privacy = p_privacy where id = v_id;
  delete from public.guild_requests where user_id = p_user;
  return v_id;
end;
$$;

-- Entrar direto: só em guilda aberta. Ao entrar, os pedidos pendentes do jogador somem.
create or replace function public.join_guild(p_user uuid, p_guild uuid) returns void
language plpgsql security definer set search_path = '' as $$
declare g public.guilds; v_count int;
begin
  if exists (select 1 from public.guild_members where user_id = p_user) then raise exception 'already_in_guild'; end if;
  select * into g from public.guilds where id = p_guild for update;
  if not found then raise exception 'unknown_guild'; end if;
  if g.privacy = 'private' then raise exception 'guild_private'; end if;
  select count(*) into v_count from public.guild_members where guild_id = p_guild;
  if v_count >= g.member_limit then raise exception 'guild_full'; end if;
  insert into public.guild_members (user_id, guild_id) values (p_user, p_guild);
  delete from public.guild_requests where user_id = p_user;
end;
$$;

-- Pedir para entrar numa guilda privada (no máximo p_limit pedidos pendentes por jogador).
-- Pedir de novo para a mesma guilda só atualiza a mensagem.
create or replace function public.guild_request(p_user uuid, p_guild uuid, p_message text, p_limit int) returns void
language plpgsql security definer set search_path = '' as $$
declare g public.guilds;
begin
  if exists (select 1 from public.guild_members where user_id = p_user) then raise exception 'already_in_guild'; end if;
  select * into g from public.guilds where id = p_guild;
  if not found then raise exception 'unknown_guild'; end if;
  if g.privacy <> 'private' then raise exception 'invalid_action'; end if;
  if not exists (select 1 from public.guild_requests where user_id = p_user and guild_id = p_guild)
     and (select count(*) from public.guild_requests where user_id = p_user) >= p_limit then
    raise exception 'request_limit';
  end if;
  insert into public.guild_requests (user_id, guild_id, message) values (p_user, p_guild, left(coalesce(p_message, ''), 200))
    on conflict (user_id, guild_id) do update set message = excluded.message, created_at = now();
end;
$$;

create or replace function public.guild_request_cancel(p_user uuid, p_guild uuid) returns void
language plpgsql security definer set search_path = '' as $$
begin
  delete from public.guild_requests where user_id = p_user and guild_id = p_guild;
  if not found then raise exception 'no_request'; end if;
end;
$$;

-- Líder ou oficial aceita/recusa um pedido para a SUA guilda.
create or replace function public.guild_request_decide(p_actor uuid, p_target uuid, p_accept boolean) returns void
language plpgsql security definer set search_path = '' as $$
declare a public.guild_members; g public.guilds; v_count int;
begin
  select * into a from public.guild_members where user_id = p_actor;
  if not found or a.role not in ('leader', 'officer') then raise exception 'no_permission'; end if;
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

-- Líder muda entre aberta e privada.
create or replace function public.guild_set_privacy(p_actor uuid, p_privacy text) returns void
language plpgsql security definer set search_path = '' as $$
declare a public.guild_members;
begin
  if p_privacy not in ('open', 'private') then raise exception 'invalid_action'; end if;
  select * into a from public.guild_members where user_id = p_actor;
  if not found or a.role <> 'leader' then raise exception 'no_permission'; end if;
  update public.guilds set privacy = p_privacy where id = a.guild_id;
end;
$$;

revoke execute on function public.create_guild(uuid, text, text, text, text) from public, anon, authenticated;
revoke execute on function public.join_guild(uuid, uuid) from public, anon, authenticated;
revoke execute on function public.guild_request(uuid, uuid, text, int) from public, anon, authenticated;
revoke execute on function public.guild_request_cancel(uuid, uuid) from public, anon, authenticated;
revoke execute on function public.guild_request_decide(uuid, uuid, boolean) from public, anon, authenticated;
revoke execute on function public.guild_set_privacy(uuid, text) from public, anon, authenticated;
grant execute on function public.create_guild(uuid, text, text, text, text) to service_role;
grant execute on function public.join_guild(uuid, uuid) to service_role;
grant execute on function public.guild_request(uuid, uuid, text, int) to service_role;
grant execute on function public.guild_request_cancel(uuid, uuid) to service_role;
grant execute on function public.guild_request_decide(uuid, uuid, boolean) to service_role;
grant execute on function public.guild_set_privacy(uuid, text) to service_role;
