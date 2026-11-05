-- =====================================================================
-- História principal (capítulos) e regiões
-- =====================================================================
alter table public.characters add column story_chapter int not null default 0 check (story_chapter between 0 and 100);

-- Heróis criados antes desta versão: libera os capítulos compatíveis com o
-- nível (sem recompensa), para ninguém perder acesso a regiões que já usava.
-- Níveis exigidos por capítulo = espelho de story.ts.
update public.characters c set story_chapter = (
  select count(*) from unnest(array[1, 3, 5, 7, 10, 13, 16, 19, 22, 25]) as req where req <= c.level
) where story_chapter = 0 and level > 1;

-- Avança a história em ordem e entrega a recompensa do capítulo (uma vez).
create or replace function public.complete_chapter(
  p_user uuid, p_chapter int, p_xp int, p_gold int, p_gems int, p_item text, p_cosmetic text
) returns int
language plpgsql security definer set search_path = '' as $$
declare v_cur int; v_ups int;
begin
  select story_chapter into v_cur from public.characters where user_id = p_user for update;
  if v_cur is null then raise exception 'no_character'; end if;
  if p_chapter <> v_cur + 1 then raise exception 'invalid_action'; end if;
  update public.characters set story_chapter = p_chapter where user_id = p_user;
  perform public.claim_bundle(p_user, 'story:' || p_chapter, 0, p_gems, p_cosmetic, p_item, case when p_item is null then 0 else 1 end, 0, null);
  v_ups := public.grant_rewards(p_user, p_xp, p_gold, null, 'story:' || p_chapter, 'story-gold:' || p_user || ':' || p_chapter);
  return v_ups;
end;
$$;

revoke execute on function public.complete_chapter(uuid, int, int, int, int, text, text) from public, anon, authenticated;
grant execute on function public.complete_chapter(uuid, int, int, int, int, text, text) to service_role;
