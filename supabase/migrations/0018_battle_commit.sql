-- 0018: fim de turno ATÔMICO nas lutas PvE (caçada, história e masmorras).
--
-- Antes, a rota gravava "venceu" na batalha e só depois entregava XP, capítulo e baú
-- em chamadas separadas. Se uma delas falhasse (ex.: item da recompensa ainda não
-- existia na tabela `items`), o jogador via "Algo deu errado", a luta sumia como
-- vencida e o capítulo NÃO era concluído. Agora tudo acontece numa transação só:
-- ou grava tudo, ou nada (e o jogador pode clicar de novo).

create or replace function public.battle_commit(
  p_user uuid, p_battle uuid, p_version int, p_state jsonb, p_status text, p_hp int,
  -- Recompensa da luta (null = não venceu este estágio).
  p_xp int, p_gold int, p_item text, p_reason text, p_ref text, p_boss boolean,
  -- História (null = não é capítulo).
  p_chapter int, p_ch_xp int, p_ch_gold int, p_ch_gems int, p_ch_item text, p_ch_cosmetic text,
  -- Baú da masmorra (null = sem baú).
  p_chest_key text, p_chest_gold int, p_chest_gems int, p_chest_item text
) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare v_ups int; v_story int; v_cur int;
begin
  if p_status not in ('active', 'won', 'lost') then raise exception 'invalid_action'; end if;

  -- Concorrência otimista: dois cliques simultâneos → só um grava.
  update public.battles
     set state = p_state, status = p_status, version = version + 1, updated_at = now()
   where id = p_battle and user_id = p_user and status = 'active' and version = p_version;
  if not found then raise exception 'stale_battle'; end if;

  if p_status <> 'active' then perform public.set_hp(p_user, p_hp); end if;

  -- Item de recompensa que não existe no banco não pode travar a luta inteira.
  if p_item is not null and not exists (select 1 from public.items where id = p_item) then
    raise warning 'battle_commit: item % não existe na tabela items', p_item; p_item := null;
  end if;
  if p_ch_item is not null and not exists (select 1 from public.items where id = p_ch_item) then
    raise warning 'battle_commit: item % não existe na tabela items', p_ch_item; p_ch_item := null;
  end if;
  if p_chest_item is not null and not exists (select 1 from public.items where id = p_chest_item) then
    raise warning 'battle_commit: item % não existe na tabela items', p_chest_item; p_chest_item := null;
  end if;

  if p_xp is not null then
    v_ups := public.grant_rewards(p_user, p_xp, coalesce(p_gold, 0), p_item, p_reason, p_ref);
    perform public.record_event(p_user, 'pve_win', 1);
    if p_boss then perform public.record_event(p_user, 'boss_win', 1); end if;
  end if;

  -- Capítulo: só conclui se for exatamente o próximo (repetir não dá erro nem recompensa).
  if p_chapter is not null then
    select story_chapter into v_cur from public.characters where user_id = p_user;
    if v_cur = p_chapter - 1 then
      v_story := public.complete_chapter(p_user, p_chapter, p_ch_xp, p_ch_gold, p_ch_gems, p_ch_item, p_ch_cosmetic);
    end if;
  end if;

  if p_chest_key is not null then
    perform public.claim_bundle(p_user, p_chest_key, coalesce(p_chest_gold, 0), coalesce(p_chest_gems, 0), null,
      p_chest_item, case when p_chest_item is null then 0 else 1 end, 0, null);
  end if;

  return jsonb_build_object('level_ups', coalesce(v_ups, 0), 'story_ups', v_story, 'story_done', v_story is not null);
end;
$$;

revoke execute on function public.battle_commit(uuid, uuid, int, jsonb, text, int, int, int, text, text, text, boolean, int, int, int, int, text, text, text, int, int, text) from public, anon, authenticated;
grant execute on function public.battle_commit(uuid, uuid, int, jsonb, text, int, int, int, text, text, text, boolean, int, int, int, int, text, text, text, int, int, text) to service_role;
