-- 0024: tabela de saque da Caçada (vários itens por vitória), limite da bolsa e proteção contra azar.
--
-- O sorteio continua na rota (servidor, RNG criptográfico, src/lib/game/loot.ts). Aqui:
--  • give_loot: entrega uma LISTA de itens. Bolsa cheia → o item vira ouro (preço de venda),
--    com registro no extrato (ledger). Nunca some em silêncio.
--  • battle_commit (nova versão, com p_loot jsonb e p_pity): tudo na MESMA transação da luta.
--  • Contador de azar em user_counters (chave 'loot_pity', dia fixo 2000-01-01 = não reinicia por dia).
-- A versão antiga de battle_commit (com p_item text) continua existindo para o site atual não quebrar
-- entre rodar esta migração e publicar o código novo. Pode ser removida numa migração futura.

create or replace function public.give_loot(p_user uuid, p_loot jsonb, p_ref text, p_bag_limit int) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  e jsonb; v_item text; v_qty int; v_sell int; v_kind text; v_used int; v_need int; v_gold int; v_i int := 0;
  v_out jsonb := '[]'::jsonb;
begin
  if p_loot is null or jsonb_typeof(p_loot) <> 'array' then return v_out; end if;
  if jsonb_array_length(p_loot) > 10 then raise exception 'invalid_loot'; end if;
  if p_bag_limit is null or p_bag_limit < 1 or p_bag_limit > 500 then raise exception 'invalid_loot'; end if;
  -- Trava o herói: duas entregas simultâneas não passam juntas do limite da bolsa.
  perform 1 from public.characters where user_id = p_user for update;

  for e in select * from jsonb_array_elements(p_loot) loop
    v_i := v_i + 1;
    v_item := e->>'item';
    v_qty := coalesce((e->>'qty')::int, 1);
    v_sell := coalesce((e->>'sell')::int, 0);
    if v_qty < 1 or v_qty > 10 or v_sell < 0 or v_sell > 100000 then raise exception 'invalid_loot'; end if;

    select kind into v_kind from public.items where id = v_item;
    if v_kind is null then
      -- Item que não existe no banco não pode travar a luta inteira.
      raise warning 'give_loot: item % não existe na tabela items', v_item;
      continue;
    end if;

    select count(*) into v_used from public.inventory where user_id = p_user and not equipped;
    if v_kind = 'consumable' then
      v_need := case when exists (select 1 from public.inventory where user_id = p_user and item_id = v_item) then 0 else 1 end;
    else
      v_need := v_qty;
    end if;

    if v_used + v_need <= p_bag_limit then
      perform public.give_item(p_user, v_item, v_qty);
      v_out := v_out || jsonb_build_object('item', v_item, 'qty', v_qty, 'gold', 0);
    else
      v_gold := v_sell * v_qty;
      if v_gold > 0 then
        perform public.wallet_apply(p_user, 'gold', v_gold, 'loot_bag_full:' || v_item, p_ref || ':full:' || v_i);
      end if;
      v_out := v_out || jsonb_build_object('item', v_item, 'qty', v_qty, 'gold', v_gold);
    end if;
  end loop;
  return v_out;
end;
$$;

create or replace function public.battle_commit(
  p_user uuid, p_battle uuid, p_version int, p_state jsonb, p_status text, p_hp int,
  -- Recompensa da luta (null = não venceu este estágio). p_loot = [{item, qty, sell}].
  p_xp int, p_gold int, p_loot jsonb, p_reason text, p_ref text, p_boss boolean,
  -- História (null = não é capítulo).
  p_chapter int, p_ch_xp int, p_ch_gold int, p_ch_gems int, p_ch_item text, p_ch_cosmetic text,
  -- Baú da masmorra (null = sem baú).
  p_chest_key text, p_chest_gold int, p_chest_gems int, p_chest_item text,
  -- Saque: limite da bolsa e contador de azar ('reset' | 'bump' | null).
  p_bag_limit int, p_pity text
) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare v_ups int; v_story int; v_cur int; v_loot jsonb := '[]'::jsonb;
begin
  if p_status not in ('active', 'won', 'lost') then raise exception 'invalid_action'; end if;
  if p_pity is not null and p_pity not in ('reset', 'bump') then raise exception 'invalid_action'; end if;

  -- Concorrência otimista: dois cliques simultâneos → só um grava (e só um recebe o saque).
  update public.battles
     set state = p_state, status = p_status, version = version + 1, updated_at = now()
   where id = p_battle and user_id = p_user and status = 'active' and version = p_version;
  if not found then raise exception 'stale_battle'; end if;

  if p_status <> 'active' then perform public.set_hp(p_user, p_hp); end if;

  if p_ch_item is not null and not exists (select 1 from public.items where id = p_ch_item) then
    raise warning 'battle_commit: item % não existe na tabela items', p_ch_item; p_ch_item := null;
  end if;
  if p_chest_item is not null and not exists (select 1 from public.items where id = p_chest_item) then
    raise warning 'battle_commit: item % não existe na tabela items', p_chest_item; p_chest_item := null;
  end if;

  if p_xp is not null then
    v_ups := public.grant_rewards(p_user, p_xp, coalesce(p_gold, 0), null, p_reason, p_ref);
    v_loot := public.give_loot(p_user, p_loot, p_ref, p_bag_limit);
    perform public.record_event(p_user, 'pve_win', 1);
    if p_boss then perform public.record_event(p_user, 'boss_win', 1); end if;

    if p_pity = 'reset' then
      insert into public.user_counters (user_id, key, day, value) values (p_user, 'loot_pity', date '2000-01-01', 0)
        on conflict (user_id, key, day) do update set value = 0;
    elsif p_pity = 'bump' then
      insert into public.user_counters (user_id, key, day, value) values (p_user, 'loot_pity', date '2000-01-01', 1)
        on conflict (user_id, key, day) do update set value = public.user_counters.value + 1;
    end if;
  end if;

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

  return jsonb_build_object('level_ups', coalesce(v_ups, 0), 'story_ups', v_story, 'story_done', v_story is not null, 'loot', v_loot);
end;
$$;

revoke execute on function public.give_loot(uuid, jsonb, text, int) from public, anon, authenticated;
grant execute on function public.give_loot(uuid, jsonb, text, int) to service_role;
revoke execute on function public.battle_commit(uuid, uuid, int, jsonb, text, int, int, int, jsonb, text, text, boolean, int, int, int, int, text, text, text, int, int, text, int, text) from public, anon, authenticated;
grant execute on function public.battle_commit(uuid, uuid, int, jsonb, text, int, int, int, jsonb, text, text, boolean, int, int, int, int, text, text, text, int, int, text, int, text) to service_role;
