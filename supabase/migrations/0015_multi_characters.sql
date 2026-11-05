-- 0015: vários heróis por conta.
-- O herói ATIVO continua em public.characters (1 por conta), então todo o resto do jogo não muda.
-- Os outros heróis ficam guardados em public.character_stash (personagem + itens).
-- Compartilhado pela conta: ouro, gemas, cosméticos, pets, passe, guilda e contadores.

alter table public.profiles add column if not exists char_slots int not null default 2 check (char_slots between 1 and 10);

create table if not exists public.character_stash (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid        not null references auth.users (id) on delete cascade,
  name       citext      not null unique,
  data       jsonb       not null,
  inventory  jsonb       not null default '[]'::jsonb,
  stashed_at timestamptz not null default now()
);
create index if not exists character_stash_user_idx on public.character_stash (user_id);
alter table public.character_stash enable row level security;
create policy "own stash" on public.character_stash for select to authenticated using (user_id = auth.uid());

-- Regras ao criar/restaurar um herói: nome livre (inclusive entre os guardados) e espaço disponível.
create or replace function public.tg_character_limits() returns trigger
language plpgsql security definer set search_path = '' as $$
declare v_slots int; v_n int;
begin
  if exists (select 1 from public.character_stash where name = new.name) then
    raise exception using errcode = '23505', message = 'name_taken';
  end if;
  select coalesce((select char_slots from public.profiles where id = new.user_id), 2) into v_slots;
  select count(*) into v_n from public.character_stash where user_id = new.user_id;
  if v_n + 1 > v_slots then raise exception 'no_slot'; end if;
  return new;
end;
$$;
drop trigger if exists character_limits on public.characters;
create trigger character_limits before insert on public.characters for each row execute function public.tg_character_limits();

-- Guarda o herói ativo (fora de batalha e de missão).
create or replace function public.stash_character(p_user uuid) returns uuid
language plpgsql security definer set search_path = '' as $$
declare c public.characters; v_inv jsonb; v_id uuid;
begin
  select * into c from public.characters where user_id = p_user for update;
  if not found then raise exception 'no_character'; end if;
  if exists (select 1 from public.battles where user_id = p_user and status = 'active') then raise exception 'in_battle'; end if;
  if exists (select 1 from public.quest_runs where user_id = p_user and status = 'running') then raise exception 'quest_already_running'; end if;
  select coalesce(jsonb_agg(to_jsonb(i)), '[]'::jsonb) into v_inv from public.inventory i where i.user_id = p_user;
  insert into public.character_stash (user_id, name, data, inventory) values (p_user, c.name, to_jsonb(c), v_inv) returning id into v_id;
  delete from public.inventory where user_id = p_user;
  delete from public.characters where user_id = p_user;
  return v_id;
end;
$$;

-- Traz de volta um herói guardado (a conta não pode ter herói ativo).
-- Obs.: se uma migração futura criar coluna NOT NULL em characters/inventory, atualize também os dados guardados.
create or replace function public.restore_character(p_user uuid, p_stash uuid) returns void
language plpgsql security definer set search_path = '' as $$
declare s public.character_stash;
begin
  if exists (select 1 from public.characters where user_id = p_user) then raise exception 'already_has_character'; end if;
  select * into s from public.character_stash where id = p_stash and user_id = p_user for update;
  if not found then raise exception 'invalid_target'; end if;
  delete from public.character_stash where id = s.id;
  insert into public.characters select * from jsonb_populate_record(null::public.characters, s.data);
  insert into public.inventory select * from jsonb_populate_recordset(null::public.inventory, s.inventory);
end;
$$;

-- Compra +1 espaço de herói com gemas.
create or replace function public.buy_char_slot(p_user uuid, p_price int, p_max int) returns int
language plpgsql security definer set search_path = '' as $$
declare v int;
begin
  select char_slots into v from public.profiles where id = p_user for update;
  if v is null then raise exception 'no_character'; end if;
  if v >= p_max then raise exception 'max_upgrade'; end if;
  perform public.charge(p_user, 'gems', p_price, 'char_slot');
  update public.profiles set char_slots = v + 1 where id = p_user;
  return v + 1;
end;
$$;

revoke execute on function public.stash_character(uuid) from public, anon, authenticated;
revoke execute on function public.restore_character(uuid, uuid) from public, anon, authenticated;
revoke execute on function public.buy_char_slot(uuid, int, int) from public, anon, authenticated;
revoke execute on function public.tg_character_limits() from public, anon, authenticated;
grant execute on function public.stash_character(uuid) to service_role;
grant execute on function public.restore_character(uuid, uuid) to service_role;
grant execute on function public.buy_char_slot(uuid, int, int) to service_role;
