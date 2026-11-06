-- 0027: remove a versão ANTIGA de battle_commit (com p_item text, de antes da tabela de saque).
-- A 0024 manteve as duas para o site não quebrar entre rodar a migração e publicar o código novo.
-- O código no ar (PR #24) só chama a versão nova (com p_loot jsonb), então a antiga pode sair.
-- Independente da 0026 (pode rodar antes ou depois dela).
drop function if exists public.battle_commit(uuid, uuid, int, jsonb, text, int, int, int, text, text, text, boolean, int, int, int, int, text, text, text, int, int, text);
