-- 0034: modo história com trechos — 2 lutas antes do chefe de cada capítulo.
-- O progresso fica em user_counters (chave 'story_trail', dia fixo 2000-01-01):
--   valor = capítulo × 10 + trechos vencidos. Ex.: 62 = capítulo 6, 2 trechos vencidos.
-- Ao concluir um capítulo o valor antigo deixa de valer sozinho (o capítulo muda), então não precisa limpar.
create or replace function public.advance_story_trail(p_user uuid, p_chapter int, p_step int) returns int
language plpgsql security definer set search_path = '' as $$
declare v_cur int; v_val int; v_done int;
begin
  if p_step < 1 or p_step > 9 then raise exception 'invalid_action'; end if;
  select story_chapter into v_cur from public.characters where user_id = p_user for update;
  if v_cur is null then raise exception 'no_character'; end if;
  if p_chapter <> v_cur + 1 then raise exception 'invalid_action'; end if;

  select value into v_val from public.user_counters where user_id = p_user and key = 'story_trail' and day = date '2000-01-01';
  v_done := case when coalesce(v_val, 0) / 10 = p_chapter then coalesce(v_val, 0) % 10 else 0 end;
  if p_step <> v_done + 1 then return v_done; end if;   -- repetido: não muda nada

  insert into public.user_counters (user_id, key, day, value) values (p_user, 'story_trail', date '2000-01-01', p_chapter * 10 + p_step)
    on conflict (user_id, key, day) do update set value = excluded.value;
  return p_step;
end;
$$;
revoke execute on function public.advance_story_trail(uuid, int, int) from public, anon, authenticated;
grant execute on function public.advance_story_trail(uuid, int, int) to service_role;
