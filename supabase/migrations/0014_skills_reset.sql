-- 0014: árvore de habilidades por classe + resetar/excluir personagem.

-- Habilidades: { "lv": { "<skill>": nível }, "eq": ["<skill>", ...] }
alter table public.characters add column if not exists skills jsonb not null default '{}'::jsonb;

-- Quantas vezes o jogador já resetou/excluiu (a 1ª é grátis).
alter table public.profiles
  add column if not exists resets_used  int not null default 0,
  add column if not exists deletes_used int not null default 0;

-- Aprende/melhora uma habilidade, cobrando ouro de forma atômica.
-- p_from = nível atual esperado (evita cobrança dupla em cliques simultâneos).
create or replace function public.upgrade_skill(p_user uuid, p_skill text, p_from int, p_cost int, p_max int)
returns int
language plpgsql security definer set search_path = '' as $$
declare v_sk jsonb; v_lv int;
begin
  select skills into v_sk from public.characters where user_id = p_user for update;
  if not found then raise exception 'no_character'; end if;
  v_lv := coalesce((v_sk -> 'lv' ->> p_skill)::int, 0);
  if v_lv <> p_from then raise exception 'stale_battle'; end if;
  if v_lv >= p_max then raise exception 'max_upgrade'; end if;
  if p_cost > 0 then perform public.charge(p_user, 'gold', p_cost, 'skill:' || p_skill); end if;
  update public.characters
     set skills = jsonb_set(coalesce(v_sk, '{}'::jsonb), '{lv}', coalesce(v_sk -> 'lv', '{}'::jsonb) || jsonb_build_object(p_skill, v_lv + 1)),
         updated_at = now()
   where user_id = p_user;
  return v_lv + 1;
end;
$$;

-- Define a barra de combate (a validação de quais habilidades valem é feita no servidor da aplicação).
create or replace function public.equip_skills(p_user uuid, p_eq jsonb)
returns void
language plpgsql security definer set search_path = '' as $$
begin
  if jsonb_typeof(p_eq) <> 'array' or jsonb_array_length(p_eq) > 3 then raise exception 'invalid_action'; end if;
  update public.characters
     set skills = jsonb_set(coalesce(skills, '{}'::jsonb), '{eq}', p_eq), updated_at = now()
   where user_id = p_user;
  if not found then raise exception 'no_character'; end if;
end;
$$;

-- Apaga o progresso do herói (usado por resetar e excluir).
-- Mantém: ouro, gemas, cosméticos, pets, passe, contadores do ranking e recompensas já resgatadas (anti-farm).
-- A 1ª vez de cada tipo é grátis; depois custa p_cost de ouro (cobrado antes de zerar).
create or replace function public.wipe_character(p_user uuid, p_mode text, p_cost int)
returns void
language plpgsql security definer set search_path = '' as $$
declare v_used int; v_gid uuid; v_role text; v_members int;
begin
  if p_mode not in ('reset', 'delete') then raise exception 'invalid_action'; end if;
  perform 1 from public.characters where user_id = p_user for update;
  if not found then raise exception 'no_character'; end if;

  select case when p_mode = 'reset' then resets_used else deletes_used end into v_used
    from public.profiles where id = p_user for update;
  if coalesce(v_used, 0) > 0 and p_cost > 0 then
    perform public.charge(p_user, 'gold', p_cost, p_mode || '_character');
  end if;
  if p_mode = 'reset' then update public.profiles set resets_used = resets_used + 1 where id = p_user;
  else update public.profiles set deletes_used = deletes_used + 1 where id = p_user; end if;

  -- Guilda: ao excluir, sai da guilda (líder com outros membros precisa passar a liderança antes).
  if p_mode = 'delete' then
    select guild_id, role into v_gid, v_role from public.guild_members where user_id = p_user;
    if v_gid is not null then
      select count(*) into v_members from public.guild_members where guild_id = v_gid;
      if v_role = 'leader' and v_members > 1 then raise exception 'guild_leader'; end if;
      delete from public.guild_members where user_id = p_user;
      if v_members = 1 then delete from public.guilds where id = v_gid; end if;
    end if;
  end if;

  delete from public.battles where user_id = p_user;
  delete from public.quest_runs where user_id = p_user;
  delete from public.inventory where user_id = p_user;

  delete from public.characters where user_id = p_user;
end;
$$;

-- História: depois de um reset, rejogar um capítulo não entrega o prêmio de novo (nem trava o avanço).
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
  if not exists (select 1 from public.reward_claims where user_id = p_user and claim_key = 'story:' || p_chapter) then
    perform public.claim_bundle(p_user, 'story:' || p_chapter, 0, p_gems, p_cosmetic, p_item, case when p_item is null then 0 else 1 end, 0, null);
  end if;
  v_ups := public.grant_rewards(p_user, p_xp, p_gold, null, 'story:' || p_chapter, 'story-gold:' || p_user || ':' || p_chapter);
  return v_ups;
end;
$$;

revoke execute on function public.upgrade_skill(uuid, text, int, int, int) from public, anon, authenticated;
revoke execute on function public.equip_skills(uuid, jsonb) from public, anon, authenticated;
revoke execute on function public.wipe_character(uuid, text, int) from public, anon, authenticated;
grant execute on function public.upgrade_skill(uuid, text, int, int, int) to service_role;
grant execute on function public.equip_skills(uuid, jsonb) to service_role;
grant execute on function public.wipe_character(uuid, text, int) to service_role;
