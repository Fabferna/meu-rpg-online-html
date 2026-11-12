-- 0045: Limpeza automática do chat. A cada mensagem nova, o próprio canal apaga o que passou do limite:
--   • Global:   guarda as 150 últimas e nada com mais de 3 dias
--   • Guilda:   guarda as 300 últimas e nada com mais de 14 dias
--   • Amigos (conversa privada): guarda as 200 últimas e nada com mais de 30 dias
-- Denúncias ligadas a uma mensagem apagada somem junto (chat_reports tem "on delete cascade").

create or replace function public.chat_limits(p_channel text, out keep_n int, out max_age interval)
language sql immutable as $$
  select case when p_channel = 'global' then 150 when p_channel like 'guild:%' then 300 else 200 end,
         case when p_channel = 'global' then interval '3 days' when p_channel like 'guild:%' then interval '14 days' else interval '30 days' end
$$;

create or replace function public.chat_prune() returns trigger
language plpgsql security definer set search_path = '' as $$
declare l record; v_cut bigint;
begin
  select * into l from public.chat_limits(new.channel);
  -- Id da mensagem mais nova que já passou do limite de quantidade (usa o índice canal + id).
  select id into v_cut from public.chat_messages where channel = new.channel order by id desc offset l.keep_n limit 1;
  delete from public.chat_messages
   where channel = new.channel
     and (id <= coalesce(v_cut, 0) or created_at < now() - l.max_age);
  return null;
end;
$$;

drop trigger if exists chat_prune_after_insert on public.chat_messages;
create trigger chat_prune_after_insert after insert on public.chat_messages
  for each row execute function public.chat_prune();

-- Limpeza única do que já está guardado hoje.
delete from public.chat_messages m
 using (select id, channel, row_number() over (partition by channel order by id desc) as pos from public.chat_messages) r
 where m.id = r.id
   and (r.pos > (public.chat_limits(m.channel)).keep_n or m.created_at < now() - (public.chat_limits(m.channel)).max_age);

revoke execute on function public.chat_prune() from public, anon, authenticated;
