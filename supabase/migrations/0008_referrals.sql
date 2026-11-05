-- =====================================================================
-- Indique um amigo
-- =====================================================================
-- Convidado: ganha 🪙 300 ao criar o herói pelo link.
-- Quem convidou: 💎 20 por convidado que chegar ao nível 5 (máx. 10 pagos),
-- resgatado com claim_reward (chave 'ref:<id do convidado>', uso único).
-- Exigir nível 5 dificulta contas falsas criadas só para ganhar gemas.

alter table public.characters add column referred_by uuid references auth.users (id) on delete set null;
create index characters_referred_by_idx on public.characters (referred_by);

create or replace function public.apply_referral(p_user uuid, p_referrer_name text) returns boolean
language plpgsql security definer set search_path = '' as $$
declare v_ref uuid;
begin
  select user_id into v_ref from public.characters where lower(name::text) = lower(p_referrer_name);
  if v_ref is null or v_ref = p_user then return false; end if;
  update public.characters set referred_by = v_ref
    where user_id = p_user and referred_by is null
      and created_at > now() - interval '1 hour'; -- só logo após criar o herói
  if not found then return false; end if;
  perform public.wallet_apply(p_user, 'gold', 300, 'referral_welcome', 'ref-welcome:' || p_user);
  return true;
end;
$$;

revoke execute on function public.apply_referral(uuid, text) from public, anon, authenticated;
grant execute on function public.apply_referral(uuid, text) to service_role;
