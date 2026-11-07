-- 0037: Árvore de talentos. Os pontos de cada talento ficam em characters.talents (jsonb: id → pontos).
-- A validação (pontos livres, andares, talentos que se excluem) é feita no servidor (src/lib/game/talents.ts).
-- Aqui: gravação com trava otimista (só grava se ninguém mudou antes) e cobrança da redistribuição.
alter table public.characters add column if not exists talents jsonb not null default '{}'::jsonb;

create or replace function public.talent_save(p_user uuid, p_old jsonb, p_new jsonb, p_cost int) returns jsonb
language plpgsql security definer set search_path = '' as $$
begin
  if jsonb_typeof(p_new) <> 'object' or length(p_new::text) > 2000 then raise exception 'invalid_action'; end if;
  perform 1 from public.characters where user_id = p_user and talents = p_old for update;
  if not found then raise exception 'stale_talents'; end if;
  if p_cost > 0 then perform public.charge(p_user, 'gold', p_cost, 'talent_reset'); end if;
  update public.characters set talents = p_new, updated_at = now() where user_id = p_user;
  return p_new;
end;
$$;
revoke execute on function public.talent_save(uuid, jsonb, jsonb, int) from public, anon, authenticated;
grant execute on function public.talent_save(uuid, jsonb, jsonb, int) to service_role;
