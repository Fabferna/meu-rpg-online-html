-- 0036: Elementos — cada herói escolhe um (Fogo, Água, Terra, Ar, Luz, Sombra).
-- A vantagem no combate é calculada no servidor (src/lib/game/elements.ts). Aqui só guardamos a escolha.
-- 1ª escolha grátis; trocar custa gemas (preço vem do servidor). Gemas e troca na mesma transação.
alter table public.characters add column if not exists element text
  check (element is null or element in ('fogo', 'agua', 'terra', 'ar', 'luz', 'sombra'));

create or replace function public.set_element(p_user uuid, p_element text, p_price int) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare v_cur text; v_paid int := 0;
begin
  if p_element not in ('fogo', 'agua', 'terra', 'ar', 'luz', 'sombra') then raise exception 'invalid_action'; end if;
  select element into v_cur from public.characters where user_id = p_user for update;
  if not found then raise exception 'no_character'; end if;
  if v_cur = p_element then raise exception 'invalid_action'; end if;
  if v_cur is not null then
    perform public.charge(p_user, 'gems', p_price, 'element_change');
    v_paid := p_price;
  end if;
  update public.characters set element = p_element, updated_at = now() where user_id = p_user;
  return jsonb_build_object('element', p_element, 'paid', v_paid);
end;
$$;
revoke execute on function public.set_element(uuid, text, int) from public, anon, authenticated;
grant execute on function public.set_element(uuid, text, int) to service_role;
