-- 0021: RESET DE PROGRESSO de todos os jogadores (contas e heróis continuam existindo).
--
-- ⚠️ IRREVERSÍVEL. Faça um backup antes (Supabase → Database → Backups).
-- Tem trava: se já foi rodado uma vez, a segunda execução não faz nada.
--
-- ZERA:  nível, XP, atributos (voltam aos da raça), pontos, habilidades, história, vida/energia,
--        PvP (rating 1000), contadores de vitórias/missões/chefes, elixir de XP, bolsa e
--        equipamentos (inclusive aprimoramentos), ouro (volta a 50), nível dos pets (→ 1),
--        progresso do passe, conquistas (podem ser resgatadas de novo), nível/XP/tesouro das guildas.
--        Vale também para os heróis guardados (troca de herói).
-- MANTÉM: contas, nomes, raças, aparência, GEMAS, cosméticos (skins, molduras, títulos),
--        pets adquiridos, passe premium comprado, guildas e membros, amigos, compras e pagamentos.

create table if not exists public.game_resets (
  id text primary key,
  ran_at timestamptz not null default now()
);
alter table public.game_resets enable row level security;

-- Atributos iniciais de cada raça (espelho de RACES em src/lib/game/data.ts).
create or replace function public.f_race_base(p_race text) returns jsonb
language sql immutable as $$
  select case p_race
    when 'humano'     then '{"str":10,"dex":10,"con":10,"intel":10,"wis":10,"cha":10}'
    when 'elfo'       then '{"str":9,"dex":12,"con":9,"intel":11,"wis":10,"cha":9}'
    when 'anao'       then '{"str":12,"dex":8,"con":13,"intel":9,"wis":10,"cha":8}'
    when 'gronar'     then '{"str":13,"dex":9,"con":12,"intel":7,"wis":8,"cha":7}'
    when 'aetheliano' then '{"str":8,"dex":10,"con":8,"intel":13,"wis":12,"cha":9}'
  end::jsonb
$$;

do $$
declare r record; v_delta bigint;
begin
  if exists (select 1 from public.game_resets where id = 'reset-progresso-1') then
    raise notice 'Reset já foi feito antes: nada alterado.';
    return;
  end if;
  insert into public.game_resets (id) values ('reset-progresso-1');

  -- Lutas e missões em andamento são encerradas (sem recompensa).
  update public.battles set status = 'fled', updated_at = now() where status = 'active';
  update public.quest_runs set status = 'cancelled' where status = 'running';

  -- Herói ativo de cada conta.
  update public.characters c set
    level = 1, xp = 0, attribute_points = 0, story_chapter = 0, skills = '{}'::jsonb,
    str = (b->>'str')::int, dex = (b->>'dex')::int, con = (b->>'con')::int,
    intel = (b->>'intel')::int, wis = (b->>'wis')::int, cha = (b->>'cha')::int,
    hp = 50 + (b->>'con')::int * 8, hp_updated_at = now(),
    energy = 50 + (b->>'dex')::int * 2, energy_updated_at = now(),
    pvp_rating = 1000, pvp_wins = 0, pvp_losses = 0, pve_wins = 0, quests_done = 0, bosses_slain = 0,
    xp_boost_until = null, updated_at = now()
  from (select id, public.f_race_base(race) b from public.characters) x
  where x.id = c.id;

  -- Heróis guardados (troca de herói): mesmo reset dentro do JSON, bolsa vazia.
  update public.character_stash s set
    data = s.data || jsonb_build_object(
      'level', 1, 'xp', 0, 'attribute_points', 0, 'story_chapter', 0, 'skills', '{}'::jsonb,
      'str', (b->>'str')::int, 'dex', (b->>'dex')::int, 'con', (b->>'con')::int,
      'intel', (b->>'intel')::int, 'wis', (b->>'wis')::int, 'cha', (b->>'cha')::int,
      'hp', 50 + (b->>'con')::int * 8, 'hp_updated_at', now(),
      'energy', 50 + (b->>'dex')::int * 2, 'energy_updated_at', now(),
      'pvp_rating', 1000, 'pvp_wins', 0, 'pvp_losses', 0, 'pve_wins', 0, 'quests_done', 0, 'bosses_slain', 0,
      'xp_boost_until', null),
    inventory = '[]'::jsonb
  from (select id, public.f_race_base(data->>'race') b from public.character_stash) x
  where x.id = s.id;

  -- Bolsa e equipamentos.
  delete from public.inventory;

  -- Ouro volta a 50 (registrado no extrato); gemas ficam intactas.
  for r in select user_id, gold from public.wallets where gold <> 50 loop
    v_delta := 50 - r.gold;
    perform public.wallet_apply(r.user_id, 'gold', v_delta, 'reset_progresso', 'reset-progresso-1:' || r.user_id);
  end loop;

  -- Pets continuam, no nível 1.
  update public.owned_pets set level = 1;

  -- Passe: pontos vêm dos contadores de eventos; resgates do passe e conquistas liberados de novo.
  delete from public.user_counters where key like 'ev:%';
  delete from public.reward_claims where claim_key like 'story:%' or claim_key like 'ach:%' or claim_key like 'pass:%';

  -- Guildas continuam com os membros, no nível 1.
  update public.guilds set level = 1, xp = 0, treasury = 0, member_limit = 20;
  update public.guild_members set contributed = 0;
end $$;

-- Recompensas re-resgatáveis precisam de uma "referência" nova no extrato, senão o banco
-- acharia que o ouro/gemas já foram pagos (proteção contra pagar duas vezes).
create or replace function public.claim_reward(
  p_user uuid, p_key text, p_gold int, p_gems int, p_xp int, p_cosmetic text
) returns int
language plpgsql security definer set search_path = '' as $$
declare v_ups int := 0;
begin
  begin
    insert into public.reward_claims (user_id, claim_key) values (p_user, p_key);
  exception when unique_violation then
    raise exception 'already_claimed';
  end;
  if p_gems > 0 then perform public.wallet_apply(p_user, 'gems', p_gems, 'reward:' || p_key, 'reward-gems:r1:' || p_user || ':' || p_key); end if;
  if p_xp > 0 or p_gold > 0 then
    v_ups := public.grant_rewards(p_user, p_xp, p_gold, null, 'reward:' || p_key, 'reward-gold:r1:' || p_user || ':' || p_key);
  end if;
  if p_cosmetic is not null then
    insert into public.owned_cosmetics (user_id, cosmetic_id) values (p_user, p_cosmetic) on conflict do nothing;
  end if;
  return v_ups;
end;
$$;

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
  v_ups := public.grant_rewards(p_user, p_xp, p_gold, null, 'story:' || p_chapter, 'story-gold:r1:' || p_user || ':' || p_chapter);
  return v_ups;
end;
$$;

revoke execute on function public.f_race_base(text) from public, anon, authenticated;
